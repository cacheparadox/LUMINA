'use client';

import { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import PinLock from '@/components/PinLock';
import { db, getSetting, getThemePref, seedPrompts } from '@/lib/db';

const FONT_OPTIONS: Record<string, string> = {
  outfit: "'Outfit', sans-serif",
  crimson: "'Crimson Text', serif",
  georgia: "Georgia, serif",
  system: "-apple-system, BlinkMacSystemFont, sans-serif",
};

export default function AppGuard({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [showPinLock, setShowPinLock] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedPrompts();
    
    // Restore theme prefs
    (async () => {
      const theme = await getThemePref('color_theme');
      if (theme) document.documentElement.setAttribute('data-theme', theme);

      const font = await getThemePref('journal_font');
      if (font && FONT_OPTIONS[font]) {
        document.documentElement.style.setProperty('--font-journal', FONT_OPTIONS[font]);
      }
    })();
  }, []);

  const triggerAutoBackup = async () => {
    const autoBackup = await getSetting('auto_backup');
    if (autoBackup !== 'true') return;

    const today = new Date().toISOString().split('T')[0];
    const lastBackup = localStorage.getItem('lumina_last_backup');
    
    if (lastBackup !== today) {
      localStorage.setItem('lumina_last_backup', today);
      const entries = await db.entries.toArray();
      const moods = await db.moods.toArray();
      const habits = await db.habits.toArray();
      const gratitude = await db.gratitude.toArray();
      const data = { entries, moods, habits, gratitude, exportedAt: new Date().toISOString(), version: '2.0', autoBackup: true };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumina-daily-backup-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSplashDone = async () => {
    setShowSplash(false);
    triggerAutoBackup();
    
    // Check if PIN is enabled
    const pinEnabled = await getSetting('pin_enabled');
    if (pinEnabled === 'true') {
      setShowPinLock(true);
    } else {
      setReady(true);
    }
  };

  const handleUnlock = () => {
    setShowPinLock(false);
    setReady(true);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashDone} />;
  }

  if (showPinLock) {
    return <PinLock onUnlock={handleUnlock} />;
  }

  if (!ready) return null;

  return <>{children}</>;
}
