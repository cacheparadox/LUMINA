'use client';

import Sidebar from '@/components/Sidebar';
import AmbientBackground from '@/components/AmbientBackground';
import QuickCapture from '@/components/QuickCapture';
import { usePathname } from 'next/navigation';

const HIDE_FAB_ROUTES = ['/new', '/settings', '/customize', '/chat', '/breathe'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
