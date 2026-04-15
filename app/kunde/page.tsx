export default function KundePage() {
  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 sm:text-xs">
            Husqvarna Automower
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Finn riktig robotklipper
          </h1>

          <p className="mt-4 text-sm leading-7 text-neutral-600 sm:text-base">
            Tegn inn plenen din på kart, svar på noen enkle spørsmål og få forslag
            til riktig robotklipper – med eller uten montering.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <InfoCard
              title="1. Finn adresse"
              text="Søk opp boligen din og zoom rett inn på eiendommen."
            />
            <InfoCard
              title="2. Tegn plen"
              text="Marker plenområdene på kartet og få automatisk areal."
            />
            <InfoCard
              title="3. Få forslag"
              text="Vi anbefaler modeller som passer hagen din."
            />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-neutral-900 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800"
              type="button"
            >
              Start
            </button>

            <a
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              Tilbake
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
    </div>
  );
}