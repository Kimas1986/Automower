import { NextRequest, NextResponse } from "next/server";

type GoogleRoutesApiResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
  }>;
};

export const runtime = "nodejs";

function parseDurationSeconds(value: string | undefined): number {
  if (!value) return 0;

  // Google returnerer f.eks "1234s"
  const numeric = Number(value.replace("s", ""));

  return Number.isFinite(numeric) ? numeric : 0;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_MAPS_API_KEY mangler i .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const originAddress = String(body?.originAddress ?? "").trim();
    const destinationAddress = String(body?.destinationAddress ?? "").trim();

    if (!originAddress || !destinationAddress) {
      return NextResponse.json(
        { error: "originAddress eller destinationAddress mangler" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: {
            address: originAddress,
          },
          destination: {
            address: destinationAddress,
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          languageCode: "no-NO",
          regionCode: "no",
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: "Google routes feilet",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const data = (await response.json()) as GoogleRoutesApiResponse;
    const route = data.routes?.[0];

    if (!route) {
      return NextResponse.json(
        { error: "Fant ingen rute" },
        { status: 404 }
      );
    }

    const distanceMeters = Number(route.distanceMeters ?? 0);
    const durationSeconds = parseDurationSeconds(route.duration);

    return NextResponse.json({
      distanceMeters,
      distanceKm: distanceMeters / 1000,
      durationSeconds,
      durationMinutes: durationSeconds / 60,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ukjent feil i route";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}