"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CreditCard,
  FileImage,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { GenerationStyle } from "@/lib/generator-config";

type Preview = { name: string; url: string };

export function GeneratorForm({
  paymentCancelled = false,
  dummyPayments = false,
}: {
  paymentCancelled?: boolean;
  dummyPayments?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [style, setStyle] = useState<GenerationStyle>("realistic");
  const [consent, setConsent] = useState(false);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");
  useEffect(() => {
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  function chooseStyle(nextStyle: GenerationStyle) {
    setStyle(nextStyle);
    setMessage("");
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setPreviews([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function updateFiles(files: FileList | null) {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    const selected = Array.from(files ?? []);
    setPreviews(selected.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })));
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;
    const files = Array.from(inputRef.current?.files ?? []);
    const maxFiles = style === "chibi" ? 1 : 4;

    if (files.length < 1 || files.length > maxFiles) {
      setState("error");
      setMessage(
        style === "chibi"
          ? "Dla stylu chibi dodaj dokładnie jedno zdjęcie."
          : "Dla stylu realistycznego dodaj od 1 do 4 zdjęć.",
      );
      return;
    }
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (files.some((file) => file.size > 4 * 1024 * 1024) || totalBytes > 12 * 1024 * 1024) {
      setState("error");
      setMessage("Jedno zdjęcie może mieć do 4 MB, a wszystkie łącznie do 12 MB.");
      return;
    }
    if (!consent) {
      setState("error");
      setMessage("Potwierdź zgodę i warunki automatycznego generowania.");
      return;
    }

    setState("sending");
    const data = new FormData(form);
    data.set("style", style);
    data.set("consent", "yes");

    try {
      const response = await fetch("/api/generations/checkout", { method: "POST", body: data });
      const raw = await response.text();
      let result: { checkoutUrl?: string; error?: string } = {};
      try {
        result = JSON.parse(raw) as typeof result;
      } catch {
        result = {};
      }
      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.error || "Nie udało się uruchomić płatności.");
      }
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się uruchomić płatności. Spróbuj ponownie.",
      );
    }
  }

  return (
    <form className="generator-form" onSubmit={handleSubmit}>
      {dummyPayments && (
        <div className="generator-notice dummy" role="status">
          <strong>Testowy BLIK jest włączony.</strong> Żadne pieniądze nie zostaną pobrane.
          Na następnym ekranie użyj kodu <strong>123456</strong>.
        </div>
      )}
      {paymentCancelled && (
        <div className="generator-notice" role="status">
          Płatność została anulowana. Zdjęcia nie trafiły do Meshy i możesz zacząć ponownie.
        </div>
      )}

      <fieldset className="generator-fieldset">
        <legend>1. Wybierz styl modelu</legend>
        <div className="style-picker">
          <button
            className={style === "realistic" ? "style-option active" : "style-option"}
            type="button"
            onClick={() => chooseStyle("realistic")}
            aria-pressed={style === "realistic"}
          >
            <span className="style-icon realistic"><FileImage /></span>
            <span>
              <strong>Realistyczny</strong>
              <small>Więcej naturalnych proporcji i detali; najlepiej 2–4 ujęcia.</small>
            </span>
            <i><Check /></i>
          </button>
          <button
            className={style === "chibi" ? "style-option active" : "style-option"}
            type="button"
            onClick={() => chooseStyle("chibi")}
            aria-pressed={style === "chibi"}
          >
            <span className="style-icon chibi"><Sparkles /></span>
            <span>
              <strong>Chibi</strong>
              <small>Kolekcjonerska postać z większą głową, tworzona z jednego zdjęcia.</small>
            </span>
            <i><Check /></i>
          </button>
        </div>
      </fieldset>

      <div className="generator-field">
        <label htmlFor="generator-photos">2. Dodaj {style === "chibi" ? "zdjęcie" : "zdjęcia"}</label>
        <label className="generator-upload" htmlFor="generator-photos">
          <UploadCloud />
          <strong>{previews.length ? "Zmień wybrane zdjęcia" : "Wybierz zdjęcia z urządzenia"}</strong>
          <span>
            JPG lub PNG • {style === "chibi" ? "1 zdjęcie" : "1–4 zdjęcia"} • maks. 4 MB każde
          </span>
          <Input
            ref={inputRef}
            id="generator-photos"
            name="photos"
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple={style === "realistic"}
            required
            onChange={(event) => updateFiles(event.target.files)}
          />
        </label>
        {previews.length > 0 && (
          <div className="generator-previews" aria-live="polite">
            {previews.map((preview, index) => (
              <figure key={preview.url}>
                <img src={preview.url} alt={`Wybrane zdjęcie ${index + 1}: ${preview.name}`} />
                <figcaption>{index === 0 ? "Ujęcie główne" : `Ujęcie ${index + 1}`}</figcaption>
              </figure>
            ))}
          </div>
        )}
        <p className="generator-hint">
          {style === "realistic"
            ? "Pierwszy plik traktujemy jako widok z przodu. Kolejne mogą pokazywać profil i tył."
            : "Najlepszy efekt daje wyraźna postać pokazana od przodu, na spokojnym tle."}
        </p>
      </div>

      <div className="generator-field">
        <label htmlFor="generator-email">3. Adres do potwierdzenia zamówienia</label>
        <Input
          id="generator-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="twoj@email.pl"
          required
          maxLength={120}
        />
      </div>

      <label className="generator-consent">
        <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} />
        <span>
          Mam zgodę osoby ze zdjęcia na jego przetworzenie. Rozumiem, że jest to automatyczna
          generacja AI i przed drukiem trzeba sprawdzić model w slicerze; cena nie obejmuje
          fizycznego wydruku ani ręcznych poprawek.
        </span>
      </label>

      <div className="checkout-summary">
        <div>
          <span>Automatyczna generacja</span>
          <strong>49 zł</strong>
        </div>
        <ul>
          <li><Check /> podgląd obrotowy 3D</li>
          <li><Check /> plik GLB z teksturą</li>
          <li><Check /> plik STL do druku</li>
        </ul>
      </div>

      <Button className="generator-pay-button" type="submit" disabled={state === "sending"}>
        {state === "sending" ? (
          <><LoaderCircle className="animate-spin" /> Przygotowujemy BLIK…</>
        ) : (
          <><CreditCard /> {dummyPayments ? "Przejdź do testowego BLIK" : "Przejdź do BLIK"} — 49 zł <ArrowRight /></>
        )}
      </Button>
      <p className="payment-security">
        <ShieldCheck /> {dummyPayments
          ? "Lokalny symulator — bez obciążenia konta i bez połączenia ze Stripe."
          : "Płatność obsługuje Stripe. Numer BLIK wpisujesz na bezpiecznej stronie operatora."}
      </p>

      {state === "error" && message && (
        <output className="generator-error" aria-live="polite">{message}</output>
      )}
    </form>
  );
}
