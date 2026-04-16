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
    setSuggestions([]);
    setShowSuggestions(false);
    setErrorMessage("");
  }

  const hasValidLawnDrawing =
    drawnPointsCount >= 3 && drawnAreaSquareMeters > 0;

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

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={!hasValidLawnDrawing}
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