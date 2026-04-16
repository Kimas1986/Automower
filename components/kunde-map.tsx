"use client";

import { useEffect, useRef, useState } from "react";

type GoogleMapsWindow = Window & {
  google?: any;
};

type KundeMapProps = {
  latitude: number;
  longitude: number;
};

type LoadState = "idle" | "loading" | "ready" | "error";

type Point = {
  lat: number;
  lng: number;
};

let googleMapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window er ikke tilgjengelig"));
  }

  const googleWindow = window as GoogleMapsWindow;

  if (googleWindow.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-google-maps="true"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Kunne ikke laste Google Maps.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=weekly&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kunne ikke laste Google Maps."));

    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

export default function KundeMap({ latitude, longitude }: KundeMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);

  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [areaSquareMeters, setAreaSquareMeters] = useState(0);

  useEffect(() => {
    const browserApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY ?? "";

    if (!browserApiKey) {
      setLoadState("error");
      setErrorMessage(
        "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY mangler. Legg den inn i miljøvariablene."
      );
      return;
    }

    let cancelled = false;

    async function initMap() {
      try {
        setLoadState("loading");
        setErrorMessage("");

        await loadGoogleMapsScript(browserApiKey);

        const googleWindow = window as GoogleMapsWindow;

        if (cancelled || !mapRef.current || !googleWindow.google?.maps) {
          return;
        }

        const center = { lat: latitude, lng: longitude };

        if (clickListenerRef.current) {
          clickListenerRef.current.remove();
          clickListenerRef.current = null;
        }

        if (markerRef.current) {
          markerRef.current.setMap(null);
          markerRef.current = null;
        }

        if (polygonRef.current) {
          polygonRef.current.setMap(null);
          polygonRef.current = null;
        }

        const map = new googleWindow.google.maps.Map(mapRef.current, {
          center,
          zoom: 21,
          mapTypeId: "satellite",
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true,
          rotateControl: false,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          disableDoubleClickZoom: false,
draggableCursor: "crosshair",
draggingCursor: "move",
        });

        mapInstanceRef.current = map;

        markerRef.current = new googleWindow.google.maps.Marker({
          position: center,
          map,
          title: "Valgt adresse",
        });

        polygonRef.current = new googleWindow.google.maps.Polygon({
          paths: [],
          strokeColor: "#2563eb",
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: "#2563eb",
          fillOpacity: 0.2,
          editable: false,
          draggable: false,
          clickable: false,
          map,
        });

        clickListenerRef.current = map.addListener("click", (event: any) => {
          if (!event?.latLng) return;

          setPoints((prev) => [
            ...prev,
            {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            },
          ]);
        });

        setTimeout(() => {
          if (!mapInstanceRef.current || !googleWindow.google?.maps) return;
          googleWindow.google.maps.event.trigger(mapInstanceRef.current, "resize");
          mapInstanceRef.current.setCenter(center);
        }, 50);

        setLoadState("ready");
      } catch (error) {
        console.error(error);
        setLoadState("error");
        setErrorMessage("Klarte ikke laste kartet.");
      }
    }

    void initMap();

    return () => {
      cancelled = true;

      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }

      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }

      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }

      mapInstanceRef.current = null;
    };
  }, [latitude, longitude]);

  useEffect(() => {
    const googleWindow = window as GoogleMapsWindow;

    if (!googleWindow.google?.maps || !polygonRef.current) return;

    polygonRef.current.setPath(points);

    if (points.length >= 3) {
      const polygonArea =
        googleWindow.google.maps.geometry.spherical.computeArea(
          points.map(
            (point) => new googleWindow.google.maps.LatLng(point.lat, point.lng)
          )
        ) || 0;

      setAreaSquareMeters(polygonArea);
    } else {
      setAreaSquareMeters(0);
    }
  }, [points]);

  function resetDrawing() {
    setPoints([]);
    setAreaSquareMeters(0);
  }

  function undoLastPoint() {
    setPoints((prev) => prev.slice(0, -1));
  }

  return (
    <div className="space-y-4">
      {loadState === "error" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
        <div ref={mapRef} className="h-[460px] w-full" />

        {loadState !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100/80 px-6 text-sm text-neutral-500">
            {loadState === "loading" ? "Laster kart..." : "Gjør klart kart..."}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Punkter" value={String(points.length)} />
        <StatCard
          label="Areal"
          value={
            areaSquareMeters > 0
              ? `${new Intl.NumberFormat("nb-NO", {
                  maximumFractionDigits: 0,
                }).format(areaSquareMeters)} m²`
              : "-"
          }
        />
        <StatCard
          label="Status"
          value={points.length >= 3 ? "Plen markert" : "Klikk i kartet"}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={undoLastPoint}
          disabled={points.length === 0}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Angre siste punkt
        </button>

        <button
          type="button"
          onClick={resetDrawing}
          disabled={points.length === 0}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Tøm tegning
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        Dra med én finger eller mus for å flytte kartet. Zoom med hjul eller knapper.
        Klikk deretter rundt plenområdet for å markere hjørnene. Når du har minst 3
        punkter, regner systemet automatisk ut arealet.
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-neutral-900">{value}</p>
    </div>
  );
}