import { NextResponse } from 'next/server';
import { getVapidKeys, saveSubscription, startTickleDaemon } from '@/lib/push';

// GET: Returns the public VAPID key so the client can register
export async function GET() {
  try {
    const keys = getVapidKeys();
    return NextResponse.json({ publicKey: keys.publicKey });
  } catch (error: any) {
    console.error('Failed to get VAPID keys:', error);
    return NextResponse.json({ error: 'Failed to retrieve push key' }, { status: 500 });
  }
}

// POST: Registers a new subscription
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }

    saveSubscription(body);
    
    // In local dev/production Node environment, start the periodic push daemon
    startTickleDaemon();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to register subscription:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
