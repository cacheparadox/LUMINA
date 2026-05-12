'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Mic, Camera, X, Heart, Sparkles, MessageCircle, Rewind, Wind } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let timeout: any;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsScrolling(false), 800);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => { window.removeEventListener('scroll', handleScroll); clearTimeout(timeout); };
  }, []);

  const actions = [
    { icon: PenLine, label: 'New Entry', action: () => { router.push('/new'); setIsOpen(false); }, color: 'var(--pink-300)' },
    { icon: Mic, label: 'Voice Note', action: () => { router.push('/new?mode=voice'); setIsOpen(false); }, color: 'var(--lavender-400)' },
    { icon: Camera, label: 'Photo', action: () => { router.push('/new?mode=photo'); setIsOpen(false); }, color: 'var(--gold-300)' },
    { icon: Heart, label: 'Gratitude', action: () => { router.push('/gratitude'); setIsOpen(false); }, color: 'var(--pink-400)' },
    { icon: Sparkles, label: 'Prompts', action: () => { router.push('/prompts'); setIsOpen(false); }, color: 'var(--lavender-300)' },
    { icon: MessageCircle, label: 'AI Chat', action: () => { router.push('/chat'); setIsOpen(false); }, color: 'var(--sage-300)' },
    { icon: Rewind, label: 'Rewind', action: () => { router.push('/rewind'); setIsOpen(false); }, color: 'var(--gold-300)' },
    { icon: Wind, label: 'Calm Corner', action: () => { router.push('/breathe'); setIsOpen(false); }, color: 'var(--lavender-400)' },
  ];

  return (
    <>
      {/* FAB Button — uses favicon */}
      <motion.button
        className="fab"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{
          scale: isScrolling && !isOpen ? 0.8 : 1,
          opacity: isScrolling && !isOpen ? 0.5 : 1,
          y: isScrolling && !isOpen ? 20 : 0
        }}
        transition={{ duration: 0.3 }}
        aria-label="Quick capture"
        style={{ padding: 0, overflow: 'hidden' }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
        >
          {isOpen ? (
            <X size={24} />
          ) : (
            <img src="/favicon.png" alt="LUMINA" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
          )}
        </motion.div>
      </motion.button>

      {/* Expanded Quick Capture */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(16, 14, 10, 0.3)', backdropFilter: 'blur(4px)', zIndex: 99 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{ position: 'fixed', bottom: 160, right: 24, zIndex: 101, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}
            >
              {actions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={action.action}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 14px',
                      background: 'var(--cream-50)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-full)',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                      fontSize: 13, fontWeight: 500,
                      color: 'var(--neutral-600)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <span>{action.label}</span>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${action.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={14} style={{ color: action.color }} />
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
