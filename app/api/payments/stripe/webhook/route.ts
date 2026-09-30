import { handlePaidCheckoutSession } from "../../../../../lib/generation-pipeline";
import { verifyStripeSignature, type StripeCheckoutSession } from "../../../../../lib/stripe";

export const dynamic = "force-dynamic";

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: StripeCheckoutSession };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyStripeSignature(rawBody, request.headers.get("stripe-signature"));
  if (!verified) return new Response("Invalid signature", { status: 400 });

  try {
    const event = JSON.parse(rawBody) as StripeEvent;
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data?.object;
      if (session) await handlePaidCheckoutSession(session);
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed", error);
    return new Response("Webhook handling failed", { status: 500 });
  }
}
