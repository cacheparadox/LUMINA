import fs from 'fs';
import path from 'path';
import webpush from 'web-push';

const DATA_DIR = path.join(process.cwd(), 'data');
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');
const SUBS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export function getVapidKeys(): VapidKeys {
  ensureDataDir();
  if (fs.existsSync(VAPID_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
      if (data.publicKey && data.privateKey) {
        return data;
      }
    } catch (e) {
      console.error('Error reading VAPID file, regenerating keys...', e);
    }
  }

  // Generate new keys
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2), 'utf-8');
  console.log('Generated new VAPID keys in data/vapid.json');
  return keys;
}

export function getSubscriptions(): any[] {
  ensureDataDir();
  if (fs.existsSync(SUBS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8'));
    } catch (e) {
      console.error('Error reading subscriptions file, resetting...', e);
    }
  }
  return [];
}

export function saveSubscription(subscription: any) {
  ensureDataDir();
  const subs = getSubscriptions();
  // Avoid duplicate subscriptions by comparing endpoints
  const exists = subs.some((s) => s.endpoint === subscription.endpoint);
  if (!exists) {
    subs.push(subscription);
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
  }
}

export function removeSubscription(endpoint: string) {
  ensureDataDir();
  const subs = getSubscriptions();
  const filtered = subs.filter((s) => s.endpoint !== endpoint);
  fs.writeFileSync(SUBS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
}

export async function sendTickle(subscription: any, isTest: boolean = false) {
  const keys = getVapidKeys();
  
  webpush.setVapidDetails(
    'mailto:lumina-app@example.com',
    keys.publicKey,
    keys.privateKey
  );

  try {
    // Send a simple tickle payload.
    // If isTest is true, the service worker will bypass filters (DND/frequency)
    const payload = JSON.stringify({ test: isTest, timestamp: Date.now() });
    await webpush.sendNotification(subscription, payload);
    return true;
  } catch (error: any) {
    // If the subscription has expired or is invalid, remove it
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`Subscription expired (status ${error.statusCode}), removing endpoint:`, subscription.endpoint);
      removeSubscription(subscription.endpoint);
    } else {
      console.error('Failed to send push notification to subscription:', subscription.endpoint, error);
    }
    return false;
  }
}

export async function sendTickleToAll() {
  const subs = getSubscriptions();
  console.log(`Sending tickle push notifications to ${subs.length} subscribers...`);
  let successCount = 0;
  for (const sub of subs) {
    const success = await sendTickle(sub);
    if (success) successCount++;
  }
  return { total: subs.length, success: successCount };
}

// ── Local Daemon interval trigger ────────────────────────────────
// In local development, we want pushes to run automatically.
// We start an interval when this module is loaded on the server.
let tickleDaemonStarted = false;
export function startTickleDaemon() {
  if (tickleDaemonStarted) return;
  tickleDaemonStarted = true;
  
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  console.log(`Starting Local Push Tickle Daemon (interval: 30 minutes)`);
  
  setInterval(async () => {
    try {
      await sendTickleToAll();
    } catch (e) {
      console.error('Error in Push Tickle Daemon loop:', e);
    }
  }, INTERVAL_MS);
}
