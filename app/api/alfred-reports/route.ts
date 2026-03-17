import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const report = await request.json();
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Save report to a JSON file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `report-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);
    
    const reportData = {
      ...report,
      id: Math.random().toString(36).substr(2, 9),
      receivedAt: new Date().toISOString(),
    };

    fs.writeFileSync(filepath, JSON.stringify(reportData, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Report received by Alfred',
      reportId: reportData.id 
    });
  } catch (error) {
    console.error('Error saving report:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save report' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json({ reports: [] });
    }

    const files = fs.readdirSync(reportsDir)
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    const reports = files.slice(0, 20).map(file => {
      const filepath = path.join(reportsDir, file);
      const content = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(content);
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error reading reports:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to read reports' },
      { status: 500 }
    );
  }
}