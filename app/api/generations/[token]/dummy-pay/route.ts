import { env } from "cloudflare:workers";
import { confirmDummyPayment } from "../../../../../lib/generation-pipeline";
import { dummyPaymentsAllowed } from "../../../../../lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) {
      return Response.json({ error: "Nieprawidłowy numer zamówienia." }, { status: 400 });
    }
    if (!dummyPaymentsAllowed(request.url)) {
      return Response.json(
        { error: "Tryb testowego BLIK działa wyłącznie lokalnie." },
        { status: 403 },
      );
    }

    let code = "";
    try {
      const body = (await request.json()) as { code?: unknown };
      code = typeof body.code === "string" ? body.code.trim() : "";
    } catch {
      code = "";
    }
    if (code !== "123456") {
      return Response.json(
        { error: "Nieprawidłowy kod testowy. Wpisz 123456." },
        { status: 400 },
      );
    }
    if (!env.MESHY_API_KEY?.trim()) {
      return Response.json(
        {
          error:
            "Płatność testowa jest gotowa, ale do uruchomienia generowania dodaj MESHY_API_KEY w pliku .dev.vars.",
          code: "meshy_configuration_required",
        },
        { status: 503 },
      );
    }

    const order = await confirmDummyPayment(token, request.url);
    if (!order) {
      return Response.json({ error: "Nie znaleziono zamówienia." }, { status: 404 });
    }

    return Response.json(
      { redirectUrl: `/generator/${token}` },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Dummy BLIK confirmation failed", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nie udało się potwierdzić testowej płatności.",
      },
      { status: 500 },
    );
  }
}
