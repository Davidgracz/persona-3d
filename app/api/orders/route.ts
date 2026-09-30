import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { figurineOrders } from "../../../db/schema";

export const dynamic = "force-dynamic";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function textField(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeName(name: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized.slice(0, 80) || "photo";
}

function publicOrderId() {
  return "F3D-" + crypto.randomUUID().slice(0, 8).toUpperCase();
}

export async function POST(request: Request) {
  const uploadedKeys: string[] = [];
  const bucket = env.BUCKET;

  try {
    if (!bucket || !env.DB) {
      return Response.json(
        { error: "Formularz jest chwilowo niedostępny. Spróbuj ponownie później." },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const name = textField(form, "name");
    const email = textField(form, "email").toLowerCase();
    const phone = textField(form, "phone");
    const finish = textField(form, "finish");
    const size = textField(form, "size");
    const notes = textField(form, "notes");
    const consent = textField(form, "consent");
    const copies = Number.parseInt(textField(form, "copies"), 10);
    const photos = form.getAll("photos").filter((item): item is File => item instanceof File);

    if (name.length < 2 || name.length > 80) {
      return Response.json({ error: "Podaj poprawne imię i nazwisko." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
      return Response.json({ error: "Podaj poprawny adres e-mail." }, { status: 400 });
    }
    if (phone.length > 32 || notes.length > 2000) {
      return Response.json({ error: "Jedno z pól jest zbyt długie." }, { status: 400 });
    }
    if (!["raw", "painted"].includes(finish) || !["10", "15", "20", "custom"].includes(size)) {
      return Response.json({ error: "Wybierz poprawny wariant i rozmiar figurki." }, { status: 400 });
    }
    if (!Number.isInteger(copies) || copies < 1 || copies > 5) {
      return Response.json({ error: "Wybierz liczbę sztuk od 1 do 5." }, { status: 400 });
    }
    if (consent !== "yes") {
      return Response.json({ error: "Zgoda na wykorzystanie zdjęć jest wymagana." }, { status: 400 });
    }
    if (photos.length < 1 || photos.length > 6) {
      return Response.json({ error: "Dodaj od 1 do 6 zdjęć." }, { status: 400 });
    }

    const totalBytes = photos.reduce((sum, photo) => sum + photo.size, 0);
    if (
      totalBytes > 30 * 1024 * 1024 ||
      photos.some((photo) => photo.size > 8 * 1024 * 1024)
    ) {
      return Response.json(
        { error: "Jedno zdjęcie może mieć do 8 MB, a wszystkie łącznie do 30 MB." },
        { status: 413 },
      );
    }
    if (photos.some((photo) => !allowedTypes.has(photo.type))) {
      return Response.json(
        { error: "Dozwolone są pliki JPG, PNG, WEBP i HEIC." },
        { status: 415 },
      );
    }

    const id = publicOrderId();
    const fileMetadata: Array<{
      key: string;
      originalName: string;
      type: string;
      size: number;
    }> = [];

    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      const key = "figurine-orders/" + id + "/" + String(index + 1) + "-" + safeName(photo.name);
      await bucket.put(key, photo.stream(), {
        httpMetadata: { contentType: photo.type },
        customMetadata: { orderId: id, originalName: photo.name.slice(0, 120) },
      });
      uploadedKeys.push(key);
      fileMetadata.push({
        key,
        originalName: photo.name.slice(0, 120),
        type: photo.type,
        size: photo.size,
      });
    }

    const db = getDb();
    await db.insert(figurineOrders).values({
      id,
      name,
      email,
      phone,
      finish,
      size,
      copies,
      notes,
      photoMetadata: JSON.stringify(fileMetadata),
    });

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Figurine quote submission failed", error);
    if (bucket) {
      for (const key of uploadedKeys) {
        try {
          await bucket.delete(key);
        } catch (cleanupError) {
          console.error("Failed to clean uploaded object", key, cleanupError);
        }
      }
    }
    return Response.json(
      { error: "Nie udało się zapisać zgłoszenia. Spróbuj ponownie." },
      { status: 500 },
    );
  }
}
