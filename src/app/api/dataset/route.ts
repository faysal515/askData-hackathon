import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, url } = body;

    // Get the dataset ID either directly or from URL
    let datasetId = identifier;
    if (url) {
      datasetId = url.match(/[?&]id=([^&]+)/)?.[1];
    }

    if (!datasetId) {
      return NextResponse.json(
        { error: "Invalid dataset identifier or URL" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://data.abudhabi/opendata/apis/search_inner.php?identifier=${datasetId}`,
      {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
