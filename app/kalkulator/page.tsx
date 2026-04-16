"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const BASE_ADDRESS = "Joakim Brevolds Allé 4, 7170 Åfjord";

const HOURLY_RATE = 1070;
const KM_RATE = 8.75;
const BASE_DRIVING_PRICE = 125;
const CABLE_PRICE = 12;

const FOUR_G_SMALL_PRICE = 2990;
const FOUR_G_PLUGIN_PRICE = 5399;
const RS1_PRICE = 3799;

type ModelConfig = {
  name: string;
  baseHours: number;
  fourGType: "small" | "plugin" | "none" | "built-in";
  rs1Allowed: boolean;
  cableAllowed: boolean;
};

const MODEL_CONFIGS: ModelConfig[] = [
  {
    name: "Aspire R4",
    baseHours: 3,
    fourGType: "none",
    rs1Allowed: false,
    cableAllowed: true,
  },
  {
    name: "305",
    baseHours: 3,
    fourGType: "small",
    rs1Allowed: false,
    cableAllowed: true,
  },
  {
    name: "315 Mk II",
    baseHours: 3.5,
    fourGType: "small",
    rs1Allowed: false,
    cableAllowed: true,
  },

  {
    name: "Aspire R6V",
    baseHours: 2.5,
    fourGType: "small",
    rs1Allowed: true,
    cableAllowed: false,
  },
  {
    name: "308V",
    baseHours: 2.5,
    fourGType: "small",
    rs1Allowed: true,
    cableAllowed: false,
  },
  {
    name: "312V",
    baseHours: 2.5,
    fourGType: "small",
    rs1Allowed: true,
    cableAllowed: false,
  },

  {
    name: "305E NERA",
    baseHours: 3,
    fourGType: "small",
    rs1Allowed: true,
    cableAllowed: true,
  },
  {
    name: "310E NERA",
    baseHours: 3,
    fourGType: "small",
    rs1Allowed: true,
    cableAllowed: true,
  },
  {
    name: "320 NERA",
    baseHours: 3.5,
    fourGType: "plugin",
    rs1Allowed: true,
    cableAllowed: true,
  },
  {
    name: "430X NERA",
    baseHours: 3.5,
    fourGType: "plugin",
    rs1Allowed: true,
    cableAllowed: true,
  },

  {
    name: "405VE NERA",
    baseHours: 3,
    fourGType: "built-in",
    rs1Allowed: true,
    cableAllowed: false,
  },
  {
    name: "410VE NERA",
    baseHours: 3,
    fourGType: "built-in",
    rs1Allowed: true,
    cableAllowed: false,
  },
  {
    name: "430V NERA",
    baseHours: 3.5,
    fourGType: "built-in",
    rs1Allowed: true,
    cableAllowed: false,
  },
  {
    name: "435X AWD NERA",
    baseHours: 4,
    fourGType: "built-in",
    rs1Allowed: true,
    cableAllowed: false,
  },
  {
    name: "450V NERA",
    baseHours: 4,
    fourGType: "built-in",
    rs1Allowed: true,
    cableAllowed: false,
  },

  {
    name: "520 EPOS",
    baseHours: 3.5,
    fourGType: "built-in",
    rs1Allowed: true,
    cableAllowed: false,
  },
  {
    name: "535 AWD EPOS",
    baseHours: 4,
    fourGType: "built-in",
    rs1Allowed: true,
    cableAllowed: false,
  },
  {
    name: "560 EPOS",
    baseHours: 4.5,
    fourGType: "built-in",
    rs1Allowed: true,
    cableAllowed: false,
  },
  {
    name: "580 EPOS",
    baseHours: 4.5,
    fourGType: "built-in",
    rs1Allowed: true,
    cableAllowed: false,
  },
];

type DistanceResult = {
  km: number;
  minutes: number;
  source: string;
};

type GoogleRouteResponse = {
  distanceMeters?: number;
  distanceKm?: number;
  durationSeconds?: number;
  durationMinutes?: number;
  error?: string;
  details?: string;
};

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

