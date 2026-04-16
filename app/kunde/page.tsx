"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import KundeMap from "@/components/kunde-map";
import { models, type Model } from "@/data/models";

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

type MowingPatternOption = "systematic" | "irregular" | "unknown";

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

type RecommendedModel = {
  model: Model;
  reason: string;
};

function parseArea(area: string): number {
  const digits = area.replace(/\s/g, "").match(/\d+/g);
  if (!digits) return 0;
  return Number(digits.join(""));
}

function parsePercent(value: string): number {
  const match = value.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function getAvailabilityFactor(
  dailyHours: DailyHoursOption,
  selectedDays: number
) {
  const hoursPerDayFactor =
    dailyHours === "under-6"
      ? 0.35
      : dailyHours === "6-10"
        ? 0.5
        : dailyHours === "10-16"
          ? 0.7
          : dailyHours === "16-24"
            ? 0.9
            : 1;

  const daysFactor = selectedDays / 7;

  return hoursPerDayFactor * daysFactor;
}

function getAreaSlopeRequirement(option: SlopeAreaOption) {
  if (option === "under-25") return 25;
  if (option === "25-40") return 40;
  if (option === "40-50") return 50;
  if (option === "50-70") return 70;
  return 40;
}

function getBoundarySlopeRequirement(option: SlopeBoundaryOption) {
  if (option === "under-10") return 10;
  if (option === "10-15") return 15;
  if (option === "15-20") return 20;
  if (option === "20-25") return 25;
  return 15;
}

function isWirelessCompatible(model: Model) {
  return (
    model.category === "Trådløs (WiFi)" ||
    model.category === "Trådløs (4G)" ||
    model.category === "Kabel / oppgraderbar" ||
    model.category === "Pro"
  );
}

function isCableCompatible(model: Model) {
  return (
    model.category === "Kun kabel" || model.category === "Kabel / oppgraderbar"
  );
}

function getEffectiveMowingPattern(
  mowingPattern: MowingPatternOption
): "systematic" | "irregular" {
  return mowingPattern === "systematic" ? "systematic" : "irregular";
}

function getModelAreaForPattern(
  model: Model,
  mowingPattern: MowingPatternOption
): number {
  const effectivePattern = getEffectiveMowingPattern(mowingPattern);

  if (effectivePattern === "systematic" && model.areaSystematic) {
    return parseArea(model.areaSystematic);
  }

  if (effectivePattern === "irregular" && model.areaIrregular) {
    return parseArea(model.areaIrregular);
  }

  return parseArea(model.area);
}

function getModelAreaLabelForPattern(
  model: Model,
  mowingPattern: MowingPatternOption
): string {
  const effectivePattern = getEffectiveMowingPattern(mowingPattern);

  if (model.areaIrregular && model.areaSystematic) {
    if (effectivePattern === "systematic") {
      return `${model.areaSystematic} (systematisk)`;
    }

    return `${model.areaIrregular} (uregelmessig)`;
  }

  if (effectivePattern === "systematic" && model.areaSystematic) {
    return `${model.areaSystematic} (systematisk)`;
  }

  if (effectivePattern === "irregular" && model.areaIrregular) {
    return `${model.areaIrregular} (uregelmessig)`;
  }

  return model.area;
}

function getModelAreaDetails(model: Model) {
  if (model.areaIrregular && model.areaSystematic) {
    return `Uregelmessig: ${model.areaIrregular} • Systematisk: ${model.areaSystematic}`;
  }

  return null;
}

function getPatternLabel(mowingPattern: MowingPatternOption) {
  if (mowingPattern === "systematic") return "systematisk";
  if (mowingPattern === "irregular") return "uregelmessig";
  return "uregelmessig";
}

function mapModelToCalculatorName(model: Model): string {
  return model.name.replace("Automower ", "");
}

function buildCalculatorHref(input: {
  selectedAddress: string;
  areaSquareMeters: number;
  model: Model;
  boundaryType: BoundaryTypeOption;
  mowingPattern: MowingPatternOption;
  wants4G: "yes" | "no" | "unknown" | "";
  fullWifiCoverage: "yes" | "no" | "unknown" | "";
  complexGarden: "yes" | "no" | "unknown" | "";
}) {
  const params = new URLSearchParams();

  if (input.selectedAddress) {
    params.set("address", input.selectedAddress);
  }

  params.set("model", mapModelToCalculatorName(input.model));
  params.set("area", String(Math.round(input.areaSquareMeters)));
  params.set("boundaryType", input.boundaryType);
  params.set("mowingPattern", input.mowingPattern);
  params.set("wants4G", input.wants4G);
  params.set("wifi", input.fullWifiCoverage);
  params.set("complexGarden", input.complexGarden);

  if (input.boundaryType === "kabel") {
    const suggestedCableMeters = Math.max(
      0,
      Math.round(Math.sqrt(input.areaSquareMeters) * 4)
    );
    params.set("cableMeters", String(suggestedCableMeters));
  }

  return `/kalkulator?${params.toString()}`;
}

function recommendModels(input: {
  areaSquareMeters: number;
  dailyHours: DailyHoursOption;
  selectedDaysCount: number;
  boundaryType: BoundaryTypeOption;
  slopeArea: SlopeAreaOption;
  slopeBoundary: SlopeBoundaryOption;
  fullWifiCoverage: "yes" | "no" | "unknown" | "";
  wants4G: "yes" | "no" | "unknown" | "";
  complexGarden: "yes" | "no" | "unknown" | "";
  mowingPattern: MowingPatternOption;
}): {
  recommended: RecommendedModel | null;
  saferAlternative: RecommendedModel | null;
  neededCapacity: number;
  warnings: string[];
} {
  const availabilityFactor = getAvailabilityFactor(
    input.dailyHours,
    input.selectedDaysCount
  );

  const availabilityPenalty =
    availabilityFactor > 0 ? Math.max(1, 1 / availabilityFactor) : 2;

  let complexityFactor = 1;

  if (input.complexGarden === "yes") complexityFactor += 0.15;
  if (input.slopeArea === "unknown") complexityFactor += 0.08;
  if (input.slopeBoundary === "unknown") complexityFactor += 0.05;
  if (input.fullWifiCoverage === "unknown") complexityFactor += 0.03;
  if (input.wants4G === "unknown") complexityFactor += 0.02;
  if (input.mowingPattern === "unknown") complexityFactor += 0.08;
  if (input.boundaryType === "tradlos" && input.fullWifiCoverage === "no") {
    complexityFactor += 0.08;
  }

  const neededCapacity = Math.round(
    input.areaSquareMeters * availabilityPenalty * complexityFactor
  );

  const neededSlope = getAreaSlopeRequirement(input.slopeArea);
  const neededBoundarySlope = getBoundarySlopeRequirement(input.slopeBoundary);

  const warnings: string[] = [];

  if (input.slopeArea === "unknown" || input.slopeBoundary === "unknown") {
    warnings.push(
      "Du har ikke oppgitt all helling. Vi viser derfor litt tryggere forslag."
    );
  }

  if (input.mowingPattern === "unknown") {
    warnings.push(
      "Du valgte «vet ikke» på klippemønster. Vi har derfor regnet konservativt og lagt til grunn uregelmessig klippemønster."
    );
  }

  if (
    input.boundaryType === "tradlos" &&
    input.fullWifiCoverage === "no" &&
    input.wants4G !== "yes"
  ) {
    warnings.push(
      "Du ønsker kabel-fri drift uten god WiFi. 4G eller annen stabil tilkobling bør vurderes."
    );
  }

  const filtered = models
    .filter((model) => {
      const modelArea = getModelAreaForPattern(model, input.mowingPattern);
      const modelSlope = parsePercent(model.slope);
      const modelBoundarySlope = parsePercent(model.maxSlopeBoundary);

      if (modelArea < neededCapacity) return false;
      if (modelSlope < neededSlope) return false;
      if (modelBoundarySlope < neededBoundarySlope) return false;

      if (input.boundaryType === "kabel" && !isCableCompatible(model)) {
        return false;
      }

      if (input.boundaryType === "tradlos" && !isWirelessCompatible(model)) {
        return false;
      }

      if (input.boundaryType === "tradlos" && input.wants4G === "yes") {
        if (
          model.fourGStatus !== "Standard" &&
          model.fourGStatus !== "Tilbehør"
        ) {
          return false;
        }
      }

      if (
        input.boundaryType === "tradlos" &&
        input.fullWifiCoverage === "yes" &&
        input.wants4G === "no"
      ) {
        const canUseWifi =
          model.wifiStatus === "Standard" ||
          model.category === "Kabel / oppgraderbar" ||
          model.category === "Pro";

        if (!canUseWifi) return false;
      }

      return true;
    })
    .sort(
      (a, b) =>
        getModelAreaForPattern(a, input.mowingPattern) -
        getModelAreaForPattern(b, input.mowingPattern)
    );

  if (filtered.length === 0) {
    return {
      recommended: null,
      saferAlternative: null,
      neededCapacity,
      warnings,
    };
  }

  const recommendedModel = filtered[0];
  const recommendedCapacity = getModelAreaForPattern(
    recommendedModel,
    input.mowingPattern
  );

  const saferAlternativeModel =
    filtered.find(
      (model) =>
        getModelAreaForPattern(model, input.mowingPattern) > recommendedCapacity
    ) ??
    filtered[Math.min(1, filtered.length - 1)] ??
    null;

  function buildReason(model: Model, variant: "recommended" | "safer"): string {
    const parts: string[] = [];
    const effectivePattern = getPatternLabel(input.mowingPattern);

    if (variant === "recommended") {
      parts.push(
        `Passer best ut fra areal, driftstid, valgt løsning og ${effectivePattern} klippemønster.`
      );
    } else {
      parts.push(
        "Gir litt mer kapasitet og margin hvis forholdene blir tøffere enn antatt."
      );
    }

    if (
      input.boundaryType === "tradlos" &&
      model.category === "Kabel / oppgraderbar"
    ) {
      parts.push("Kan brukes kabel-fritt, men krever ekstrautstyr.");
    } else if (
      input.boundaryType === "tradlos" &&
      (model.category === "Trådløs (4G)" ||
        model.category === "Trådløs (WiFi)")
    ) {
      parts.push("Er godt egnet for kabel-fri drift.");
    }

    if (input.wants4G === "yes" && model.fourGStatus === "Standard") {
      parts.push("Har 4G som standard.");
    } else if (input.wants4G === "yes" && model.fourGStatus === "Tilbehør") {
      parts.push("Kan få 4G som tilvalg.");
    }

    if (input.complexGarden === "yes") {
      parts.push("Er vurdert opp mot litt mer krevende hage.");
    }

    if (model.areaIrregular && model.areaSystematic) {
      parts.push(
        `Denne modellen vurderes til ${getModelAreaLabelForPattern(
          model,
          input.mowingPattern
        )}.`
      );
    }

    return parts.join(" ");
  }

  return {
    recommended: {
      model: recommendedModel,
      reason: buildReason(recommendedModel, "recommended"),
    },
    saferAlternative:
      saferAlternativeModel && saferAlternativeModel.id !== recommendedModel.id
        ? {
            model: saferAlternativeModel,
            reason: buildReason(saferAlternativeModel, "safer"),
          }
        : null,
    neededCapacity,
    warnings,
  };
}

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
  const [mowingPattern, setMowingPattern] = useState<MowingPatternOption | "">(
    ""
  );
  const [slopeArea, setSlopeArea] = useState<SlopeAreaOption | "">("");
  const [slopeBoundary, setSlopeBoundary] = useState<SlopeBoundaryOption | "">(
    ""
  );
  const [fullWifiCoverage, setFullWifiCoverage] = useState<
    "yes" | "no" | "unknown" | ""
  >("");
  const [wants4G, setWants4G] = useState<"yes" | "no" | "unknown" | "">("");
  const [complexGarden, setComplexGarden] = useState<
    "yes" | "no" | "unknown" | ""
  >("");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
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
    setMowingPattern("");
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

  const canShowRecommendations =
    hasValidLawnDrawing &&
    dailyHours !== "" &&
    selectedDays.length > 0 &&
    boundaryType !== "" &&
    mowingPattern !== "" &&
    slopeArea !== "" &&
    slopeBoundary !== "";

  const recommendationResult = useMemo(() => {
    if (!canShowRecommendations) {
      return null;
    }

    return recommendModels({
      areaSquareMeters: drawnAreaSquareMeters,
      dailyHours: dailyHours as DailyHoursOption,
      selectedDaysCount: selectedDays.length,
      boundaryType,
      mowingPattern: mowingPattern as MowingPatternOption,
      slopeArea: slopeArea as SlopeAreaOption,
      slopeBoundary: slopeBoundary as SlopeBoundaryOption,
      fullWifiCoverage,
      wants4G,
      complexGarden,
    });
  }, [
    canShowRecommendations,
    drawnAreaSquareMeters,
    dailyHours,
    selectedDays.length,
    boundaryType,
    mowingPattern,
    slopeArea,
    slopeBoundary,
    fullWifiCoverage,
    wants4G,
    complexGarden,
  ]);

  const calculatorHref =
    recommendationResult?.recommended && boundaryType && mowingPattern
      ? buildCalculatorHref({
          selectedAddress,
          areaSquareMeters: drawnAreaSquareMeters,
          model: recommendationResult.recommended.model,
          boundaryType,
          mowingPattern: mowingPattern as MowingPatternOption,
          wants4G,
          fullWifiCoverage,
          complexGarden,
        })
      : "";

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
                    <p className="mt-1 text-sm text-green-700">
                      {selectedAddress}
                    </p>
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

              {selectedCoords?.latitude != null &&
              selectedCoords?.longitude != null ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Steg 2
                  </p>
                  <h2 className="mt-1 text-lg font-semibold sm:text-xl">
                    Tegn inn plenen din
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600">
                    Klikk rundt plenområdet direkte i kartet. Vi regner arealet
                    automatisk.
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
                        Arealet er klart. Neste steg blir spørsmål om bruksmønster
                        og ønsket løsning.
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
                    Dette hjelper oss å foreslå riktige modeller. Hvis du er usikker
                    på helling, kan du fortsatt velge ukjent og få forslag.
                  </p>

                  <div className="mt-4 space-y-5">
                    <Field label="Hvor mange timer per døgn kan klipperen gå?">
                      <select
                        value={dailyHours}
                        onChange={(e) =>
                          setDailyHours(e.target.value as DailyHoursOption | "")
                        }
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
                        onChange={(e) =>
                          setBoundaryType(e.target.value as BoundaryTypeOption)
                        }
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                      >
                        <option value="">Velg</option>
                        <option value="kabel">Kabel</option>
                        <option value="tradlos">Kabel-fri / trådløs</option>
                      </select>
                    </Field>

                    <Field label="Ønsker du systematisk eller uregelmessig klippemønster?">
                      <select
                        value={mowingPattern}
                        onChange={(e) =>
                          setMowingPattern(
                            e.target.value as MowingPatternOption | ""
                          )
                        }
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                      >
                        <option value="">Velg</option>
                        <option value="systematic">Systematisk</option>
                        <option value="irregular">Uregelmessig</option>
                        <option value="unknown">Vet ikke</option>
                      </select>
                    </Field>

                    <Field label="Bratteste punkt i klippeområdet">
                      <select
                        value={slopeArea}
                        onChange={(e) =>
                          setSlopeArea(e.target.value as SlopeAreaOption | "")
                        }
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
                          setSlopeBoundary(
                            e.target.value as SlopeBoundaryOption | ""
                          )
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
                      Hvis du er usikker på helling, kan du måle med mobilen ved å
                      bruke en helningsapp / vater-app. Du kan også velge “vet ikke”,
                      så får du fortsatt forslag.
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
                          setWants4G(
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

              {recommendationResult ? (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Steg 4
                  </p>
                  <h2 className="mt-1 text-lg font-semibold sm:text-xl">
                    Våre forslag
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600">
                    Vi har regnet et behov på omtrent{" "}
                    <span className="font-semibold">
                      {new Intl.NumberFormat("nb-NO").format(
                        recommendationResult.neededCapacity
                      )}{" "}
                      m²
                    </span>{" "}
                    ut fra areal, driftstid og forholdene du har valgt.
                  </p>

                  {recommendationResult.warnings.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div className="space-y-1">
                        {recommendationResult.warnings.map((warning) => (
                          <p key={warning}>{warning}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {recommendationResult.recommended ? (
                      <RecommendationCard
                        title="Anbefalt modell"
                        model={recommendationResult.recommended.model}
                        reason={recommendationResult.recommended.reason}
                        featured
                        mowingPattern={mowingPattern as MowingPatternOption}
                      />
                    ) : null}

                    {recommendationResult.saferAlternative ? (
                      <RecommendationCard
                        title="Tryggere alternativ"
                        model={recommendationResult.saferAlternative.model}
                        reason={recommendationResult.saferAlternative.reason}
                        mowingPattern={mowingPattern as MowingPatternOption}
                      />
                    ) : null}
                  </div>

                  {!recommendationResult.recommended ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      Vi fant ingen tydelig match med valgene du har gjort. Prøv å
                      åpne for flere driftstimer, flere dager eller velg en annen
                      løsning.
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                {recommendationResult?.recommended && calculatorHref ? (
                  <a
                    href={calculatorHref}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-neutral-900 px-6 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  >
                    Videre til pris og montering
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-neutral-900 px-6 text-sm font-semibold text-white opacity-50"
                  >
                    Videre til pris og montering
                  </button>
                )}

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
      <span className="mb-2 block text-sm font-medium text-neutral-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function RecommendationCard({
  title,
  model,
  reason,
  featured = false,
  mowingPattern,
}: {
  title: string;
  model: Model;
  reason: string;
  featured?: boolean;
  mowingPattern: MowingPatternOption;
}) {
  const areaDetails = getModelAreaDetails(model);

  return (
    <div
      className={`rounded-2xl border p-4 ${
        featured
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-neutral-50 text-neutral-900"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          featured ? "text-neutral-300" : "text-neutral-500"
        }`}
      >
        {title}
      </p>

      <h3 className="mt-2 text-xl font-bold">{model.name}</h3>
      <p
        className={`mt-1 text-sm ${
          featured ? "text-neutral-300" : "text-neutral-600"
        }`}
      >
        Art.nr: {model.articleNumber}
      </p>

      <div className="mt-4 space-y-2 text-sm">
        <RecommendationRow
          label="Område"
          value={getModelAreaLabelForPattern(model, mowingPattern)}
          featured={featured}
        />
        <RecommendationRow
          label="Kategori"
          value={model.category}
          featured={featured}
        />
        <RecommendationRow
          label="Helling"
          value={model.slope}
          featured={featured}
        />
        <RecommendationRow
          label="Grense / ytterkant"
          value={model.maxSlopeBoundary}
          featured={featured}
        />
        <RecommendationRow
          label="4G"
          value={model.fourGStatus}
          featured={featured}
        />
        <RecommendationRow
          label="WiFi"
          value={model.wifiStatus}
          featured={featured}
        />
      </div>

      {areaDetails ? (
        <div
          className={`mt-4 rounded-2xl p-4 text-sm ${
            featured ? "bg-white/10 text-neutral-100" : "bg-white text-neutral-700"
          }`}
        >
          <p className="font-semibold">Kapasitet</p>
          <p className="mt-1">{areaDetails}</p>
        </div>
      ) : null}

      <div
        className={`mt-4 rounded-2xl p-4 text-sm ${
          featured ? "bg-white/10 text-neutral-100" : "bg-white text-neutral-700"
        }`}
      >
        <p className="font-semibold">Hvorfor dette valget</p>
        <p className="mt-1">{reason}</p>
      </div>

      <div
        className={`mt-4 rounded-2xl p-4 text-sm ${
          featured ? "bg-white/10 text-neutral-100" : "bg-white text-neutral-700"
        }`}
      >
        <p className="font-semibold">Kort forklart</p>
        <p className="mt-1">{model.notes}</p>
      </div>
    </div>
  );
}

function RecommendationRow({
  label,
  value,
  featured,
}: {
  label: string;
  value: string;
  featured: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl px-3 py-2 ${
        featured ? "bg-white/10" : "border border-neutral-200 bg-white"
      }`}
    >
      <span className={featured ? "text-neutral-300" : "text-neutral-500"}>
        {label}
      </span>
      <span className="max-w-[55%] text-right font-medium">{value}</span>
    </div>
  );
}