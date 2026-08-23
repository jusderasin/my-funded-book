import { ArrowRight, Play } from "lucide-react";

export const metadata = {
  title: "MyTradeBook — Le journal de trading des traders financés",
  description:
    "Logge chaque trade, respecte tes règles prop firm (daily loss, drawdown) et transforme tes stats en edge. Journal, Edge Score et analyse IA pour traders MFF, TopStep, Apex.",
  metadataBase: new URL("https://mytradebook.com"),
  openGraph: {
    title: "MyTradeBook — Le journal de trading des traders financés",
    description:
      "Le journal des traders prop firm : risk banner daily loss / drawdown, Edge Score et rapport IA.",
    type: "website",
    url: "https://mytradebook.com",
    siteName: "MyTradeBook",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyTradeBook — Le journal de trading des traders financés",
    description: "Le journal des traders financés : risk banner, Edge Score, rapport IA.",
  },
};

const CSS = `
@keyframes mtbRise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes mtbGlow{0%,100%{opacity:.55}50%{opacity:.9}}
.mtb-rise{animation:mtbRise .7s cubic-bezier(.22,1,.36,1) both}
.mtb-glow{animation:mtbGlow 6s ease-in-out infinite}
`;

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-white antialiased">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-line bg-ink/70 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <a href="/" className="font-mono text-lg font-extrabold tracking-[0.18em] text-white">
            My<span className="text-accent">Trade</span>Book
          </a>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden text-sm text-muted transition-colors hover:text-white sm:block">
              Connexion
            </a>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
            >
              Commencer <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-[calc(100svh-64px)] items-center px-5 py-20">
        {/* fond : dot grid + glow vert */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle,#2a2f3d_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_58%_52%_at_50%_34%,#000,transparent)] [-webkit-mask-image:radial-gradient(ellipse_58%_52%_at_50%_34%,#000,transparent)]" />
          <div className="mtb-glow absolute left-1/2 top-[-12%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-accent/10 blur-[130px]" />
        </div>

        <div className="relative mx-auto w-full max-w-4xl text-center">
          {/* pastille statut */}
          <div className="mtb-rise mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-4 py-1.5 text-sm text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            En bêta · NQ / MNQ
          </div>

          {/* titre */}
          <h1
            className="mtb-rise text-[clamp(2.5rem,7vw,4.75rem)] font-extrabold leading-[1.03] tracking-tight text-white"
            style={{ animationDelay: "80ms" }}
          >
            Le journal de trading<br className="hidden sm:block" />{" "}
            des traders <span className="text-accent">financés.</span>
          </h1>

          {/* sous-titre */}
          <p
            className="mtb-rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted"
            style={{ animationDelay: "160ms" }}
          >
            Logge chaque trade, respecte tes règles prop firm, transforme tes stats en edge.
          </p>

          {/* CTA */}
          <div
            className="mtb-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <a
              href="/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 font-bold text-black shadow-[0_0_30px_-8px_theme(colors.accent)] transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Commencer <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#demo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line2 bg-panel2 px-6 py-3.5 font-semibold text-white transition-colors hover:border-muted2 sm:w-auto"
            >
              <Play className="h-4 w-4" /> Voir la démo
            </a>
          </div>

          {/* mini KPI */}
          <div
            className="mtb-rise mx-auto mt-14 flex max-w-lg items-start justify-center gap-8 sm:gap-12"
            style={{ animationDelay: "320ms" }}
          >
            <div className="text-center">
              <div className="font-mono text-2xl font-extrabold text-white">13</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-muted2">Onglets</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-2xl font-extrabold text-accent">NQ·MNQ</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-muted2">Focus</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-2xl font-extrabold text-white">Edge</div>
              <div className="mt-1 text-[11px] uppercase tracking-widest text-muted2">Score</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
