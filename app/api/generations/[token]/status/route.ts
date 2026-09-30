import { advanceGeneration, confirmCheckoutForToken } from "../../../../../lib/generation-pipeline";

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

    let sessionId = "";
    try {
      const body = (await request.json()) as { sessionId?: unknown };
      sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    } catch {
      sessionId = "";
    }

    if (sessionId) {
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
        return Response.json({ error: "Nieprawidłowa sesja płatności." }, { status: 400 });
      }
      const order = await confirmCheckoutForToken(token, sessionId);
      if (!order) return Response.json({ error: "Nie znaleziono zamówienia." }, { status: 404 });
    }

    const status = await advanceGeneration(token);
    if (!status) return Response.json({ error: "Nie znaleziono zamówienia." }, { status: 404 });
    return Response.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Generation status failed", error);
    return Response.json(
      { error: "Nie udało się odświeżyć stanu generowania. Spróbuj ponownie za chwilę." },
      { status: 500 },
    );
  }
}
