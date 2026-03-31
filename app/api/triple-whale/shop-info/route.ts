import { NextResponse } from 'next/server';

const TW_BASE_URL = 'https://api.triplewhale.com/api/v2';

function getConfig() {
  const apiKey = process.env.TRIPLE_WHALE_API_KEY;
  const shopId = process.env.TRIPLE_WHALE_SHOP_ID;

  if (!apiKey || !shopId) {
    throw new Error(
      'Missing Triple Whale environment variables. Ensure TRIPLE_WHALE_API_KEY and TRIPLE_WHALE_SHOP_ID are set.'
    );
  }

  return { apiKey, shopId };
}

export async function GET() {
  try {
    const { apiKey, shopId } = getConfig();

    // Validate API key and get user info
    const response = await fetch(`${TW_BASE_URL}/users/api-keys/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Triple Whale API error (${response.status}): ${errorText}`);
    }

    const keyInfo = await response.json();

    return NextResponse.json({
      success: true,
      source: 'triple-whale-shop-info',
      data: {
        shopId,
        apiKeyValid: true,
        user: keyInfo.user,
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Triple Whale Shop Info API error:', err);

    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
