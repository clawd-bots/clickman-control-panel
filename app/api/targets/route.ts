import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

const BLOB_PATH = 'targets/monthly-targets.json';

/**
 * GET /api/targets — Read saved targets from Vercel Blob
 */
export async function GET() {
  try {
    const blob = await head(BLOB_PATH);
    if (!blob) {
      return NextResponse.json({ targets: {} });
    }
    const res = await fetch(blob.url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json({ targets: data });
  } catch (error: any) {
    // BlobNotFoundError or similar — no targets saved yet
    if (error?.code === 'blob_not_found' || error?.name === 'BlobNotFoundError') {
      return NextResponse.json({ targets: {} });
    }
    console.error('Error reading targets:', error);
    return NextResponse.json({ targets: {} });
  }
}

/**
 * POST /api/targets — Save targets to Vercel Blob
 * Body: { targets: { [metric]: { [monthKey]: number } } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targets } = body;

    if (!targets || typeof targets !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid targets data' },
        { status: 400 }
      );
    }

    await put(BLOB_PATH, JSON.stringify(targets, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving targets:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save targets' },
      { status: 500 }
    );
  }
}
