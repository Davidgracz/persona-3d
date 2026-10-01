import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { GeneratorResult } from "./generator-result";

export const metadata: Metadata = {
  title: "Twój model 3D | Persona 3D",
  robots: { index: false, follow: false },
};

export default async function GeneratorResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="result-page">
      <header className="generator-header">
        <a className="brand" href="/" aria-label="Persona 3D — strona główna">
          <span className="brand-mark" aria-hidden="true"><span>P</span><i>3D</i></span>
          <span className="brand-copy"><strong>PERSONA <em>3D</em></strong><small>TWÓJ MODEL</small></span>
        </a>
        <a className="back-link" href="/generator"><ArrowLeft /> Nowa generacja</a>
      </header>
      <GeneratorResult token={token} />
    </main>
  );
}
