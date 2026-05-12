'use client';

import { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
import PinLock from '@/components/PinLock';
import Sidebar from '@/components/Sidebar';
import AmbientBackground from '@/components/AmbientBackground';
import QuickCapture from '@/components/QuickCapture';
import { usePathname } from 'next/navigation';
import { db, getSetting, getThemePref, seedPrompts } from '@/lib/db';

const FONT_OPTIONS: Record<string, string> = {
  outfit: "'Outfit', sans-serif",
  crimson: "'Crimson Text', serif",
  georgia: "Georgia, serif",
  system: "-apple-system, BlinkMacSystemFont, sans-serif",
};

const HIDE_FAB_ROUTES = ['/new', '/settings', '/customize', '/chat', '/breathe'];

export default function AppGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('lumina_splash_shown')) {
      return false;
    }
    return true;
  });
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

    // Check PIN even if splash is skipped
    if (!showSplash) {
      (async () => {
        const pinEnabled = await getSetting('pin_enabled');
        if (pinEnabled === 'true') {
          setShowPinLock(true);
        } else {
          setReady(true);
        }
      })();
    }
  }, [showSplash]);

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
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('lumina_splash_shown', 'true');
    }
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

  const showFab = !HIDE_FAB_ROUTES.includes(pathname) && !pathname.startsWith('/entry/');

  return (
    <>
      <AmbientBackground />
      <Sidebar />
      <main style={{
        paddingBottom: 80,
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
      }}
        className="md:ml-[240px]"
      >
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '24px 20px',
        }}>
          {children}
        </div>
      </main>
      {showFab && <QuickCapture />}
    </>
  );
}
