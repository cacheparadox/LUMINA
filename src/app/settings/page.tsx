'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, getSetting, setSetting } from '@/lib/db';
import { getAIConfig, saveAIConfig } from '@/lib/ai';
import { requestNotificationPermission } from '@/lib/notifications';
import AppShell from '@/components/AppShell';
import PinLock from '@/components/PinLock';
import { Settings as SettingsIcon, Key, Cpu, Download, Upload, Trash2, Shield, Lock, Palette, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState('');
  const [saved, setSaved] = useState(false);
  const [entryCount, setEntryCount] = useState(0);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [autoBackup, setAutoBackup] = useState(false);

  useEffect(() => {
    const config = getAIConfig();
    if (config) {
      setApiKey(config.apiKey);
      setModels(config.models.join(', '));
    }
    db.entries.count().then(setEntryCount);
    getSetting('pin_enabled').then(v => setPinEnabled(v === 'true'));
    getSetting('auto_backup').then(v => setAutoBackup(v === 'true'));
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

  const handleTogglePin = async () => {
    if (pinEnabled) {
      await setSetting('pin_enabled', 'false');
      setPinEnabled(false);
    } else {
      const existingPin = await getSetting('pin_lock');
      if (!existingPin) {
        setShowPinSetup(true);
      } else {
        await setSetting('pin_enabled', 'true');
        setPinEnabled(true);
      }
    }
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

  const handleToggleNotif = async () => {
    const granted = await requestNotificationPermission();
    setNotifEnabled(granted);
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
        if (data.entries) await db.entries.bulkPut(data.entries);
        if (data.moods) await db.moods.bulkPut(data.moods);
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

  if (showPinSetup) {
    return <PinLock onUnlock={async () => {
      await setSetting('pin_enabled', 'true');
      setPinEnabled(true);
      setShowPinSetup(false);
    }} />;
  }

  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <SettingsIcon size={24} style={{ color: 'var(--pink-300)' }} />
            Settings
          </h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 28 }}>
            Customize your LUMINA experience
          </p>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={18} style={{ color: 'var(--pink-400)' }} /> Security
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--neutral-700)' }}>PIN Lock</p>
              <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Require a 4-digit PIN to open LUMINA</p>
            </div>
            <button onClick={handleTogglePin} style={{
              width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
              background: pinEnabled ? 'linear-gradient(135deg, var(--pink-300), var(--lavender-400))' : 'var(--neutral-200)',
              position: 'relative', transition: 'all 0.3s',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: pinEnabled ? 25 : 3,
                transition: 'left 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
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
