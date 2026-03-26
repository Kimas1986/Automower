"use client";

import { useMemo, useState } from "react";

const BASE_ADDRESS = "Joakim Brevolds Allé 4, 7170 Åfjord";

const HOURLY_RATE = 1070;
const KM_RATE = 8.75;
const CABLE_PRICE = 12;

const FOUR_G_SMALL_PRICE = 2990;
const FOUR_G_PLUGIN_PRICE = 5399;
const RS1_PRICE = 3799;

type ModelConfig = {
  name: string;
  baseHours: number;
  fourGType: "small" | "plugin" | "none" | "built-in";
  rs1Allowed: boolean;
};

const MODEL_CONFIGS: ModelConfig[] = [
  { name: "Aspire R4", baseHours: 3.5, fourGType: "none", rs1Allowed: false },
  { name: "305", baseHours: 3.5, fourGType: "small", rs1Allowed: false },
  { name: "315 Mk II", baseHours: 4, fourGType: "small", rs1Allowed: false },

  { name: "Aspire R6V", baseHours: 3, fourGType: "small", rs1Allowed: true },
  { name: "308V", baseHours: 3, fourGType: "small", rs1Allowed: true },
  { name: "312V", baseHours: 3, fourGType: "small", rs1Allowed: true },

  { name: "305E NERA", baseHours: 3.5, fourGType: "small", rs1Allowed: true },
  { name: "310E NERA", baseHours: 3.5, fourGType: "small", rs1Allowed: true },
  { name: "320 NERA", baseHours: 4, fourGType: "plugin", rs1Allowed: true },
  { name: "430X NERA", baseHours: 4, fourGType: "plugin", rs1Allowed: true },

  { name: "405VE NERA", baseHours: 3.5, fourGType: "built-in", rs1Allowed: true },
  { name: "410VE NERA", baseHours: 3.5, fourGType: "built-in", rs1Allowed: true },
  { name: "430V NERA", baseHours: 4, fourGType: "built-in", rs1Allowed: true },
  { name: "435X AWD NERA", baseHours: 4.5, fourGType: "built-in", rs1Allowed: true },
  { name: "450V NERA", baseHours: 4.5, fourGType: "built-in", rs1Allowed: true },

  { name: "520 EPOS", baseHours: 4, fourGType: "built-in", rs1Allowed: true },
  { name: "535 AWD EPOS", baseHours: 4.5, fourGType: "built-in", rs1Allowed: true },
  { name: "560 EPOS", baseHours: 5, fourGType: "built-in", rs1Allowed: true },
  { name: "580 EPOS", baseHours: 5, fourGType: "built-in", rs1Allowed: true },
];

type DistanceResult = {
  km: number;
  source: string;
};

