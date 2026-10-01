import { env } from "cloudflare:workers";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrderByToken } from "../../../../lib/generation-pipeline";
import { styleLabel } from "../../../../lib/generator-config";
import { dummyPaymentsConfigured } from "../../../../lib/stripe";
import { DummyPaymentCard } from "./dummy-payment-card";

export const metadata: Metadata = {
  title: "Testowa płatność BLIK | Persona 3D",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DummyPaymentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!dummyPaymentsConfigured() || !env.DB || !/^[A-Za-z0-9_-]{20,80}$/.test(token)) {
    notFound();
  }

  const order = await getOrderByToken(token);
  if (!order || !order.stripeSessionId?.startsWith("dummy_")) notFound();

  return (
    <main className="dummy-payment-page">
      <header className="generator-header">
        <a className="brand" href="/" aria-label="Persona 3D — strona główna">
          <span className="brand-mark" aria-hidden="true"><span>P</span><i>3D</i></span>
          <span className="brand-copy"><strong>PERSONA <em>3D</em></strong><small>TESTOWY BLIK</small></span>
        </a>
        <a className="back-link" href="/generator"><ArrowLeft /> Anuluj test</a>
      </header>
      <DummyPaymentCard
        token={token}
        orderId={order.id}
        style={styleLabel(order.style === "chibi" ? "chibi" : "realistic")}
        alreadyPaid={order.paymentStatus === "paid"}
      />
    </main>
  );
}
