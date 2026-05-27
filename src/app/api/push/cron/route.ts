import { NextResponse } from 'next/server';
import { sendTickleToAll } from '@/lib/push';

// Accept GET or POST for cron triggers
export async function GET(request: Request) {
  return handleCron();
}

export async function POST(request: Request) {
  return handleCron();
}

async function handleCron() {
  try {
    const result = await sendTickleToAll();
    return NextResponse.json({ success: true, cron: true, total: result.total, successCount: result.success });
  } catch (error: any) {
    console.error('Push Cron Job Failed:', error);
    return NextResponse.json({ error: 'Cron job execution failed' }, { status: 500 });
  }
}
