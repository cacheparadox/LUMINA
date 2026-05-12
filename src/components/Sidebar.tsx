'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, BarChart3, Calendar,
  Heart, Sparkles, MessageCircle, Settings, Search,
  Menu, X, Feather, Image as ImageIcon, ListChecks,
  Palette, Rewind, Wind
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const NAV_ITEMS = [
  { href: '/', label: 'Journal', icon: BookOpen },
  { href: '/timeline', label: 'Timeline', icon: Feather },
  { href: '/mood', label: 'Mood', icon: BarChart3 },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/photos', label: 'Photos', icon: ImageIcon },
  { href: '/habits', label: 'Rituals', icon: ListChecks },
  { href: '/breathe', label: 'Calm Corner', icon: Wind },
  { href: '/customize', label: 'Customize', icon: Palette },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV = [
  { href: '/', label: 'Journal', icon: BookOpen },
  { href: '/mood', label: 'Mood', icon: BarChart3 },
  { href: '/habits', label: 'Rituals', icon: ListChecks },
  { href: '/timeline', label: 'Timeline', icon: Feather },
  { href: '/settings', label: 'More', icon: Menu },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar hidden md:flex flex-col w-[240px] h-screen fixed left-0 top-0 z-10">
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--pink-300), var(--lavender-400))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} color="white" />
            </div>
            <span className="text-gradient" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '2px', fontFamily: 'var(--font-body)' }}>
              LUMINA
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
            <p style={{ fontSize: 11, color: 'var(--neutral-400)', paddingLeft: 46, fontStyle: 'italic' }}>
              your emotional OS
            </p>
            <NotificationBell />
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 12px' }}>
          <button
            onClick={() => router.push('/search')}
            className="btn-ghost"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', color: 'var(--neutral-400)', fontSize: 13, border: '1px solid var(--neutral-200)', borderRadius: 'var(--radius-md)' }}
          >
            <Search size={14} />
            Search memories...
          </button>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: isActive ? undefined : 'none', cursor: 'pointer', marginBottom: 2 }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--glass-border)', fontSize: 11, color: 'var(--neutral-400)', textAlign: 'center' }}>
          ✨ Your thoughts are safe here
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav md:hidden">
        {MOBILE_NAV.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => {
                if (item.href === '/settings' && item.label === 'More') {
                  setIsOpen(true);
                } else {
                  router.push(item.href);
                }
              }}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="modal-overlay md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ padding: 24 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span className="text-gradient" style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>LUMINA</span>
                <button onClick={() => setIsOpen(false)} className="btn-ghost" style={{ padding: 8 }}>
                  <X size={20} />
                </button>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {NAV_ITEMS.map(item => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => { router.push(item.href); setIsOpen(false); }}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      style={{ border: 'none', background: isActive ? undefined : 'none', cursor: 'pointer' }}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
