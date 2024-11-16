import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Fetch the raw data from the URL
    const response = await fetch(url);
    const rawData = await response.text();

    // Return the raw data without processing
    return NextResponse.json({ data: rawData });
  } catch (error) {
    console.error("Error loading dataset:", error);
    return NextResponse.json(
      { error: "Failed to load dataset" },
      { status: 500 }
    );
  }
}
