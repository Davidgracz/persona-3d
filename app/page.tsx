import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  Cuboid,
  Gift,
  Heart,
  MonitorUp,
  Paintbrush,
  ScanFace,
  Sparkles,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OrderForm } from "./order-form";

const steps = [
  {
    number: "01",
    title: "Dodajesz zdjęcia",
    description: "Najlepiej 2–6 ujęć: przód, profil, tył oraz ważne detale stroju.",
    icon: Camera,
  },
  {
    number: "02",
    title: "Tworzymy Twoją postać",
    description: "Budujemy model, dopracowujemy podobieństwo i przygotowujemy go do druku.",
    icon: ScanFace,
  },
  {
    number: "03",
    title: "Akceptujesz projekt",
    description: "Przed drukiem pokazujemy podgląd. To moment na Twoje uwagi i poprawki.",
    icon: BadgeCheck,
  },
  {
    number: "04",
    title: "Odbierasz figurkę",
    description: "Do własnego malowania albo ręcznie wykończoną i gotową na prezent.",
    icon: Gift,
  },
];

const occasions = ["Urodziny", "Rocznica", "Ślub", "Podziękowanie", "Po prostu"];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#start" aria-label="Persona 3D — strona główna">
          <span className="brand-mark" aria-hidden="true">
            <span>P</span>
            <i>3D</i>
          </span>
          <span className="brand-copy">
            <strong>PERSONA <em>3D</em></strong>
            <small>FIGURKI Z TWOICH ZDJĘĆ</small>
          </span>
        </a>
        <nav className="header-nav" aria-label="Główna nawigacja">
          <a href="/generator">Generator 3D</a>
          <a href="#proces">Jak powstaje</a>
          <a href="#warianty">Warianty</a>
          <a href="#faq">Pytania</a>
        </nav>
        <a className="header-cta" href="/generator">
          Generator 49 zł <ArrowRight />
        </a>
      </header>

      <section className="hero-shell" id="start">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles /> Prezent jedyny taki</p>
          <h1>
            Najbardziej osobisty prezent?
            <span>Ty. W 3D.</span>
          </h1>
          <p className="hero-lead">
            Zamieniamy fotografie w wyjątkowe figurki z charakterem — do
            samodzielnego malowania albo gotowe do wręczenia.
          </p>
          <div className="hero-actions">
            <a className="button-primary" href="/generator">
              Wygeneruj model — 49 zł <ArrowRight />
            </a>
            <a className="button-quiet" href="#wycena">Zamów fizyczną figurkę</a>
          </div>
          <div className="hero-assurance">
            <span><Heart aria-hidden="true" /> Tworzone indywidualnie</span>
            <span><Check aria-hidden="true" /> Akceptacja przed drukiem</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-sun" aria-hidden="true" />
          <div className="hero-dot-grid" aria-hidden="true" />
          <div className="hero-photo-wrap">
            <img
              className="hero-image"
              src="/figurka-hero.png"
              alt="Ta sama spersonalizowana figurka jako surowy wydruk i ręcznie pomalowany model"
            />
            <span className="image-label image-label-top"><Sparkles /> Z Twoich zdjęć</span>
            <span className="image-label image-label-bottom"><Gift /> Gotowa na wielkie wow</span>
          </div>
        </div>

        <div className="hero-process" aria-label="Proces realizacji">
          <span><b>01</b> Zdjęcia</span>
          <i aria-hidden="true" />
          <span><b>02</b> Model 3D</span>
          <i aria-hidden="true" />
          <span><b>03</b> Akceptacja</span>
          <i aria-hidden="true" />
          <span><b>04</b> Figurka</span>
        </div>
      </section>

      <section className="occasion-strip" aria-label="Pomysły na okazję">
        <span className="occasion-title"><Gift /> Dobry pomysł na:</span>
        <div>
          {occasions.map((occasion) => <span key={occasion}>{occasion}</span>)}
        </div>
      </section>

      <section className="section instant-generator-section" id="generator">
        <div className="instant-generator-copy">
          <p className="eyebrow"><Sparkles /> Nowość: generator online</p>
          <h2>Model 3D po płatności BLIK. Bez czekania na wycenę.</h2>
          <p>
            Dodaj zdjęcia, wybierz styl realistyczny lub chibi i zapłać 49 zł.
            Po generowaniu obejrzysz figurkę z każdej strony oraz pobierzesz GLB i STL.
          </p>
          <ul>
            <li><Check /> dwa style do wyboru</li>
            <li><Check /> interaktywny podgląd 3D</li>
            <li><Check /> prywatne pliki do pobrania</li>
          </ul>
          <a className="button-primary" href="/generator">Uruchom generator <ArrowRight /></a>
        </div>
        <div className="instant-generator-card">
          <span className="instant-generator-icon"><MonitorUp /></span>
          <small>CENA ZA 1 GENERACJĘ</small>
          <strong>49 zł</strong>
          <p>Realistyczna albo chibi<br />GLB z teksturą + STL</p>
          <div><span>BLIK</span><i>→</i><span>MESHY</span><i>→</i><span>3D</span></div>
        </div>
      </section>

      <section className="section section-process" id="proces">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Od zdjęcia do figurki</p>
            <h2>Cztery kroki do małego wielkiego prezentu.</h2>
          </div>
          <p>
            Technologia pomaga nam zbudować bazę, ale to człowiek pilnuje
            podobieństwa, proporcji i detali. Każdy projekt traktujemy osobno.
          </p>
        </div>
        <div className="steps-grid">
          {steps.map(({ number, title, description, icon: Icon }) => (
            <article className="step-card" key={number}>
              <div className="step-top">
                <span>{number}</span>
                <span className="step-icon"><Icon aria-hidden="true" /></span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="warianty">
        <div className="section-heading compact">
          <p className="eyebrow">Wybierz swój wariant</p>
          <h2>Ty decydujesz, gdzie kończymy pracę.</h2>
        </div>
        <div className="variant-grid">
          <article className="variant-card raw">
            <span className="variant-badge">DLA KREATYWNYCH</span>
            <div className="variant-icon"><Cuboid /></div>
            <p className="variant-number">01 / DO MALOWANIA</p>
            <h3>Wykończ ją po swojemu</h3>
            <p>
              Oczyszczony wydruk na podstawce. Idealny dla modelarzy, hobbystów
              i każdego, kto chce sam nadać figurce kolory.
            </p>
            <ul>
              <li><Check /> przygotowany wydruk</li>
              <li><Check /> zachowane detale modelu</li>
              <li><Check /> gotowa do podkładu i farb</li>
            </ul>
            <a href="#wycena">Wybieram do malowania <ArrowRight /></a>
          </article>
          <article className="variant-card painted">
            <span className="variant-badge">GOTOWA NA PREZENT</span>
            <div className="variant-icon"><Paintbrush /></div>
            <p className="variant-number">02 / RĘCZNIE MALOWANA</p>
            <h3>Otwórz pudełko i zachwyć</h3>
            <p>
              Kompletny egzemplarz z kolorystyką dopasowaną do zdjęć. Po
              rozpakowaniu może od razu zająć honorowe miejsce.
            </p>
            <ul>
              <li><Check /> ręczne malowanie</li>
              <li><Check /> kolory dobrane do zdjęć</li>
              <li><Check /> zabezpieczone wykończenie</li>
            </ul>
            <a href="#wycena">Wybieram gotową figurkę <ArrowRight /></a>
          </article>
        </div>
      </section>

      <section className="section quote-section" id="wycena">
        <div className="quote-intro">
          <p className="eyebrow">Bezpłatna wycena</p>
          <h2>Zacznijmy od kilku dobrych zdjęć.</h2>
          <p>
            Wyślij fotografie i opowiedz nam o pomyśle. Po analizie wrócimy z
            indywidualną wyceną i propozycją kolejnych kroków.
          </p>
          <div className="photo-tips">
            <span className="tip-icon"><Camera /></span>
            <div>
              <strong>Jak zrobić dobre zdjęcia?</strong>
              <span>Przód, oba profile, tył i zbliżenie twarzy — bez filtrów, w równym świetle.</span>
            </div>
          </div>
          <div className="no-charge-note">
            <Check /> Formularz nie jest zamówieniem i nie uruchamia płatności.
          </div>
        </div>
        <OrderForm />
      </section>

      <section className="section faq-section" id="faq">
        <div className="section-heading compact">
          <p className="eyebrow">Najczęstsze pytania</p>
          <h2>Warto wiedzieć przed wysłaniem zdjęć.</h2>
        </div>
        <Accordion type="single" collapsible className="faq-list">
          <AccordionItem value="one">
            <AccordionTrigger>Czy figurka powstaje całkowicie automatycznie?</AccordionTrigger>
            <AccordionContent>
              Nie. Narzędzia AI mogą pomóc stworzyć bazę modelu, ale przed
              drukiem sprawdzamy i poprawiamy geometrię, detale oraz podobieństwo.
              Projekt trafia do druku dopiero po akceptacji.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="two">
            <AccordionTrigger>Czy wystarczy jedno zdjęcie?</AccordionTrigger>
            <AccordionContent>
              Możemy zacząć od jednego zdjęcia, jednak ujęcia z przodu, boków i
              tyłu pozwalają wierniej odwzorować sylwetkę, fryzurę i ubranie.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="three">
            <AccordionTrigger>Czy mogę samodzielnie pomalować wydruk?</AccordionTrigger>
            <AccordionContent>
              Tak. Wariant do malowania otrzymujesz oczyszczony i przygotowany do
              nałożenia podkładu oraz farb modelarskich.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="four">
            <AccordionTrigger>Co dzieje się po wysłaniu formularza?</AccordionTrigger>
            <AccordionContent>
              Oglądamy zdjęcia, oceniamy poziom szczegółowości i przygotowujemy
              indywidualną wycenę. Sam formularz nie jest zamówieniem i nie wiąże
              się z płatnością.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="five">
            <AccordionTrigger>Czym różni się generator za 49 zł od bezpłatnej wyceny?</AccordionTrigger>
            <AccordionContent>
              Generator tworzy automatyczny plik cyfrowy w Meshy: otrzymujesz podgląd 3D,
              GLB i STL bez ręcznych poprawek oraz bez fizycznego wydruku. Formularz wyceny
              służy do zamówienia indywidualnie dopracowanej, drukowanej lub malowanej figurki.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <footer>
        <a className="brand footer-brand" href="#start">
          <span className="brand-mark" aria-hidden="true"><span>P</span><i>3D</i></span>
          <span className="brand-copy"><strong>PERSONA <em>3D</em></strong><small>FIGURKI Z TWOICH ZDJĘĆ</small></span>
        </a>
        <p>Osobiste figurki tworzone na podstawie Twoich fotografii.</p>
        <a href="/generator">Wygeneruj model za 49 zł <ArrowRight /></a>
      </footer>
    </main>
  );
}
