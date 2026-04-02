import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Accept the event but don't persist to filesystem (Vercel is read-only)
    // Client-side localStorage backup in ActivityLogger handles local persistence
    await request.json();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to log activity' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    logs: [],
    totalEvents: 0,
    filesScanned: 0
  });
}
