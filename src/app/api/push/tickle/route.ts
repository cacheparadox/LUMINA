import { NextResponse } from 'next/server';
import { sendTickle, sendTickleToAll } from '@/lib/push';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    if (body && body.subscription) {
      // Send to specific subscription (test flow)
      const success = await sendTickle(body.subscription, true);
      return NextResponse.json({ success });
    } else {
      // Send to all subscribers
      const result = await sendTickleToAll();
      return NextResponse.json({ success: true, total: result.total, successCount: result.success });
    }
  } catch (error: any) {
    console.error('Failed to trigger push tickle:', error);
    return NextResponse.json({ error: 'Tickle trigger failed' }, { status: 500 });
  }
}
