'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, getSetting, setSetting } from '@/lib/db';
import { getAIConfig, saveAIConfig } from '@/lib/ai';
import { requestNotificationPermission } from '@/lib/notifications';
import AppShell from '@/components/AppShell';
import { Settings as SettingsIcon, Key, Cpu, Download, Upload, Trash2, Shield, Lock, Palette, RefreshCw, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Helper to convert VAPID public key (base64url) to UInt8Array for push manager subscription
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState('');
  const [saved, setSaved] = useState(false);
  const [entryCount, setEntryCount] = useState(0);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [autoBackup, setAutoBackup] = useState(false);
  const [ntfyEnabled, setNtfyEnabled] = useState(false);
  const [ntfyChannel, setNtfyChannel] = useState('');
  const [ntfyReminderTopic, setNtfyReminderTopic] = useState('');

  // ── PWA Push Notification States ──
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushFrequency, setPushFrequency] = useState('4');
  const [pushStartTime, setPushStartTime] = useState('09:00');
  const [pushEndTime, setPushEndTime] = useState('21:00');
  const [pushTesting, setPushTesting] = useState(false);
  const [pushSubscribing, setPushSubscribing] = useState(false);

  useEffect(() => {
    const config = getAIConfig();
    if (config) {
      setApiKey(config.apiKey);
      setModels(config.models.join(', '));
    }
    db.entries.count().then(setEntryCount);
    getSetting('auto_backup').then(v => setAutoBackup(v === 'true'));
    getSetting('ntfy_enabled').then(v => setNtfyEnabled(v === 'true'));
    getSetting('ntfy_channel').then(v => setNtfyChannel(v || ''));
    getSetting('ntfy_reminder_topic').then(v => setNtfyReminderTopic(v || ''));
    getSetting('push_notifications_enabled').then(v => setPushEnabled(v === 'true'));
    getSetting('push_frequency').then(v => setPushFrequency(v || '4'));
    getSetting('push_start_time').then(v => setPushStartTime(v || '09:00'));
    getSetting('push_end_time').then(v => setPushEndTime(v || '21:00'));
    setNotifEnabled(typeof window !== 'undefined' && Notification.permission === 'granted');
  }, []);

  const handleSaveAI = () => {
    saveAIConfig({
      apiKey,
      models: models.split(',').map(m => m.trim()).filter(Boolean),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };


  const handleToggleAutoBackup = async () => {
    if (autoBackup) {
      await setSetting('auto_backup', 'false');
      setAutoBackup(false);
    } else {
      await setSetting('auto_backup', 'true');
      setAutoBackup(true);
    }
  };

  const handleToggleNtfy = async () => {
    const newState = !ntfyEnabled;
    await setSetting('ntfy_enabled', newState ? 'true' : 'false');
    setNtfyEnabled(newState);
  };

  const handleSaveNtfyChannel = async () => {
    await setSetting('ntfy_channel', ntfyChannel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleToggleNotif = async () => {
    const granted = await requestNotificationPermission();
    setNotifEnabled(granted);
  };

  const handleTogglePush = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      alert('Service workers are not supported in this browser environment.');
      return;
    }

    setPushSubscribing(true);
    try {
      if (pushEnabled) {
        // Disable Push
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
          await subscription.unsubscribe();
        }
        await setSetting('push_notifications_enabled', 'false');
        setPushEnabled(false);
      } else {
        // Enable Push
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Notification permission was denied. Please allow notifications in your browser first.');
          setPushSubscribing(false);
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        
        // Fetch VAPID public key
        const response = await fetch('/api/push/subscribe');
        if (!response.ok) throw new Error('Failed to retrieve push settings from server');
        const { publicKey } = await response.json();
        
        // Subscribe to Push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // Register subscription on backend
        const regRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        if (!regRes.ok) throw new Error('Failed to register device subscription on server');

        await setSetting('push_notifications_enabled', 'true');
        setPushEnabled(true);
      }
    } catch (e: any) {
      console.error(e);
      alert('Failed to configure PWA Push Notifications: ' + e.message);
    } finally {
      setPushSubscribing(false);
    }
  };

  const handleSavePushParams = async () => {
    await setSetting('push_frequency', pushFrequency);
    await setSetting('push_start_time', pushStartTime);
    await setSetting('push_end_time', pushEndTime);

    // Sync to Supabase for Ntfy hourly reminders
    getSetting('ntfy_reminder_topic').then(async (topic) => {
      if (topic) {
        try {
          const { supabase } = await import('@/lib/supabase');
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await supabase.from('lumina_devices').upsert(
            { 
              ntfy_topic: topic, 
              push_frequency: parseInt(pushFrequency, 10),
              push_start_time: pushStartTime + ':00', // Ensure HH:MM:SS format
              push_end_time: pushEndTime + ':00',
              timezone: tz
            },
            { onConflict: 'ntfy_topic' }
          );
        } catch (e) {
          console.error('Failed to sync reminder settings to Supabase:', e);
        }
      }
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSendTestNotification = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    setPushTesting(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        alert('Please enable PWA Push Notifications first to register this device.');
        setPushTesting(false);
        return;
      }

      const response = await fetch('/api/push/tickle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });
      if (!response.ok) {
        throw new Error('Server returned an error trying to push test reminder');
      }
    } catch (e: any) {
      console.error(e);
      alert('Failed to trigger test notification: ' + e.message);
    } finally {
      setPushTesting(false);
    }
  };

  const handleExport = async () => {
    const entries = await db.entries.toArray();
    const moods = await db.moods.toArray();
    const habits = await db.habits.toArray();
    const gratitude = await db.gratitude.toArray();
    const data = { entries, moods, habits, gratitude, exportedAt: new Date().toISOString(), version: '2.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Sanitize dates for entries
        if (data.entries) {
          data.entries = data.entries.map((ent: any) => ({
            ...ent,
            createdAt: ent.createdAt ? new Date(ent.createdAt) : new Date(),
            updatedAt: ent.updatedAt ? new Date(ent.updatedAt) : new Date(),
          }));
          await db.entries.bulkPut(data.entries);
        }
        
        // Sanitize dates for moods
        if (data.moods) {
          data.moods = data.moods.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));
          await db.moods.bulkPut(data.moods);
        }

        if (data.habits) await db.habits.bulkPut(data.habits);
        if (data.gratitude) await db.gratitude.bulkPut(data.gratitude);
        
        db.entries.count().then(setEntryCount);
        alert('Data imported successfully!');
      } catch (err) {
        console.error(err);
        alert('Failed to import data. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = async () => {
    if (!confirm('This will delete ALL your journal data permanently. Are you sure?')) return;
    if (!confirm('This action cannot be undone. Really delete everything?')) return;
    await db.entries.clear();
    await db.media.clear();
    await db.moods.clear();
    await db.habits.clear();
    await db.gratitude.clear();
    await db.chatMessages.clear();
    await db.aiMemories.clear();
    await db.reminders.clear();
    await db.emotionalReports.clear();
    setEntryCount(0);
  };


  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <SettingsIcon size={24} style={{ color: 'var(--pink-300)' }} />
            Emotional OS
          </h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 28 }}>
            System configuration and memory management
          </p>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={18} style={{ color: 'var(--pink-400)' }} /> Security
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-700)' }}>Notifications</p>
              <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Gentle check-in reminders & anniversaries</p>
            </div>
            <button onClick={handleToggleNotif} style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: notifEnabled ? 'linear-gradient(135deg, var(--pink-300), var(--lavender-400))' : 'var(--neutral-200)',
              position: 'relative', transition: 'all 0.3s',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: notifEnabled ? 25 : 3,
                transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-700)' }}>Daily Auto Backup</p>
              <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Automatically download backup JSON daily</p>
            </div>
            <button onClick={handleToggleAutoBackup} style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: autoBackup ? 'linear-gradient(135deg, var(--pink-300), var(--lavender-400))' : 'var(--neutral-200)',
              position: 'relative', transition: 'all 0.3s',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: autoBackup ? 25 : 3,
                transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
        </motion.div>

        {/* Reminders & Notifications */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} style={{ color: 'var(--pink-400)' }} /> Reminders & Notifications
          </h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-700)' }}>PWA Push Notifications (Android/Desktop)</p>
              <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Receive personalized reminder pushes</p>
            </div>
            <button onClick={handleTogglePush} disabled={pushSubscribing} style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: pushEnabled ? 'linear-gradient(135deg, var(--pink-300), var(--lavender-400))' : 'var(--neutral-200)',
              position: 'relative', transition: 'all 0.3s', opacity: pushSubscribing ? 0.6 : 1,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: pushEnabled ? 25 : 3,
                transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-700)' }}>Ntfy Daily Reminders (iOS/Web)</p>
              <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Reliable push notifications via Ntfy app</p>
            </div>
            <button onClick={handleToggleNtfy} style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: ntfyEnabled ? 'linear-gradient(135deg, var(--pink-300), var(--lavender-400))' : 'var(--neutral-200)',
              position: 'relative', transition: 'all 0.3s',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: ntfyEnabled ? 25 : 3,
                transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>

          {ntfyEnabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--neutral-100)', borderRadius: 'var(--radius-md)' }}>
                <a 
                  href={`ntfy://ntfy.sh/${ntfyReminderTopic}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-primary" 
                  style={{ textDecoration: 'none', padding: '10px 20px', fontSize: 14, width: '100%', textAlign: 'center' }}
                >
                  Subscribe to your custom reminder
                </a>
              </div>
              <p style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 8, textAlign: 'center' }}>
                Requires the Ntfy app installed on your device.
              </p>
            </motion.div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--neutral-100)', paddingTop: 16 }}>
            {/* Frequency */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 6 }}>
                Reminder Frequency
              </label>
              <select 
                value={pushFrequency} 
                onChange={e => setPushFrequency(e.target.value)} 
                className="input" 
                style={{ width: '100%', background: 'white' }}
              >
                <option value="1">Every hour</option>
                <option value="2">Every 2 hours</option>
                <option value="4">Every 4 hours</option>
                <option value="6">Every 6 hours</option>
                <option value="8">Every 8 hours</option>
                <option value="12">Every 12 hours</option>
                <option value="24">Once a day (Every 24 hours)</option>
              </select>
              <p style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 4 }}>
                How often Lumina should check if you need a reminder nudge.
              </p>
            </div>

            {/* Active Hours / DND */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 6 }}>
                Quiet Hours (DND Filter)
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, color: 'var(--neutral-400)', display: 'block', marginBottom: 2 }}>Reminders Start</span>
                  <input 
                    type="time" 
                    value={pushStartTime} 
                    onChange={e => setPushStartTime(e.target.value)} 
                    className="input" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ color: 'var(--neutral-400)', fontSize: 12, marginTop: 14 }}>to</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 11, color: 'var(--neutral-400)', display: 'block', marginBottom: 2 }}>Reminders End</span>
                  <input 
                    type="time" 
                    value={pushEndTime} 
                    onChange={e => setPushEndTime(e.target.value)} 
                    className="input" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 4 }}>
                Reminders will only ring during this window (e.g. 09:00 to 21:00) so you are not disturbed at night. Applies to both PWA and Ntfy.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-primary" onClick={handleSavePushParams} style={{ fontSize: 13, flex: 1 }}>
                {saved ? 'Saved ✓' : 'Save Reminder Settings'}
              </button>
              {pushEnabled && (
                <button 
                  className="btn-secondary" 
                  onClick={handleSendTestNotification} 
                  disabled={pushTesting}
                  style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
                >
                  {pushTesting ? 'Sending...' : 'Test PWA Push'}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Ntfy Journal Integration */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={18} style={{ color: 'var(--pink-400)' }} /> Ntfy Integration
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-700)' }}>Enable Ntfy Journal Backup</p>
              <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Send written entries to a custom Ntfy channel</p>
            </div>
            <button onClick={handleToggleNtfy} style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: ntfyEnabled ? 'linear-gradient(135deg, var(--pink-300), var(--lavender-400))' : 'var(--neutral-200)',
              position: 'relative', transition: 'all 0.3s',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: ntfyEnabled ? 25 : 3,
                transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
          {ntfyEnabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 4, display: 'block' }}>Ntfy Channel Name</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. my_journal_channel"
                  value={ntfyChannel}
                  onChange={e => setNtfyChannel(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn-primary" onClick={handleSaveNtfyChannel} style={{ padding: '0 16px' }}>Save</button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 8 }}>
                Entries will be sent to <code>https://ntfy.sh/&#123;channel&#125;</code>
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* AI Configuration */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={18} style={{ color: 'var(--lavender-400)' }} /> AI Configuration
          </h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 6 }}>OpenRouter API Key</label>
            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-or-..." className="input" />
            <p style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 4 }}>
              Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--pink-400)' }}>openrouter.ai/keys</a>. Stored locally only.
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 6 }}>
              <Cpu size={12} style={{ display: 'inline', marginRight: 4 }} /> Preferred Models
            </label>
            <input type="text" value={models} onChange={e => setModels(e.target.value)} placeholder="anthropic/claude-3.5-sonnet, openai/gpt-4o-mini" className="input" />
          </div>
          <button className="btn-primary" onClick={handleSaveAI} style={{ fontSize: 13 }}>
            {saved ? 'Saved ✓' : 'Save AI Settings'}
          </button>
        </motion.div>

        {/* Customize link */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card" onClick={() => router.push('/customize')} style={{ padding: 20, marginBottom: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--lavender-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Palette size={20} style={{ color: 'var(--lavender-400)' }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-700)' }}>Aesthetic Customization</p>
            <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Fonts, themes, ambient sounds</p>
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} style={{ color: 'var(--sage-300)' }} /> Data & Privacy
          </h3>
          <p style={{ fontSize: 13, color: 'var(--neutral-500)', marginBottom: 16 }}>
            All data is stored locally on your device. Nothing is sent to any server unless you use AI features.
          </p>
          <p style={{ fontSize: 13, color: 'var(--neutral-500)', marginBottom: 16 }}>
            Total entries: <strong style={{ color: 'var(--pink-400)' }}>{entryCount}</strong>
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <Upload size={14} /> Import Backup
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
            <button className="btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <Download size={14} /> Export Backup
            </button>
            <button className="btn-ghost" onClick={handleClearData} style={{ color: 'var(--pink-500)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> Clear All Data
            </button>
          </div>
        </motion.div>

        {/* About */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card-static" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
          <h3 className="text-gradient" style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, marginBottom: 4 }}>LUMINA</h3>
          <p style={{ fontSize: 12, color: 'var(--neutral-400)', fontStyle: 'italic' }}>
            Life Unfolding through Memory, Introspection & Narrative Analysis
          </p>
          <p style={{ fontSize: 10, color: 'var(--neutral-300)', marginTop: 6 }}>v2.0 — Built with love, for your inner world. 🌸</p>
        </motion.div>
      </div>
    </AppShell>
  );
}
