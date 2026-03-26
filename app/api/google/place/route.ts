import { NextRequest, NextResponse } from "next/server";

type GooglePlaceDetailsApiResponse = {
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

export const runtime = "nodejs";

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
    const placeId = String(body?.placeId ?? "").trim();

    if (!placeId) {
      return NextResponse.json(
        { error: "placeId mangler" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "formattedAddress,location",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: "Google place details feilet",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const data = (await response.json()) as GooglePlaceDetailsApiResponse;

    return NextResponse.json({
      formattedAddress: data.formattedAddress ?? "",
      location: {
        latitude: data.location?.latitude ?? null,
        longitude: data.location?.longitude ?? null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ukjent feil i place details";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}