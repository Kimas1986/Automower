"use client";

import { useEffect, useMemo, useState } from "react";
import { models } from "@/data/models";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function Page() {
  const sortedModels = useMemo(() => {
    return [...models].sort((a, b) => parseArea(a.area) - parseArea(b.area));
  }, []);

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const ios =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error iOS Safari
        window.navigator.standalone === true;

      setIsStandalone(standalone);
      return standalone;
    };

    setIsIOS(ios);
    checkStandalone();

    const media = window.matchMedia("(display-mode: standalone)");
    const mediaHandler = () => checkStandalone();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", mediaHandler);
    } else if (typeof media.addListener === "function") {
      media.addListener(mediaHandler);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);

      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", mediaHandler);
      } else if (typeof media.removeListener === "function") {
        media.removeListener(mediaHandler);
      }
    };
  }, []);

  async function handleInstall() {
    if (isStandalone) return;

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;

        if (choice.outcome === "accepted") {
          setShowInstallHelp(false);
        }

        setDeferredPrompt(null);
      } catch {
        if (isIOS) {
          setShowInstallHelp(true);
        }
      }
      return;
    }

    if (isIOS) {
      setShowInstallHelp((prev) => !prev);
    }
  }

  const showInstallButton = !isStandalone && (isIOS || !!deferredPrompt);
  const showIOSHelp = !isStandalone && isIOS && showInstallHelp;

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 sm:text-xs">
                Husqvarna Automower oppslag
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
                WiFi, 4G og RS1
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-base">
                Enkel forklaring for kundedialog. Laget for rask bruk på mobil.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="/kalkulator"
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  Monteringskalkulator
                </a>

                <a
                  href="/kunde"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                >
                  Finn riktig klipper
                </a>
              </div>
            </div>

            {showInstallButton ? (
              <div className="flex w-full max-w-sm flex-col gap-2">
                <button
                  onClick={handleInstall}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                >
                  Installer app
                </button>

                {showIOSHelp ? (
                  <div className="rounded-2xl border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
                    <div className="space-y-2">
                      <p className="font-semibold">iPhone / iPad</p>
                      <p>1. Åpne siden i Safari</p>
                      <p>2. Trykk Del</p>
                      <p>3. Velg «Legg til på Hjem-skjerm»</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniExplainCard
              title="WiFi"
              text="WiFi brukes til app og skytilkobling. Noen modeller trenger fortsatt ekstrautstyr for kabel-fri drift."
            />
            <MiniExplainCard
              title="4G"
              text="4G gir app og skytilkobling via mobilnett. På enkelte modeller kreves Plug-in eller Connect-kort."
            />
            <MiniExplainCard
              title="RS1"
              text="RS1 er referansestasjon for ekstra stabil kabel-fri drift. Ikke alltid nødvendig ved god skytilkobling."
            />
          </div>

          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <h2 className="text-base font-semibold sm:text-lg">
              Viktige spørsmål til kunden
            </h2>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <QuestionCard
                title="1. Har du WiFi?"
                text="Hvis ja, neste spørsmål er om dekningen faktisk er god nok ute i hagen."
              />
              <QuestionCard
                title="2. Har du WiFi-dekning i hele hagen?"
                text="God dekning gjør cloud-løsninger mer stabile og kan redusere behovet for ekstrautstyr."
              />
              <QuestionCard
                title="3. Hvis nei på WiFi-dekning"
                text="Da må du vurdere 4G / Connect eller RS1 avhengig av modell og ønsket løsning."
              />
              <QuestionCard
                title="4. Hva betyr det i praksis?"
                text="Noen modeller er kabel som standard og må bygges om for kabel-fri drift. Sjekk alltid modellkortet."
              />
            </div>

            <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-3">
              <p className="text-sm text-neutral-700">
                <span className="font-semibold">Tips:</span> NERA-modeller kan ofte
                bygges om til kabel-fri drift, men det kan kreve Plug-in modul,
                Connect-kort eller RS1 avhengig av modell og dekning.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-3">
            <h2 className="text-lg font-semibold sm:text-xl">Modeller</h2>
            <p className="text-sm text-neutral-600">
              {sortedModels.length} modeller • sortert etter arealkapasitet
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedModels.map((model) => (
              <article
                key={model.id}
                className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge>{model.category}</Badge>
                </div>

                <h3 className="text-lg font-bold leading-tight sm:text-xl">{model.name}</h3>
                <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
                  Art.nr: {model.articleNumber}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <StatusCard title="WiFi" value={model.wifiStatus} />
                  <StatusCard title="4G" value={model.fourGStatus} />
                  <StatusCard title="RS1" value={model.rs1Status} />
                </div>

                <div className="mt-4 rounded-2xl bg-neutral-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Kort forklart
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">{model.notes}</p>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <CompactRow label="Område" value={model.area} />
                  <CompactRow label="Helling" value={model.slope} />
                  <CompactRow label="Grenseledning" value={model.maxSlopeBoundary} />
                  <CompactRow label="Aktiv tid" value={model.maxActiveTime} />
                  <CompactRow label="Guidekabler" value={model.guideCables} />
                  <CompactRow label="Pr. lading" value={model.mowingTimePerCharge} />
                  <CompactRow label="Strøm / mnd" value={model.powerUsePerMonth} />
                  <CompactRow label="Tilkobling" value={model.connectivity} />
                  <CompactRow label="GPS-sporing" value={model.gpsTheftTracking} />
                  <CompactRow label="PIN" value={model.pinCode} />
                  <CompactRow label="Alarm" value={model.alarm} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function parseArea(area: string): number {
  const digits = area.replace(/\s/g, "").match(/\d+/g);
  if (!digits) return 0;
  return Number(digits.join(""));
}

function MiniExplainCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{text}</p>
    </div>
  );
}

function QuestionCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{text}</p>
    </div>
  );
}

function StatusCard({ title, value }: { title: string; value: string }) {
  const styles =
    value === "Standard"
      ? "bg-emerald-100 text-emerald-700"
      : value === "Tilbehør"
        ? "bg-amber-100 text-amber-700"
        : "bg-neutral-200 text-neutral-700";

  return (
    <div className="rounded-2xl border border-neutral-200 p-2 text-center sm:p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 sm:text-xs">
        {title}
      </p>
      <div
        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs ${styles}`}
      >
        {value}
      </div>
    </div>
  );
}

function CompactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-neutral-100 px-3 py-2">
      <span className="text-neutral-500">{label}</span>
      <span className="max-w-[55%] text-right font-medium">{value}</span>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-700 sm:text-xs">
      {children}
    </span>
  );
}