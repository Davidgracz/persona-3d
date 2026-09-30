"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, FileImage, LoaderCircle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Finish = "raw" | "painted";
type Size = "10" | "15" | "20" | "custom";

type ModelContextLike = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<Record<string, unknown>>;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

export function OrderForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [finish, setFinish] = useState<Finish>("raw");
  const [size, setSize] = useState<Size>("15");
  const [copies, setCopies] = useState("1");
  const [consent, setConsent] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    const documentWithTools = document as Document & { modelContext?: ModelContextLike };
    const context = documentWithTools.modelContext;
    if (!context?.registerTool) return;

    const lifecycle = new AbortController();
    const registration = context.registerTool(
      {
        name: "configure_figurine_quote",
        title: "Przygotuj wycenę figurki",
        description:
          "Ustawia wariant wykończenia i rozmiar figurki, a następnie otwiera formularz wyceny. Nie wysyła zgłoszenia.",
        inputSchema: {
          type: "object",
          properties: {
            finish: {
              type: "string",
              enum: ["raw", "painted"],
              description: "raw = do pomalowania, painted = pomalowana ręcznie",
            },
            size: {
              type: "string",
              enum: ["10", "15", "20", "custom"],
              description: "Wysokość figurki w centymetrach lub custom",
            },
          },
          required: ["finish", "size"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          const value = input as { finish?: unknown; size?: unknown };
          const validFinish = value.finish === "raw" || value.finish === "painted";
          const validSize = ["10", "15", "20", "custom"].includes(String(value.size));
          if (!validFinish || !validSize) {
            throw new Error("Nieprawidłowy wariant wykończenia lub rozmiar.");
          }

          setFinish(value.finish as Finish);
          setSize(value.size as Size);
          requestAnimationFrame(() => {
            document.getElementById("wycena")?.scrollIntoView({ behavior: "smooth" });
          });

          return {
            configured: true,
            finish: value.finish,
            size: value.size,
            next_step: "Dodaj zdjęcia i dane kontaktowe, a następnie wyślij formularz.",
          };
        },
      },
      { signal: lifecycle.signal },
    );

    void Promise.resolve(registration).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setOrderId("");

    const form = event.currentTarget;
    const files = Array.from(
      form.querySelector<HTMLInputElement>('input[type="file"]')?.files ?? [],
    );

    if (files.length < 1 || files.length > 6) {
      setState("error");
      setMessage("Dodaj od 1 do 6 zdjęć.");
      return;
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (files.some((file) => file.size > 8 * 1024 * 1024) || totalBytes > 30 * 1024 * 1024) {
      setState("error");
      setMessage("Jedno zdjęcie może mieć do 8 MB, a wszystkie łącznie do 30 MB.");
      return;
    }

    if (!consent) {
      setState("error");
      setMessage("Potwierdź zgodę na wykorzystanie zdjęć do przygotowania wyceny.");
      return;
    }

    setState("sending");
    const data = new FormData(form);
    data.set("finish", finish);
    data.set("size", size);
    data.set("copies", copies);
    data.set("consent", consent ? "yes" : "no");

    try {
      const response = await fetch("/api/orders", { method: "POST", body: data });
      const responseText = await response.text();
      let result: { id?: string; error?: string } = {};
      try {
        result = JSON.parse(responseText) as { id?: string; error?: string };
      } catch {
        result = {};
      }
      if (!response.ok || !result.id) {
        throw new Error(
          response.status === 413
            ? "Zdjęcia są zbyt duże. Zmniejsz ich łączny rozmiar i spróbuj ponownie."
            : result.error || "Nie udało się wysłać formularza.",
        );
      }

      setState("success");
      setMessage("Zgłoszenie zostało zapisane. Skontaktujemy się po analizie zdjęć.");
      setOrderId(result.id);
      form.reset();
      setFinish("raw");
      setSize("15");
      setCopies("1");
      setConsent(false);
      setFileNames([]);
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Nie udało się wysłać formularza. Spróbuj ponownie.",
      );
    }
  }

  return (
    <form className="quote-form" ref={formRef} onSubmit={handleSubmit}>
      <div className="form-heading">
        <span>BEZPŁATNA WYCENA</span>
        <h3>Opowiedz nam o figurce</h3>
        <p>Wysłanie formularza nie zobowiązuje do zakupu.</p>
      </div>

      <fieldset className="form-block">
        <legend>1. Wybierz wykończenie</legend>
        <RadioGroup
          className="finish-options"
          name="finish"
          value={finish}
          onValueChange={(value) => setFinish(value as Finish)}
        >
          <label className={finish === "raw" ? "finish-card active" : "finish-card"}>
            <RadioGroupItem value="raw" />
            <span><strong>Do własnego malowania</strong><small>Oczyszczony, przygotowany wydruk</small></span>
          </label>
          <label className={finish === "painted" ? "finish-card active" : "finish-card"}>
            <RadioGroupItem value="painted" />
            <span><strong>Gotowa na prezent</strong><small>Ręcznie pomalowana i zabezpieczona</small></span>
          </label>
        </RadioGroup>
      </fieldset>

      <div className="form-grid">
        <div className="form-block">
          <label htmlFor="size">2. Wysokość figurki</label>
          <Select name="size" value={size} onValueChange={(value) => setSize(value as Size)}>
            <SelectTrigger id="size" className="form-select" aria-label="Wysokość figurki">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">około 10 cm</SelectItem>
              <SelectItem value="15">około 15 cm</SelectItem>
              <SelectItem value="20">około 20 cm</SelectItem>
              <SelectItem value="custom">inny rozmiar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="form-block">
          <label htmlFor="copies">Liczba sztuk</label>
          <Select name="copies" value={copies} onValueChange={setCopies}>
            <SelectTrigger id="copies" className="form-select" aria-label="Liczba sztuk">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 sztuka</SelectItem>
              <SelectItem value="2">2 sztuki</SelectItem>
              <SelectItem value="3">3 sztuki</SelectItem>
              <SelectItem value="4">4 sztuki</SelectItem>
              <SelectItem value="5">5 sztuk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="form-block">
        <label htmlFor="photos">3. Dodaj zdjęcia</label>
        <label className="upload-zone" htmlFor="photos">
          <UploadCloud aria-hidden="true" />
          <strong>Wybierz zdjęcia z urządzenia</strong>
          <span>JPG, PNG, WEBP lub HEIC • 1–6 zdjęć • maks. 30 MB łącznie</span>
          <Input
            id="photos"
            name="photos"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic"
            multiple
            required
            onChange={(event) =>
              setFileNames(Array.from(event.target.files ?? []).map((file) => file.name))
            }
          />
        </label>
        {fileNames.length > 0 && (
          <div className="file-list" aria-live="polite">
            <FileImage />
            <span>{fileNames.length} {fileNames.length === 1 ? "plik" : "pliki"}: {fileNames.join(", ")}</span>
          </div>
        )}
      </div>

      <div className="form-grid contact-grid">
        <div className="form-block">
          <label htmlFor="name">Imię i nazwisko</label>
          <Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} />
        </div>
        <div className="form-block">
          <label htmlFor="email">E-mail</label>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={120} />
        </div>
        <div className="form-block">
          <label htmlFor="phone">Telefon <span>(opcjonalnie)</span></label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={32} />
        </div>
      </div>

      <div className="form-block">
        <label htmlFor="notes">Co ma przedstawiać figurka?</label>
        <Textarea
          id="notes"
          name="notes"
          rows={5}
          maxLength={2000}
          placeholder="Opisz pozę, strój, podstawkę, ważne dodatki lub okazję, na którą powstaje figurka."
        />
      </div>

      <label className="consent-row">
        <Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} />
        <span>
          Mam zgodę osób widocznych na zdjęciach i zgadzam się na użycie plików
          wyłącznie do przygotowania wyceny oraz realizacji tej figurki.
        </span>
      </label>

      <Button className="submit-button" size="lg" type="submit" disabled={state === "sending"}>
        {state === "sending" ? (
          <><LoaderCircle className="animate-spin" /> Wysyłanie zdjęć…</>
        ) : (
          <>Poproś o wycenę <ArrowRight /></>
        )}
      </Button>

      {state !== "idle" && state !== "sending" && (
        <output className={"form-status " + state} aria-live="polite">
          {state === "success" && <CheckCircle2 />}
          <span>
            <strong>{state === "success" ? "Dziękujemy!" : "Sprawdź formularz"}</strong>
            {message}
            {orderId && <small>Numer zgłoszenia: {orderId}</small>}
          </span>
        </output>
      )}
    </form>
  );
}
