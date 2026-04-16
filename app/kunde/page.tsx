"use client";

import { useEffect, useRef, useState } from "react";
import KundeMap from "@/components/kunde-map";

type Suggestion = {
  placeId: string;
  text: string;
  mainText: string;
  secondaryText: string;
};

type GoogleAutocompleteResponse = {
  suggestions?: Suggestion[];
  error?: string;
  details?: string;
};

type GooglePlaceResponse = {
  formattedAddress?: string;
  location?: {
    latitude?: number | null;
    longitude?: number | null;
  };
  error?: string;
  details?: string;
};

type DailyHoursOption =
  | "under-6"
  | "6-10"
  | "10-16"
  | "16-24"
  | "24-7";

type BoundaryTypeOption = "kabel" | "tradlos" | "";

type SlopeAreaOption =
  | "under-25"
  | "25-40"
  | "40-50"
  | "50-70"
  | "unknown";

type SlopeBoundaryOption =
  | "under-10"
  | "10-15"
  | "15-20"
  | "20-25"
  | "unknown";

const WEEK_DAYS = [
  { key: "mon", label: "Man" },
  { key: "tue", label: "Tir" },
  { key: "wed", label: "Ons" },
  { key: "thu", label: "Tor" },
  { key: "fri", label: "Fre" },
  { key: "sat", label: "Lør" },
  { key: "sun", label: "Søn" },
] as const;

type WeekDayKey = (typeof WEEK_DAYS)[number]["key"];

