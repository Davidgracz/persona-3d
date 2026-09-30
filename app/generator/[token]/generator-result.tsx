"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Download,
  LoaderCircle,
  RefreshCw,
  Rotate3D,
} from "lucide-react";
import { ModelPreview } from "./model-preview";

type GenerationStatus = {
  id: string;
  style: "realistic" | "chibi";
  paymentStatus: string;
  generationStatus: string;
  progress: number;
  message: string;
  ready: boolean;
  failed: boolean;
  glbUrl?: string;
  stlUrl?: string;
};

export function GeneratorResult({ token }: { token: string }) {
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [requestError, setRequestError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let paymentConfirmed = false;
    const sessionId = new URLSearchParams(window.location.search).get("session_id") || "";

    async function poll() {
      try {
        const response = await fetch(`/api/generations/${token}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: paymentConfirmed ? "" : sessionId }),
        });
        const raw = await response.text();
        let result: GenerationStatus & { error?: string };
        try {
          result = JSON.parse(raw) as typeof result;
        } catch {
          throw new Error("Serwer zwrócił nieprawidłową odpowiedź.");
        }
        if (!response.ok) throw new Error(result.error || "Nie udało się odświeżyć statusu.");
        if (!active) return;
        paymentConfirmed = result.paymentStatus === "paid";
        setStatus(result);
        setRequestError("");
        if (!result.ready && !result.failed) timer = setTimeout(poll, 6000);
      } catch (error) {
        if (!active) return;
        setRequestError(error instanceof Error ? error.message : "Nie udało się odświeżyć statusu.");
        timer = setTimeout(poll, 10000);
      }
    }

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [token, retryKey]);

  if (!status) {
    return (
      <section className="result-loading">
        <LoaderCircle className="animate-spin" />
        <p><strong>Sprawdzamy płatność i zamówienie…</strong><span>Nie zamykaj tej karty.</span></p>
        {requestError && <small>{requestError}</small>}
      </section>
    );
  }

  if (status.failed) {
    return (
      <section className="result-failed">
        <span><AlertTriangle /></span>
        <p className="eyebrow">Generowanie zatrzymane</p>
        <h1>Nie udało się dokończyć modelu.</h1>
        <p>{status.message}</p>
        <div className="result-order-id">Numer zamówienia: <strong>{status.id}</strong></div>
        <button type="button" onClick={() => setRetryKey((value) => value + 1)}>
          <RefreshCw /> Sprawdź ponownie
        </button>
      </section>
    );
  }

  if (!status.ready || !status.glbUrl || !status.stlUrl) {
    return (
      <section className="result-progress-shell">
        <div className="result-progress-visual">
          <div className="result-orbit"><Box /><i /><i /><i /></div>
        </div>
        <div className="result-progress-copy">
          <p className="eyebrow"><LoaderCircle className="animate-spin" /> Meshy pracuje</p>
          <h1>Tworzymy Twoją figurkę.</h1>
          <p>{status.message}</p>
          <div className="progress-track" aria-label={`Postęp ${status.progress}%`}>
            <span style={{ width: `${status.progress}%` }} />
          </div>
          <div className="progress-meta"><strong>{status.progress}%</strong><span>Numer: {status.id}</span></div>
          <small>Generowanie zwykle zajmuje kilka minut. Ta strona odświeża status automatycznie.</small>
          {requestError && <div className="poll-warning">{requestError}</div>}
        </div>
      </section>
    );
  }

  return (
    <section className="result-ready-shell">
      <div className="model-stage">
        <div className="model-stage-label"><Rotate3D /> Przeciągnij, aby obrócić</div>
        <ModelPreview src={status.glbUrl} />
      </div>
      <div className="result-ready-copy">
        <span className="ready-icon"><CheckCircle2 /></span>
        <p className="eyebrow">Model gotowy</p>
        <h1>Twoja figurka jest w 3D.</h1>
        <p>{status.message}</p>
        <div className="download-grid">
          <a href={status.glbUrl} download>
            <span><Box /></span>
            <div><strong>Pobierz GLB</strong><small>Model z teksturą do podglądu i edycji</small></div>
            <Download />
          </a>
          <a href={status.stlUrl} download>
            <span><Download /></span>
            <div><strong>Pobierz STL</strong><small>Siatka do sprawdzenia i ustawienia w slicerze</small></div>
            <Download />
          </a>
        </div>
        <div className="print-warning"><AlertTriangle /> Przed drukiem sprawdź skalę, podstawę, grubość detali i podpory w swoim slicerze.</div>
        <div className="result-order-id">Numer zamówienia: <strong>{status.id}</strong></div>
      </div>
    </section>
  );
}
