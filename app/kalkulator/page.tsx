"use client";

import { useState } from "react";

const BASE_ADDRESS = "Joakim Brevolds Allé 4, 7170 Åfjord";

const HOURLY_RATE = 1070;
const KM_RATE = 8.75;
const CABLE_PRICE = 12;

const FOUR_G_SMALL_PRICE = 2990;
const FOUR_G_PLUGIN_PRICE = 5399;
const RS1_PRICE = 3799;

const SMALL_4G_MODELS = [
  "308V",
  "312V",
  "Aspire R6V",
  "305E NERA",
  "310E NERA",
];

const PLUGIN_MODELS = [
  "320 NERA",
  "430X NERA",
];

export default function Kalkulator() {
  const [address, setAddress] = useState("");
  const [model, setModel] = useState("");
  const [cable, setCable] = useState(0);
  const [fourG, setFourG] = useState(false);
  const [rs1, setRs1] = useState(false);

  const [distance, setDistance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculateDistance() {
    setLoading(true);

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${encodeURIComponent(
          BASE_ADDRESS
        )};${encodeURIComponent(address)}?overview=false`
      );

      const data = await res.json();

      if (data.routes?.length) {
        const km = data.routes[0].distance / 1000;
        setDistance(km);
      } else {
        alert("Fant ikke rute");
      }
    } catch {
      alert("Feil ved oppslag av adresse");
    }

    setLoading(false);
  }

  function getFourGPrice() {
    if (!fourG) return 0;

    if (SMALL_4G_MODELS.includes(model)) {
      return FOUR_G_SMALL_PRICE;
    }

    if (PLUGIN_MODELS.includes(model)) {
      return FOUR_G_PLUGIN_PRICE;
    }

    return 0;
  }

  function getWorkHours() {
    let hours = 0;

    if (fourG) hours += 1;
    if (rs1) hours += 1;

    return hours;
  }

  const kmCost = distance ? distance * KM_RATE : 0;
  const cableCost = cable * CABLE_PRICE;
  const fourGCost = getFourGPrice();
  const rs1Cost = rs1 ? RS1_PRICE : 0;
  const workCost = getWorkHours() * HOURLY_RATE;

  const total =
    kmCost + cableCost + fourGCost + rs1Cost + workCost;

  return (
    <main className="min-h-screen bg-neutral-100 p-4">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">Monteringskalkulator</h1>

        <input
          placeholder="Kundens adresse"
          className="w-full rounded-xl border p-3"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <button
          onClick={calculateDistance}
          className="w-full rounded-xl bg-black p-3 text-white"
        >
          {loading ? "Beregner..." : "Beregn avstand"}
        </button>

        {distance && (
          <p className="text-sm">Avstand: {distance.toFixed(1)} km</p>
        )}

        <select
          className="w-full rounded-xl border p-3"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          <option value="">Velg modell</option>
          <option>308V</option>
          <option>312V</option>
          <option>Aspire R6V</option>
          <option>305E NERA</option>
          <option>310E NERA</option>
          <option>320 NERA</option>
          <option>430X NERA</option>
        </select>

        <input
          type="number"
          placeholder="Kabel (meter)"
          className="w-full rounded-xl border p-3"
          value={cable}
          onChange={(e) => setCable(Number(e.target.value))}
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={fourG}
            onChange={(e) => setFourG(e.target.checked)}
          />
          4G / Connect
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rs1}
            onChange={(e) => setRs1(e.target.checked)}
          />
          RS1
        </label>

        <div className="rounded-2xl bg-white p-4 space-y-2">
          <h2 className="font-semibold">Oppsummering</h2>

          <Row label="Kjøring" value={`${kmCost.toFixed(0)} kr`} />
          <Row label="Kabel" value={`${cableCost.toFixed(0)} kr`} />
          <Row label="4G" value={`${fourGCost} kr`} />
          <Row label="RS1" value={`${rs1Cost} kr`} />
          <Row label="Arbeid" value={`${workCost} kr`} />

          <hr />

          <Row
            label="Total"
            value={`${total.toFixed(0)} kr`}
            bold
          />
        </div>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-semibold" : ""}>{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}