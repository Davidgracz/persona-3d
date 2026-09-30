import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  Check,
  Download,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { dummyPaymentsConfigured } from "../../lib/stripe";
import { GeneratorForm } from "./generator-form";

export const metadata: Metadata = {
  title: "Generator figurki 3D ze zdjęcia | Persona 3D",
  description:
    "Wybierz styl, dodaj zdjęcie i po płatności BLIK wygeneruj model 3D do podglądu oraz pobrania w formatach GLB i STL.",
};

function generatorSteps(dummyPayments: boolean) {
  return [
  { icon: ScanLine, title: "Zdjęcia", text: "Dodajesz jedno ujęcie dla chibi albo do czterech dla stylu realistycznego." },
  {
    icon: ShieldCheck,
    title: "BLIK 49 zł",
    text: dummyPayments
      ? "Lokalnie symulujesz płatność kodem 123456. Dopiero potwierdzenie uruchamia Meshy."
      : "Płacisz na bezpiecznej stronie Stripe. Dopiero potwierdzenie uruchamia Meshy.",
  },
  { icon: Box, title: "Podgląd 3D", text: "Na stronie obracasz i przybliżasz gotowy, teksturowany model." },
  { icon: Download, title: "Pobieranie", text: "Pobierasz GLB z teksturą oraz STL przeznaczony do dalszego przygotowania druku." },
  ];
}

export const dynamic = "force-dynamic";

export default async function GeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
  const dummyPayments = dummyPaymentsConfigured();
  return (
    <main className="generator-page">
      <header className="generator-header">
        <Link className="brand" href="/" aria-label="Persona 3D — strona główna">
          <span className="brand-mark" aria-hidden="true"><span>P</span><i>3D</i></span>
          <span className="brand-copy"><strong>PERSONA <em>3D</em></strong><small>GENERATOR ZE ZDJĘCIA</small></span>
        </Link>
        <Link className="back-link" href="/"><ArrowLeft /> Wróć do strony</Link>
      </header>

      <section className="generator-hero">
        <div className="generator-hero-copy">
          <p className="eyebrow"><Sparkles /> Automatyczny model 3D</p>
          <h1>Twoje zdjęcie.<br /><span>Twoja figurka.</span></h1>
          <p>
            Wybierz realistyczny charakter albo kolekcjonerski styl chibi. Po
            potwierdzonej płatności BLIK Meshy utworzy model, który obejrzysz i pobierzesz tutaj.
          </p>
          <div className="generator-price-lockup">
            <strong>49 zł</strong>
            <span>jedna generacja<br />GLB + STL</span>
          </div>
          <div className="generator-trust-row">
            <span><BadgeCheck /> Płatność przed generowaniem</span>
            <span><Check /> Prywatne pliki w magazynie strony</span>
          </div>
        </div>
        <GeneratorForm paymentCancelled={payment === "cancelled"} dummyPayments={dummyPayments} />
      </section>

      <section className="generator-how">
        <div className="section-heading compact">
          <p className="eyebrow">Od zdjęcia do pliku</p>
          <h2>Całość dzieje się w czterech prostych krokach.</h2>
        </div>
        <div className="generator-step-grid">
          {generatorSteps(dummyPayments).map(({ icon: Icon, title, text }, index) => (
            <article key={title}>
              <span><Icon /></span>
              <small>0{index + 1}</small>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="generator-disclaimer">
        <div><ShieldCheck /></div>
        <div>
          <strong>Ważne przed drukiem</strong>
          <p>
            Automatyczny model AI może wymagać ustawienia skali, podpór albo naprawy drobnych
            elementów w slicerze. Zakup za 49 zł obejmuje generację cyfrową, nie fizyczną figurkę,
            wysyłkę ani ręczne modelowanie. Jeśli potrzebujesz gotowego wydruku lub malowania,
            skorzystaj z bezpłatnej wyceny na stronie głównej.
          </p>
        </div>
        <Link href="/#wycena">Zamów fizyczną figurkę</Link>
      </section>
    </main>
  );
}
