import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const activityEvent = await request.json();
    
    // Create activity logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'activity-logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Create daily log file
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `activity-${today}.jsonl`);
    
    // Append event to daily log file (JSONL format)
    const logLine = JSON.stringify(activityEvent) + '\n';
    fs.appendFileSync(logFile, logLine);

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
  try {
    const logsDir = path.join(process.cwd(), 'activity-logs');
    
    if (!fs.existsSync(logsDir)) {
      return NextResponse.json({ logs: [] });
    }

    // Get recent log files (last 7 days)
    const files = fs.readdirSync(logsDir)
      .filter(file => file.startsWith('activity-') && file.endsWith('.jsonl'))
      .sort()
      .reverse()
      .slice(0, 7);

    const allLogs = [];
    let totalEvents = 0;

    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          allLogs.push(event);
          totalEvents++;
          
          // Limit to 1000 most recent events
          if (totalEvents >= 1000) break;
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
      
      if (totalEvents >= 1000) break;
    }

    return NextResponse.json({ 
      logs: allLogs.slice(0, 1000),
      totalEvents,
      filesScanned: files.length
    });
  } catch (error) {
    console.error('Error reading activity logs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to read activity logs' },
      { status: 500 }
    );
  }
}