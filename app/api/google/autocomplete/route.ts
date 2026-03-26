import { NextRequest, NextResponse } from "next/server";

type GoogleAutocompleteApiResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: {
        text?: string;
      };
      structuredFormat?: {
        mainText?: {
          text?: string;
        };
        secondaryText?: {
          text?: string;
        };
      };
    };
  }>;
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
    const input = String(body?.input ?? "").trim();

    if (input.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ["no"],
        languageCode: "no",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: "Google autocomplete feilet",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const data = (await response.json()) as GoogleAutocompleteApiResponse;

    const suggestions =
      data.suggestions?.flatMap((item) => {
        const prediction = item.placePrediction;

        if (!prediction?.placeId) {
          return [];
        }

        return [
          {
            placeId: prediction.placeId,
            text: prediction.text?.text ?? "",
            mainText: prediction.structuredFormat?.mainText?.text ?? "",
            secondaryText: prediction.structuredFormat?.secondaryText?.text ?? "",
          },
        ];
      }) ?? [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ukjent feil i autocomplete";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}