type PrefillState = {
  areaText: string;
  boundaryType: string;
  mowingPattern: string;
  wifi: string;
  wants4G: string;
  complexGarden: string;
};

export default function KalkulatorPage() {
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [cableMeters, setCableMeters] = useState("0");
  const [addFourG, setAddFourG] = useState(false);
  const [addRS1, setAddRS1] = useState(false);
  const [manualHours, setManualHours] = useState("");

  const [prefill, setPrefill] = useState<PrefillState>({
    areaText: "",
    boundaryType: "",
    mowingPattern: "",
    wifi: "",
    wants4G: "",
    complexGarden: "",
  });

  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [distanceError, setDistanceError] = useState("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [isSelectingSuggestion, setIsSelectingSuggestion] = useState(false);

  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const suggestionsBoxRef = useRef<HTMLDivElement | null>(null);
  const skipNextAutocompleteRef = useRef(false);
  const hasPrefilledFromQueryRef = useRef(false);

  const modelConfig = useMemo(
    () => MODEL_CONFIGS.find((m) => m.name === selectedModel) ?? null,
    [selectedModel]
  );

  const cableAllowed = modelConfig?.cableAllowed ?? false;
  const cableMetersNumber = cableAllowed
    ? Math.max(0, Number(cableMeters.replace(",", ".")) || 0)
    : 0;

  const overriddenHours = Number(manualHours.replace(",", ".")) || 0;

  const fourGAllowed =
    modelConfig?.fourGType === "small" || modelConfig?.fourGType === "plugin";
  const fourGBuiltIn = modelConfig?.fourGType === "built-in";
  const rs1Allowed = modelConfig?.rs1Allowed ?? false;

  const effectiveAddFourG = fourGAllowed ? addFourG : false;
  const effectiveAddRS1 = rs1Allowed ? addRS1 : false;

  const baseHours = modelConfig?.baseHours ?? 0;
  const extraHours =
    (effectiveAddFourG ? 1 : 0) +
    0;

  const totalHours =
    overriddenHours > 0 ? overriddenHours : baseHours + extraHours;

  const drivingCost = distance ? BASE_DRIVING_PRICE + distance.km * KM_RATE : 0;
  const laborCost = totalHours * HOURLY_RATE;
  const cableCost = cableMetersNumber * CABLE_PRICE;

  const fourGProductCost =
    modelConfig?.fourGType === "small" && effectiveAddFourG
      ? FOUR_G_SMALL_PRICE
      : modelConfig?.fourGType === "plugin" && effectiveAddFourG
        ? FOUR_G_PLUGIN_PRICE
        : 0;

  const rs1ProductCost = effectiveAddRS1 ? RS1_PRICE : 0;

  const installationAndDrivingTotal = drivingCost + laborCost;
  const accessoriesTotal = cableCost + fourGProductCost + rs1ProductCost;
  const totalPrice = installationAndDrivingTotal + accessoriesTotal;

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
    if (hasPrefilledFromQueryRef.current) {
      return;
    }

    hasPrefilledFromQueryRef.current = true;

    const params = new URLSearchParams(window.location.search);

    const address = params.get("address") ?? "";
    const model = params.get("model") ?? "";
    const area = params.get("area") ?? "";
    const boundaryType = params.get("boundaryType") ?? "";
    const mowingPattern = params.get("mowingPattern") ?? "";
    const wifi = params.get("wifi") ?? "";
    const wants4GQuery = params.get("wants4G") ?? "";
    const complexGarden = params.get("complexGarden") ?? "";
    const cableMetersQuery = params.get("cableMeters") ?? "";

    if (address) {
      skipNextAutocompleteRef.current = true;
      setCustomerAddress(address);
    }

    if (model && MODEL_CONFIGS.some((item) => item.name === model)) {
      setSelectedModel(model);
      resetOptionalChoices(model);
    }

    if (cableMetersQuery) {
      setCableMeters(cableMetersQuery);
    }

    setPrefill({
      areaText: area,
      boundaryType,
      mowingPattern,
      wifi,
      wants4G: wants4GQuery,
      complexGarden,
    });

    const prefilledModel =
      model && MODEL_CONFIGS.some((item) => item.name === model)
        ? MODEL_CONFIGS.find((item) => item.name === model) ?? null
        : null;

    const prefilledFourGAllowed =
      prefilledModel?.fourGType === "small" ||
      prefilledModel?.fourGType === "plugin";

    if (wants4GQuery === "yes" && prefilledFourGAllowed) {
      setAddFourG(true);
    }
  }, []);

  useEffect(() => {
    if (isSelectingSuggestion) {
      return;
    }

    if (skipNextAutocompleteRef.current) {
      skipNextAutocompleteRef.current = false;
      return;
    }

    setSelectedPlaceId("");
    setDistance(null);
    setDistanceError("");

    const query = customerAddress.trim();

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
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);
  }, [customerAddress, isSelectingSuggestion]);

  useEffect(() => {
    if (!cableAllowed) {
      setCableMeters("0");
    }
  }, [cableAllowed]);

  async function selectSuggestion(suggestion: Suggestion) {
    try {
      setIsSelectingSuggestion(true);
      setDistance(null);
      setDistanceError("");

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
      setCustomerAddress(data.formattedAddress || suggestion.text);
      setSelectedPlaceId(suggestion.placeId);
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (error) {
      console.error(error);
      setDistanceError("Klarte ikke hente valgt adresse.");
    } finally {
      setIsSelectingSuggestion(false);
    }
  }

  async function calculateDistance() {
    setDistanceError("");
    setDistance(null);

    if (!customerAddress.trim()) {
      setDistanceError("Skriv inn kundens adresse først.");
      return;
    }

    setIsCalculatingDistance(true);

    try {
      const response = await fetch("/api/google/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originAddress: BASE_ADDRESS,
          destinationAddress: customerAddress,
        }),
      });

      const data = (await response.json()) as GoogleRouteResponse;

      if (!response.ok) {
        throw new Error(data?.error || "Klarte ikke beregne rute.");
      }

      const km = Number(data.distanceKm ?? 0);
      const minutes = Number(data.durationMinutes ?? 0);

      if (!Number.isFinite(km) || km <= 0) {
        throw new Error("Ugyldig avstand fra Google.");
      }

      setDistance({
        km,
        minutes,
        source: "Google Routes",
      });
    } catch (error) {
      console.error(error);
      setDistanceError(
        "Klarte ikke beregne avstand. Sjekk adressen og prøv igjen."
      );
    } finally {
      setIsCalculatingDistance(false);
    }
  }

  function resetOptionalChoices(nextModelName: string) {
    const next = MODEL_CONFIGS.find((m) => m.name === nextModelName);

    if (!next) {
      setAddFourG(false);
      setAddRS1(false);
      setCableMeters("0");
      return;
    }

    if (!(next.fourGType === "small" || next.fourGType === "plugin")) {
      setAddFourG(false);
    }

    if (!next.rs1Allowed) {
      setAddRS1(false);
    }

    if (!next.cableAllowed) {
      setCableMeters("0");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8">
        <section className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 sm:text-xs">
            Husqvarna Automower
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
            Monteringskalkulator
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-base">
            Pris inkl. mva basert på modell, adresse, arbeidstid, kabel, 4G og
            RS1.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              Tilbake til oppslag
            </a>

            <a
              href="/kunde"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              Tilbake til kundeveileder
            </a>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold sm:text-xl">Inndata</h2>

            {prefill.areaText ||
            prefill.boundaryType ||
            prefill.mowingPattern ||
            prefill.wifi ||
            prefill.wants4G ||
            prefill.complexGarden ? (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold">Hentet fra kundeveilederen</p>
                <div className="mt-2 space-y-1">
                  {prefill.areaText ? <p>Areal: {prefill.areaText} m²</p> : null}
                  {prefill.boundaryType ? (
                    <p>
                      Løsning:{" "}
                      {prefill.boundaryType === "kabel"
                        ? "Kabel"
                        : prefill.boundaryType === "tradlos"
                          ? "Kabel-fri / trådløs"
                          : prefill.boundaryType}
                    </p>
                  ) : null}
                  {prefill.mowingPattern ? (
                    <p>
                      Klippemønster:{" "}
                      {prefill.mowingPattern === "systematic"
                        ? "Systematisk"
                        : prefill.mowingPattern === "irregular"
                          ? "Uregelmessig"
                          : prefill.mowingPattern === "unknown"
                            ? "Vet ikke"
                            : prefill.mowingPattern}
                    </p>
                  ) : null}
                  {prefill.wifi ? (
                    <p>
                      WiFi i hagen:{" "}
                      {prefill.wifi === "yes"
                        ? "Ja"
                        : prefill.wifi === "no"
                          ? "Nei"
                          : prefill.wifi === "unknown"
                            ? "Usikker"
                            : prefill.wifi}
                    </p>
                  ) : null}
                  {prefill.wants4G ? (
                    <p>
                      Ønske om 4G:{" "}
                      {prefill.wants4G === "yes"
                        ? "Ja"
                        : prefill.wants4G === "no"
                          ? "Nei"
                          : prefill.wants4G === "unknown"
                            ? "Usikker"
                            : prefill.wants4G}
                    </p>
                  ) : null}
                  {prefill.complexGarden ? (
                    <p>
                      Komplisert hage:{" "}
                      {prefill.complexGarden === "yes"
                        ? "Ja"
                        : prefill.complexGarden === "no"
                          ? "Nei"
                          : prefill.complexGarden === "unknown"
                            ? "Usikker"
                            : prefill.complexGarden}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-4">
              <Field label="Kundens adresse">
                <div className="relative" ref={suggestionsBoxRef}>
                  <input
                    value={customerAddress}
                    onChange={(e) => {
                      skipNextAutocompleteRef.current = false;
                      setCustomerAddress(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder="Eks. Storgata 1, 7170 Åfjord"
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                    autoComplete="off"
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
              </Field>

              <div>
                <button
                  onClick={calculateDistance}
                  disabled={isCalculatingDistance || !customerAddress.trim()}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCalculatingDistance
                    ? "Beregner avstand..."
                    : "Beregn avstand"}
                </button>

                {distance ? (
                  <div className="mt-2 space-y-1 text-sm text-neutral-700">
                    <p>
                      Avstand:{" "}
                      <span className="font-semibold">
                        {distance.km.toFixed(1)} km
                      </span>
                    </p>
                    <p>
                      Kjøretid:{" "}
                      <span className="font-semibold">
                        {distance.minutes.toFixed(0)} min
                      </span>
                    </p>
                    <p className="text-neutral-500">{distance.source}</p>
                  </div>
                ) : null}

                {distanceError ? (
                  <p className="mt-2 text-sm text-red-600">{distanceError}</p>
                ) : null}

                {selectedPlaceId ? (
                  <p className="mt-2 text-xs text-green-700">
                    Adresse valgt fra Google-forslag.
                  </p>
                ) : customerAddress.trim().length >= 3 ? (
                  <p className="mt-2 text-xs text-neutral-500">
                    Velg gjerne et forslag for mest presis adresse.
                  </p>
                ) : null}
              </div>

              <Field label="Modell">
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const nextModel = e.target.value;
                    setSelectedModel(nextModel);
                    resetOptionalChoices(nextModel);
                    setManualHours("");
                  }}
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                >
                  <option value="">Velg modell</option>
                  {MODEL_CONFIGS.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </Field>

              {cableAllowed ? (
                <Field label="Kabel (meter)">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={cableMeters}
                    onChange={(e) => setCableMeters(e.target.value)}
                    className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                  />
                </Field>
              ) : null}

              <Field label="Standard monteringstid">
                <input
                  value={
                    modelConfig
                      ? `${formatHours(baseHours)} t${extraHours > 0 ? ` + ${extraHours} t ekstrautstyr` : ""}`
                      : ""
                  }
                  readOnly
                  placeholder="Velg modell først"
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3 text-sm text-neutral-700 outline-none"
                />
              </Field>

              <Field label="Manuell overstyring av timer (valgfritt)">
                <input
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  placeholder="Eks. 4,5"
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard
                  title="4G / Connect / Plugin"
                  disabled={!modelConfig || !fourGAllowed}
                  checked={effectiveAddFourG}
                  onChange={setAddFourG}
                  note={
                    !modelConfig
                      ? "Velg modell først"
                      : fourGBuiltIn
                        ? "4G er standard på denne modellen"
                        : fourGAllowed
                          ? "Legger til produktpris + 1 time jobb"
                          : "Ikke aktuelt for denne modellen"
                  }
                />

                <OptionCard
                  title="RS1"
                  disabled={!modelConfig || !rs1Allowed}
                  checked={effectiveAddRS1}
                  onChange={setAddRS1}
                  note={
                    !modelConfig
                      ? "Velg modell først"
                      : rs1Allowed
                        ? "Legger kun til produktpris"
                        : "Ikke aktuelt for denne modellen"
                  }
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold sm:text-xl">Oppsummering</h2>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Montering og kjøring
              </p>

              <div className="mt-3 space-y-2 text-sm">
                <SummaryRow label="Baseadresse" value={BASE_ADDRESS} />
                <SummaryRow label="Modell" value={selectedModel || "-"} />
                <SummaryRow
                  label="Avstand"
                  value={distance ? `${distance.km.toFixed(1)} km` : "-"}
                />
                <SummaryRow
                  label="Arbeidstid"
                  value={totalHours > 0 ? `${formatHours(totalHours)} t` : "-"}
                />
                <SummaryRow label="Kjøring" value={formatCurrency(drivingCost)} />
                <SummaryRow label="Arbeid" value={formatCurrency(laborCost)} />
              </div>

              <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-semibold">
                    Sum montering og kjøring
                  </span>
                  <span className="text-xl font-bold">
                    {formatCurrency(installationAndDrivingTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Tilbehør
              </p>

              <div className="mt-3 space-y-2 text-sm">
                {cableAllowed ? (
                  <>
                    <SummaryRow label="Kabel" value={`${cableMetersNumber} m`} />
                    <SummaryRow
                      label="Kabelkostnad"
                      value={formatCurrency(cableCost)}
                    />
                  </>
                ) : (
                  <SummaryRow label="Kabel" value="Ikke aktuelt" />
                )}

                <SummaryRow
                  label="4G / plugin"
                  value={formatCurrency(fourGProductCost)}
                />
                <SummaryRow label="RS1" value={formatCurrency(rs1ProductCost)} />
              </div>

              <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-base font-semibold">Sum tilbehør</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(accessoriesTotal)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-base font-semibold">Total inkl. mva</span>
                <span className="text-xl font-bold">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Regler
              </p>
              <div className="mt-2 space-y-1 text-sm text-neutral-700">
                <p>
                  Oppmøte / grunnpris kjøring: {formatCurrency(BASE_DRIVING_PRICE)}
                </p>
                <p>Kjøring: {formatCurrency(KM_RATE)} / km</p>
                <p>Timepris: {formatCurrency(HOURLY_RATE)} / t</p>
                <p>Kabel: {formatCurrency(CABLE_PRICE)} / m</p>
                <p>
                  4G småmodeller / plugin: {formatCurrency(FOUR_G_SMALL_PRICE)} /
                  {formatCurrency(FOUR_G_PLUGIN_PRICE)} + 1 t der det ikke er standard
                </p>
                <p>RS1: {formatCurrency(RS1_PRICE)} uten ekstra tid</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
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
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function OptionCard({
  title,
  note,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  note: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`block rounded-2xl border p-4 transition ${
        disabled
          ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400"
          : "cursor-pointer border-neutral-300 bg-white hover:border-neutral-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm">{note}</p>
        </div>

        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
      </div>
    </label>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-neutral-100 px-3 py-2">
      <span className="text-neutral-500">{label}</span>
      <span className="max-w-[60%] text-right font-medium">{value}</span>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatHours(value: number) {
  return value.toString().replace(".", ",");
}