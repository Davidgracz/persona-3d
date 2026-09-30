"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DummyPaymentCard({
  token,
  orderId,
  style,
  alreadyPaid,
}: {
  token: string;
  orderId: string;
  style: string;
  alreadyPaid: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState("123456");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  async function confirmPayment() {
    if (alreadyPaid) {
      router.push(`/generator/${token}`);
      return;
    }

    setState("sending");
    setMessage("");
    try {
      const response = await fetch(`/api/generations/${token}/dummy-pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const raw = await response.text();
      let result: { redirectUrl?: string; error?: string } = {};
      try {
        result = JSON.parse(raw) as typeof result;
      } catch {
        result = {};
      }
      if (!response.ok || !result.redirectUrl) {
        throw new Error(result.error || "Nie udało się potwierdzić płatności testowej.");
      }
      router.push(result.redirectUrl);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Nie udało się potwierdzić płatności.");
    }
  }

  return (
    <section className="dummy-payment-card">
      <div className="dummy-payment-badge"><ShieldAlert /> TRYB TESTOWY</div>
      <p className="eyebrow">Symulator płatności BLIK</p>
      <h1>Potwierdź testowe 49 zł.</h1>
      <p className="dummy-payment-lead">
        Żadne pieniądze nie zostaną pobrane. Po potwierdzeniu prawdziwy klucz Meshy uruchomi
        generowanie modelu.
      </p>

      <dl className="dummy-payment-summary">
        <div><dt>Zamówienie</dt><dd>{orderId}</dd></div>
        <div><dt>Styl</dt><dd>{style}</dd></div>
        <div><dt>Do zapłaty</dt><dd>49,00 zł</dd></div>
      </dl>

      {!alreadyPaid && (
        <label className="dummy-code-field">
          <span>Kod BLIK</span>
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            maxLength={6}
            pattern="[0-9]{6}"
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            aria-describedby="dummy-code-help"
          />
          <small id="dummy-code-help">Kod testowy: <strong>123456</strong></small>
        </label>
      )}

      <Button
        className="generator-pay-button"
        type="button"
        disabled={state === "sending" || (!alreadyPaid && code.length !== 6)}
        onClick={confirmPayment}
      >
        {state === "sending" ? (
          <><LoaderCircle className="animate-spin" /> Potwierdzamy…</>
        ) : alreadyPaid ? (
          <><CheckCircle2 /> Przejdź do modelu <ArrowRight /></>
        ) : (
          <><CheckCircle2 /> Symuluj udaną płatność <ArrowRight /></>
        )}
      </Button>

      {state === "error" && message && (
        <output className="generator-error" aria-live="polite">{message}</output>
      )}
      <p className="dummy-payment-footnote">
        Ten ekran działa tylko lokalnie. Publiczna wersja strony nadal wymaga prawdziwego Stripe.
      </p>
    </section>
  );
}