export default function KalkulatorPage() {
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [cableMeters, setCableMeters] = useState("0");
  const [addFourG, setAddFourG] = useState(false);
  const [addRS1, setAddRS1] = useState(false);
  const [manualHours, setManualHours] = useState("");

  const [distance, setDistance] = useState<DistanceResult | null>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [distanceError, setDistanceError] = useState("");

  const modelConfig = useMemo(
    () => MODEL_CONFIGS.find((m) => m.name === selectedModel) ?? null,
    [selectedModel]
  );

  const cableMetersNumber = Math.max(0, Number(cableMeters.replace(",", ".")) || 0);
  const overriddenHours = Number(manualHours.replace(",", ".")) || 0;

  const fourGAllowed =
    modelConfig?.fourGType === "small" || modelConfig?.fourGType === "plugin";
  const fourGBuiltIn = modelConfig?.fourGType === "built-in";
  const rs1Allowed = modelConfig?.rs1Allowed ?? false;

  const effectiveAddFourG = fourGAllowed ? addFourG : false;
  const effectiveAddRS1 = rs1Allowed ? addRS1 : false;

  const baseHours = modelConfig?.baseHours ?? 0;
  const extraHours = (effectiveAddFourG ? 1 : 0) + (effectiveAddRS1 ? 1 : 0);

  const totalHours =
    overriddenHours > 0 ? overriddenHours : baseHours + extraHours;

  const drivingCost = distance ? distance.km * KM_RATE : 0;
  const laborCost = totalHours * HOURLY_RATE;
  const cableCost = cableMetersNumber * CABLE_PRICE;

  const fourGProductCost =
    modelConfig?.fourGType === "small" && effectiveAddFourG
      ? FOUR_G_SMALL_PRICE
      : modelConfig?.fourGType === "plugin" && effectiveAddFourG
      ? FOUR_G_PLUGIN_PRICE
      : 0;

  const rs1ProductCost = effectiveAddRS1 ? RS1_PRICE : 0;

  const totalPrice =
    drivingCost + laborCost + cableCost + fourGProductCost + rs1ProductCost;

  async function calculateDistance() {
    setDistanceError("");
    setDistance(null);

    if (!customerAddress.trim()) {
      setDistanceError("Skriv inn kundens adresse først.");
      return;
    }

    setIsCalculatingDistance(true);

    try {
      const coordsFrom = await geocodeAddress(BASE_ADDRESS);
      const coordsTo = await geocodeAddress(customerAddress);

      const km = await routeDistanceKm(coordsFrom, coordsTo);

      setDistance({
        km,
        source: "OpenStreetMap / OSRM",
      });
    } catch (error) {
      console.error(error);
      setDistanceError("Klarte ikke beregne avstand. Sjekk adressen og prøv igjen.");
    } finally {
      setIsCalculatingDistance(false);
    }
  }

  function resetOptionalChoices(nextModelName: string) {
    const next = MODEL_CONFIGS.find((m) => m.name === nextModelName);
    if (!next) {
      setAddFourG(false);
      setAddRS1(false);
      return;
    }

    if (!(next.fourGType === "small" || next.fourGType === "plugin")) {
      setAddFourG(false);
    }

    if (!next.rs1Allowed) {
      setAddRS1(false);
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
            Pris inkl. mva basert på modell, adresse, arbeidstid, kabel, 4G og RS1.
          </p>

          <div className="mt-4">
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
            >
              Tilbake til oppslag
            </a>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold sm:text-xl">Inndata</h2>

            <div className="mt-4 space-y-4">
              <Field label="Kundens adresse">
                <input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Eks. Storgata 1, 7170 Åfjord"
                  className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-500"
                />
              </Field>

              <div>
                <button
                  onClick={calculateDistance}
                  disabled={isCalculatingDistance}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCalculatingDistance ? "Beregner avstand..." : "Beregn avstand"}
                </button>

                {distance ? (
                  <p className="mt-2 text-sm text-neutral-700">
                    Avstand: <span className="font-semibold">{distance.km.toFixed(1)} km</span>
                  </p>
                ) : null}

                {distanceError ? (
                  <p className="mt-2 text-sm text-red-600">{distanceError}</p>
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
                      ? "Legger til produktpris + 1 time jobb"
                      : "Ikke aktuelt for denne modellen"
                  }
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold sm:text-xl">Oppsummering</h2>

            <div className="mt-4 space-y-2 text-sm">
              <SummaryRow label="Baseadresse" value={BASE_ADDRESS} />
              <SummaryRow label="Modell" value={selectedModel || "-"} />
              <SummaryRow
                label="Avstand"
                value={distance ? `${distance.km.toFixed(1)} km` : "-"}
              />
              <SummaryRow
                label="Kjøring"
                value={formatCurrency(drivingCost)}
              />
              <SummaryRow
                label="Arbeidstid"
                value={totalHours > 0 ? `${formatHours(totalHours)} t` : "-"}
              />
              <SummaryRow
                label="Arbeid"
                value={formatCurrency(laborCost)}
              />
              <SummaryRow
                label="Kabel"
                value={`${cableMetersNumber} m`}
              />
              <SummaryRow
                label="Kabelkostnad"
                value={formatCurrency(cableCost)}
              />
              <SummaryRow
                label="4G / plugin"
                value={formatCurrency(fourGProductCost)}
              />
              <SummaryRow
                label="RS1"
                value={formatCurrency(rs1ProductCost)}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-base font-semibold">Total inkl. mva</span>
                <span className="text-xl font-bold">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Regler
              </p>
              <div className="mt-2 space-y-1 text-sm text-neutral-700">
                <p>Timepris: {formatCurrency(HOURLY_RATE)} / t</p>
                <p>Kjøring: {formatCurrency(KM_RATE)} / km</p>
                <p>Kabel: {formatCurrency(CABLE_PRICE)} / m</p>
                <p>4G småmodeller: {formatCurrency(FOUR_G_SMALL_PRICE)} + 1 t</p>
                <p>Plugin 320/430X NERA: {formatCurrency(FOUR_G_PLUGIN_PRICE)} + 1 t</p>
                <p>RS1: {formatCurrency(RS1_PRICE)} + 1 t</p>
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
      <span className="mb-2 block text-sm font-medium text-neutral-700">{label}</span>
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

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number }> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
    address
  )}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Geokoding feilet");
  }

  const data: Array<{ lat: string; lon: string }> = await response.json();

  if (!data.length) {
    throw new Error("Fant ikke adresse");
  }

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
  };
}

async function routeDistanceKm(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): Promise<number> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Ruting feilet");
  }

  const data: {
    routes?: Array<{ distance: number }>;
  } = await response.json();

  if (!data.routes?.length) {
    throw new Error("Fant ikke kjørerute");
  }

  return data.routes[0].distance / 1000;
}