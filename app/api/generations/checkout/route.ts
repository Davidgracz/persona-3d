import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { generationOrders } from "../../../../db/schema";
import {
  GENERATION_CURRENCY,
  GENERATION_PRICE_CENTS,
  isGenerationStyle,
} from "../../../../lib/generator-config";
import {
  createCheckoutSession,
  dummyPaymentsAllowed,
  dummyPaymentsConfigured,
  paymentIntegrationReady,
} from "../../../../lib/stripe";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/jpeg", "image/png"]);

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
  return normalized.slice(0, 80) || "photo.jpg";
}

function publicToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function orderId() {
  return `G3D-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

export async function POST(request: Request) {
  const uploadedKeys: string[] = [];
  let createdOrderId = "";
  let checkoutCreated = false;

  try {
    const dummyPayment = dummyPaymentsAllowed(request.url);
    if (!env.DB || !env.BUCKET || !paymentIntegrationReady(request.url)) {
      return Response.json(
        {
          error: dummyPaymentsConfigured()
            ? "Tryb testowych płatności działa tylko lokalnie. Na publicznej stronie skonfiguruj Stripe, webhook BLIK i klucz Meshy."
            : "Generator czeka na konfigurację Stripe, webhooka BLIK i klucza Meshy. Płatność nie została uruchomiona.",
          code: "configuration_required",
        },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const email = textField(form, "email").toLowerCase();
    const style = textField(form, "style");
    const consent = textField(form, "consent");
    const photos = form.getAll("photos").filter((value): value is File => value instanceof File);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
      return Response.json({ error: "Podaj poprawny adres e-mail." }, { status: 400 });
    }
    if (!isGenerationStyle(style)) {
      return Response.json({ error: "Wybierz styl realistyczny albo chibi." }, { status: 400 });
    }
    if (consent !== "yes") {
      return Response.json(
        { error: "Potwierdź zgodę na przetworzenie zdjęć i warunki generowania." },
        { status: 400 },
      );
    }
    if (photos.length < 1 || photos.length > (style === "chibi" ? 1 : 4)) {
      return Response.json(
        {
          error:
            style === "chibi"
              ? "Dla stylu chibi dodaj dokładnie jedno zdjęcie."
              : "Dla stylu realistycznego dodaj od 1 do 4 zdjęć.",
        },
        { status: 400 },
      );
    }
    const totalBytes = photos.reduce((sum, photo) => sum + photo.size, 0);
    if (photos.some((photo) => photo.size > 4 * 1024 * 1024) || totalBytes > 12 * 1024 * 1024) {
      return Response.json(
        { error: "Jedno zdjęcie może mieć do 4 MB, a wszystkie łącznie do 12 MB." },
        { status: 413 },
      );
    }
    if (photos.some((photo) => !allowedTypes.has(photo.type))) {
      return Response.json({ error: "Do generatora dodaj pliki JPG lub PNG." }, { status: 415 });
    }

    const id = orderId();
    const token = publicToken();
    createdOrderId = id;
    const fileMetadata: Array<{
      key: string;
      originalName: string;
      type: string;
      size: number;
    }> = [];

    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      const key = `generation-inputs/${id}/${index + 1}-${safeName(photo.name)}`;
      await env.BUCKET.put(key, photo.stream(), {
        httpMetadata: { contentType: photo.type },
        customMetadata: { generationId: id, originalName: photo.name.slice(0, 120) },
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
    await db.insert(generationOrders).values({
      id,
      publicToken: token,
      email,
      style,
      priceCents: GENERATION_PRICE_CENTS,
      currency: GENERATION_CURRENCY,
      photoMetadata: JSON.stringify(fileMetadata),
    });

    const origin = new URL(request.url).origin;
    if (dummyPayment) {
      const dummySessionId = `dummy_${crypto.randomUUID().replaceAll("-", "")}`;
      await db
        .update(generationOrders)
        .set({ stripeSessionId: dummySessionId, updatedAt: new Date().toISOString() })
        .where(eq(generationOrders.id, id));

      return Response.json(
        {
          checkoutUrl: `${origin}/generator/dummy/${token}`,
          orderId: id,
          dummy: true,
        },
        { status: 201 },
      );
    }

    const checkout = await createCheckoutSession({
      orderId: id,
      publicToken: token,
      email,
      style,
      origin,
    });
    checkoutCreated = true;
    if (!checkout.id || !checkout.url) throw new Error("Stripe nie zwrócił adresu płatności.");

    await db
      .update(generationOrders)
      .set({ stripeSessionId: checkout.id, updatedAt: new Date().toISOString() })
      .where(eq(generationOrders.id, id));

    return Response.json({ checkoutUrl: checkout.url, orderId: id }, { status: 201 });
  } catch (error) {
    console.error("Generator checkout creation failed", error);
    if (!checkoutCreated) {
      if (createdOrderId && env.DB) {
        try {
          await getDb().delete(generationOrders).where(eq(generationOrders.id, createdOrderId));
        } catch (cleanupError) {
          console.error("Failed to clean generation order", cleanupError);
        }
      }
      if (env.BUCKET) {
        await Promise.allSettled(uploadedKeys.map((key) => env.BUCKET!.delete(key)));
      }
    }
    return Response.json(
      { error: "Nie udało się uruchomić bezpiecznej płatności. Spróbuj ponownie." },
      { status: 500 },
    );
  }
}