export default function KundePage() {
  const [started, setStarted] = useState(false);
  const [address, setAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
  } | null>(null);

  const [drawnAreaSquareMeters, setDrawnAreaSquareMeters] = useState(0);
  const [drawnPointsCount, setDrawnPointsCount] = useState(0);

  const [dailyHours, setDailyHours] = useState<DailyHoursOption | "">("");
  const [selectedDays, setSelectedDays] = useState<WeekDayKey[]>([]);
  const [boundaryType, setBoundaryType] = useState<BoundaryTypeOption>("");
  const [slopeArea, setSlopeArea] = useState<SlopeAreaOption | "">("");
  const [slopeBoundary, setSlopeBoundary] = useState<SlopeBoundaryOption | "">("");
  const [fullWifiCoverage, setFullWifiCoverage] = useState<"yes" | "no" | "unknown" | "">("");
  const [wants4G, setWants4G] = useState<"yes" | "no" | "unknown" | "">("");
  const [complexGarden, setComplexGarden] = useState<"yes" | "no" | "unknown" | "">("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement | null>(null);
  const skipNextAutocompleteRef = useRef(false);

  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsBoxRef.current &&
        !suggestionsBoxRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!started) return;

    if (skipNextAutocompleteRef.current) {
      skipNextAutocompleteRef.current = false;
      return;
    }

    setSelectedAddress("");
    setSelectedPlaceId("");
    setSelectedCoords(null);
    setDrawnAreaSquareMeters(0);
    setDrawnPointsCount(0);
    setErrorMessage("");

    const query = address.trim();

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    if (query.length < 3) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    autocompleteTimeoutRef.current = setTimeout(async () => {
      try {
        setIsLoadingSuggestions(true);

        const response = await fetch("/api/google/autocomplete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: query,
          }),
        });

        const data = (await response.json()) as GoogleAutocompleteResponse;

        if (!response.ok) {
          throw new Error(data?.error || "Autocomplete feilet.");
        }

        setSuggestions(data.suggestions ?? []);
        setShowSuggestions(true);
      } catch (error) {
        console.error(error);
        setSuggestions([]);
        setErrorMessage("Klarte ikke hente adresseforslag.");
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);
  }, [address, started]);

  async function selectSuggestion(suggestion: Suggestion) {
    try {
      setErrorMessage("");

      const response = await fetch("/api/google/place", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placeId: suggestion.placeId,
        }),
      });

      const data = (await response.json()) as GooglePlaceResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Klarte ikke hente valgt adresse.");
      }

      skipNextAutocompleteRef.current = true;
      setAddress(data.formattedAddress || suggestion.text);
      setSelectedAddress(data.formattedAddress || suggestion.text);
      setSelectedPlaceId(suggestion.placeId);
      setSelectedCoords({
        latitude: data.location?.latitude ?? null,
        longitude: data.location?.longitude ?? null,
      });
      setDrawnAreaSquareMeters(0);
      setDrawnPointsCount(0);
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (error) {
      console.error(error);
      setErrorMessage("Klarte ikke hente valgt adresse.");
    }
  }

  function resetFlow() {
    setStarted(false);
    setAddress("");
    setSelectedAddress("");
    setSelectedPlaceId("");
    setSelectedCoords(null);
    setDrawnAreaSquareMeters(0);
    setDrawnPointsCount(0);
    setDailyHours("");
    setSelectedDays([]);
    setBoundaryType("");
    setSlopeArea("");
    setSlopeBoundary("");
    setFullWifiCoverage("");
    setWants4G("");
    setComplexGarden("");
    setSuggestions([]);
    setShowSuggestions(false);
    setErrorMessage("");
  }

  function toggleDay(day: WeekDayKey) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day]
    );
  }

  const hasValidLawnDrawing =
    drawnPointsCount >= 3 && drawnAreaSquareMeters > 0;

  const canContinueToRecommendations =
    hasValidLawnDrawing &&
    dailyHours !== "" &&
    selectedDays.length > 0 &&
    boundaryType !== "" &&
    slopeArea !== "" &&
    slopeBoundary !== "";

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 sm:text-xs">
            Husqvarna Automower
          </p>

          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Finn riktig robotklipper
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-600 sm:text-base">
            Tegn inn plenen din på kart, svar på noen enkle spørsmål og få forslag
            til riktig robotklipper – med eller uten montering.
          </p>

          {!started ? (
            <>
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
                  onClick={() => setStarted(true)}
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
            </>
          ) : (
            <div className="mt-8 space-y-6">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Steg 1
                </p>
                <h2 className="mt-1 text-lg font-semibold sm:text-xl">
                  Finn adressen din
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  Begynn å skrive adressen din og velg riktig forslag.
                </p>

                <div className="mt-4" ref={suggestionsBoxRef}>
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-neutral-700">
                      Adresse
                    </span>

                    <div className="relative">
                      <input
                        value={address}
                        onChange={(e) => {
                          skipNextAutocompleteRef.current = false;
                          setAddress(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => {
                          if (suggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                        placeholder="Eks. Storgata 1, 7170 Åfjord"
                        autoComplete="off"
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                      />

                      {showSuggestions &&
                      (suggestions.length > 0 || isLoadingSuggestions) ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-lg">
                          {isLoadingSuggestions ? (
                            <div className="px-4 py-3 text-sm text-neutral-500">
                              Søker adresser...
                            </div>
                          ) : (
                            suggestions.map((suggestion) => (
                              <button
                                key={suggestion.placeId}
                                type="button"
                                onClick={() => void selectSuggestion(suggestion)}
                                className="block w-full border-b border-neutral-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-neutral-50"
                              >
                                <div className="text-sm font-medium text-neutral-900">
                                  {suggestion.mainText || suggestion.text}
                                </div>
                                {suggestion.secondaryText ? (
                                  <div className="mt-1 text-xs text-neutral-500">
                                    {suggestion.secondaryText}
                                  </div>
                                ) : null}
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  </label>
                </div>

                {errorMessage ? (
                  <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
                ) : null}

                {selectedAddress ? (
                  <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-semibold text-green-800">
                      Valgt adresse
                    </p>
                    <p className="mt-1 text-sm text-green-700">{selectedAddress}</p>
                    {selectedCoords?.latitude != null &&
                    selectedCoords?.longitude != null ? (
                      <p className="mt-2 text-xs text-green-700">
                        Koordinater: {selectedCoords.latitude.toFixed(6)},{" "}
                        {selectedCoords.longitude.toFixed(6)}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="text-sm text-neutral-600">
                      Når adressen er valgt, viser vi kartutsnitt av eiendommen.
                    </p>
                  </div>
                )}
              </div>

              {selectedCoords?.latitude != null && selectedCoords?.longitude != null ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Steg 2
                  </p>
                  <h2 className="mt-1 text-lg font-semibold sm:text-xl">
                    Tegn inn plenen din
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600">
                    Klikk rundt plenområdet direkte i kartet. Vi regner arealet automatisk.
                  </p>

                  <div className="mt-4">
                    <KundeMap
                      latitude={selectedCoords.latitude}
                      longitude={selectedCoords.longitude}
                      onAreaChange={(areaSquareMeters, pointsCount) => {
                        setDrawnAreaSquareMeters(areaSquareMeters);
                        setDrawnPointsCount(pointsCount);
                      }}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-neutral-700">
                        Registrert plenareal
                      </span>
                      <span className="text-lg font-bold text-neutral-900">
                        {hasValidLawnDrawing
                          ? `${new Intl.NumberFormat("nb-NO", {
                              maximumFractionDigits: 0,
                            }).format(drawnAreaSquareMeters)} m²`
                          : "-"}
                      </span>
                    </div>

                    {!hasValidLawnDrawing ? (
                      <p className="mt-2 text-sm text-neutral-600">
                        Sett minst 3 punkter i kartet for å beregne arealet.
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-neutral-600">
                        Arealet er klart. Neste steg blir spørsmål om bruksmønster og ønsket løsning.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {hasValidLawnDrawing ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Steg 3
                  </p>
                  <h2 className="mt-1 text-lg font-semibold sm:text-xl">
                    Fortell litt om hagen og bruken
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600">
                    Dette hjelper oss å foreslå riktige modeller. Hvis du er usikker på helling,
                    kan du fortsatt velge ukjent og få forslag.
                  </p>

                  <div className="mt-4 space-y-5">
                    <Field label="Hvor mange timer per døgn kan klipperen gå?">
                      <select
                        value={dailyHours}
                        onChange={(e) => setDailyHours(e.target.value as DailyHoursOption | "")}
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                      >
                        <option value="">Velg</option>
                        <option value="under-6">Under 6 timer</option>
                        <option value="6-10">6–10 timer</option>
                        <option value="10-16">10–16 timer</option>
                        <option value="16-24">16–24 timer</option>
                        <option value="24-7">Hele døgnet / 24-7</option>
                      </select>
                    </Field>

                    <div>
                      <span className="mb-2 block text-sm font-medium text-neutral-700">
                        Hvilke dager i uka kan klipperen gå?
                      </span>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                        {WEEK_DAYS.map((day) => {
                          const selected = selectedDays.includes(day.key);

                          return (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => toggleDay(day.key)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                                selected
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Field label="Ønsker du kabel eller kabel-fri løsning?">
                      <select
                        value={boundaryType}
                        onChange={(e) => setBoundaryType(e.target.value as BoundaryTypeOption)}
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                      >
                        <option value="">Velg</option>
                        <option value="kabel">Kabel</option>
                        <option value="tradlos">Kabel-fri / trådløs</option>
                      </select>
                    </Field>

                    <Field label="Bratteste punkt i klippeområdet">
                      <select
                        value={slopeArea}
                        onChange={(e) => setSlopeArea(e.target.value as SlopeAreaOption | "")}
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                      >
                        <option value="">Velg</option>
                        <option value="under-25">Under 25 %</option>
                        <option value="25-40">25–40 %</option>
                        <option value="40-50">40–50 %</option>
                        <option value="50-70">50–70 %</option>
                        <option value="unknown">Vet ikke</option>
                      </select>
                    </Field>

                    <Field label="Bratteste punkt langs kabel / ytterkant">
                      <select
                        value={slopeBoundary}
                        onChange={(e) =>
                          setSlopeBoundary(e.target.value as SlopeBoundaryOption | "")
                        }
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                      >
                        <option value="">Velg</option>
                        <option value="under-10">Under 10 %</option>
                        <option value="10-15">10–15 %</option>
                        <option value="15-20">15–20 %</option>
                        <option value="20-25">20–25 %</option>
                        <option value="unknown">Vet ikke</option>
                      </select>
                    </Field>

                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                      Hvis du er usikker på helling, kan du måle med mobilen ved å bruke en
                      helningsapp / vater-app. Du kan også velge “vet ikke”, så får du
                      fortsatt forslag.
                    </div>

                    <Field label="Har du god WiFi-dekning i hele hagen?">
                      <select
                        value={fullWifiCoverage}
                        onChange={(e) =>
                          setFullWifiCoverage(
                            e.target.value as "yes" | "no" | "unknown" | ""
                          )
                        }
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                      >
                        <option value="">Velg</option>
                        <option value="yes">Ja</option>
                        <option value="no">Nei</option>
                        <option value="unknown">Usikker</option>
                      </select>
                    </Field>

                    <Field label="Ønsker du 4G?">
                      <select
                        value={wants4G}
                        onChange={(e) =>
                          setWants4G(e.target.value as "yes" | "no" | "unknown" | "")
                        }
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                      >
                        <option value="">Velg</option>
                        <option value="yes">Ja</option>
                        <option value="no">Nei</option>
                        <option value="unknown">Usikker</option>
                      </select>
                    </Field>

                    <Field label="Har hagen smale passasjer eller er den komplisert?">
                      <select
                        value={complexGarden}
                        onChange={(e) =>
                          setComplexGarden(
                            e.target.value as "yes" | "no" | "unknown" | ""
                          )
                        }
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                      >
                        <option value="">Velg</option>
                        <option value="yes">Ja</option>
                        <option value="no">Nei</option>
                        <option value="unknown">Usikker</option>
                      </select>
                    </Field>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={!canContinueToRecommendations}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-neutral-900 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Videre
                </button>

                <button
                  type="button"
                  onClick={resetFlow}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                >
                  Tilbake
                </button>
              </div>
            </div>
          )}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}