import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const datasetId = searchParams.get("identifier");

  if (!datasetId) {
    return NextResponse.json(
      { error: "Dataset ID is required" },
      { status: 400 }
    );
  }

  try {
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

    const result = await response.json();
    console.log("==== ", result);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch dataset" },
      { status: 500 }
    );
  }
}
