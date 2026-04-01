import { NextResponse } from 'next/server';

// In-memory cache for the exchange rate
let cachedRate: { rate: number; fetchedAt: number } | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

async function fetchLiveRate(): Promise<number> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    next: { revalidate: 3600 }, // Next.js fetch cache: 1 hour
  });

  if (!res.ok) {
    throw new Error(`Exchange rate API error: ${res.status}`);
  }

  const data = await res.json();
  
  if (!data.rates?.PHP) {
    throw new Error('PHP rate not found in response');
  }

  return data.rates.PHP;
}

export async function GET() {
  try {
    const now = Date.now();

    // Return cached rate if still fresh
    if (cachedRate && (now - cachedRate.fetchedAt) < CACHE_DURATION_MS) {
      return NextResponse.json({
        success: true,
        rate: cachedRate.rate,
        cached: true,
        fetchedAt: new Date(cachedRate.fetchedAt).toISOString(),
      });
    }

    // Fetch fresh rate
    const rate = await fetchLiveRate();
    cachedRate = { rate, fetchedAt: now };

    return NextResponse.json({
      success: true,
      rate,
      cached: false,
      fetchedAt: new Date(now).toISOString(),
    });
  } catch (error: any) {
    // If fetch fails but we have a stale cache, return it
    if (cachedRate) {
      return NextResponse.json({
        success: true,
        rate: cachedRate.rate,
        cached: true,
        stale: true,
        fetchedAt: new Date(cachedRate.fetchedAt).toISOString(),
        warning: error.message,
      });
    }

    // No cache, no fetch — fall back to approximate rate
    return NextResponse.json({
      success: true,
      rate: 57,
      cached: false,
      fallback: true,
      error: error.message,
    });
  }
}
