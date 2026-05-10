'use client';

import Sidebar from '@/components/Sidebar';
import AmbientBackground from '@/components/AmbientBackground';
import QuickCapture from '@/components/QuickCapture';
import AmbientAudio from '@/components/AmbientAudio';
import { usePathname } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDreamSpace = pathname === '/dream';

  return (
    <>
      <AmbientBackground dreamMode={isDreamSpace} />
      {!isDreamSpace && <Sidebar />}
      <main style={{
        marginLeft: isDreamSpace ? 0 : undefined,
        paddingBottom: isDreamSpace ? 0 : 80,
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
      }}
        className={isDreamSpace ? '' : 'md:ml-[240px]'}
      >
        <div style={{
          maxWidth: isDreamSpace ? '100%' : 900,
          margin: isDreamSpace ? 0 : '0 auto',
          padding: isDreamSpace ? 0 : '24px 20px',
        }}>
          {children}
        </div>
      </main>
      {!isDreamSpace && <QuickCapture />}
      <AmbientAudio />
    </>
  );
}
