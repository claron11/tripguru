import { NextResponse } from "next/server";
import { getLLM } from "@/lib/agent/tripPlannerGraph";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destination = searchParams.get("destination");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!destination) {
    return NextResponse.json({ error: "Destination is required" }, { status: 400 });
  }

  try {
    // 1. Geocoding
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1`);
    const geoData = await geoRes.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      return NextResponse.json({ error: "Could not find coordinates for this destination" }, { status: 404 });
    }
    
    const lat = geoData.results[0].latitude;
    const lon = geoData.results[0].longitude;
    const resolvedName = geoData.results[0].name;

    // 2. Weather Forecast (Next 7 days as a baseline)
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto`);
    const weatherData = await weatherRes.json();
    
    let weatherSummary = "Weather data unavailable.";
    if (weatherData.daily) {
      const maxTemp = Math.max(...weatherData.daily.temperature_2m_max);
      const minTemp = Math.min(...weatherData.daily.temperature_2m_min);
      const precip = weatherData.daily.precipitation_sum.reduce((a: number, b: number) => a + b, 0);
      weatherSummary = `In the upcoming 7 days, ${resolvedName} expects temps from ${minTemp}°C to ${maxTemp}°C with a total of ${precip}mm of rain.`;
    }

    // 3. AI Packing Tips
    const llm = getLLM();
    const prompt = `You are an expert travel assistant.
Destination: ${destination}
Trip Dates: ${startDate || "Upcoming"} to ${endDate || "Upcoming"}
Recent Weather Forecast: ${weatherSummary}

Based on the destination, the trip dates (consider historical climate if dates are far in the future, otherwise use the recent forecast), give a short, punchy weather expectation and 3-4 bullet points of essential packing tips.
Make it conversational and helpful. Keep it extremely brief (max 60 words). Do not include any intro/outro. Use emojis.`;

    const res = await llm.invoke(prompt);
    const packingTips = typeof res.content === "string" ? res.content : JSON.stringify(res.content);

    return NextResponse.json({
      location: resolvedName,
      weatherSummary,
      packingTips,
      lat,
      lon
    });

  } catch (err: any) {
    console.error("Weather API Error:", err);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
