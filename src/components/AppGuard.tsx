'use client';

import { useState, useEffect } from 'react';
import SplashScreen from '@/components/SplashScreen';
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
  const [ready, setReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

    if (!showSplash) {
      (async () => {
        // Data Migration: Ensure all createdAt are Date objects (fixes mixed-type index lag)
        const entries = await db.entries.toArray();
        const needsFix = entries.filter(e => typeof e.createdAt === 'string');
        if (needsFix.length > 0) {
          console.log(`LUMINA: Fixing ${needsFix.length} entries with string dates...`);
          for (const entry of needsFix) {
            await db.entries.update(entry.id!, {
              createdAt: new Date(entry.createdAt),
              updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : new Date()
            });
          }
        }

        setReady(true);
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
    setReady(true);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashDone} />;
  }

  if (!ready) return null;

  const showFab = !HIDE_FAB_ROUTES.includes(pathname) && !pathname.startsWith('/entry/');

  return (
    <>
      <AmbientBackground />
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main style={{
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
        transition: 'margin-left 0.3s ease',
      }}
        className={sidebarCollapsed ? "md:ml-[80px]" : "md:ml-[240px] md:pb-0"}
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
