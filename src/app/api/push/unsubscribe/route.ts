import { NextResponse } from 'next/server';
import { removeSubscription } from '@/lib/push';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.endpoint) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    removeSubscription(body.endpoint);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to unsubscribe:', error);
    return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 });
  }
}
