import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';

const BLOB_PATH = 'prompts/prompt-templates.json';

/**
 * GET /api/prompts — Read all prompts + history from Vercel Blob
 */
export async function GET() {
  try {
    const blob = await head(BLOB_PATH);
    if (!blob) {
      return NextResponse.json({ prompts: {}, history: {} });
    }
    const res = await fetch(blob.url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    if (error?.code === 'blob_not_found' || error?.name === 'BlobNotFoundError') {
      return NextResponse.json({ prompts: {}, history: {} });
    }
    console.error('Error reading prompts:', error);
    return NextResponse.json({ prompts: {}, history: {} });
  }
}

/**
 * POST /api/prompts — Save all prompts + history to Vercel Blob
 * Body: { prompts: Record<string, PromptTemplate>, history: Record<string, PromptHistoryEntry[]> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    await put(BLOB_PATH, JSON.stringify(body, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving prompts:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save prompts' },
      { status: 500 }
    );
  }
}
