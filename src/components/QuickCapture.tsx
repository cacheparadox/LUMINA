'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, PenLine, Mic, Camera, X } from 'lucide-react';
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
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, []);

  const actions = [
    { icon: PenLine, label: 'New Entry', action: () => { router.push('/new'); setIsOpen(false); } },
    { icon: Mic, label: 'Voice Note', action: () => { router.push('/new?mode=voice'); setIsOpen(false); } },
    { icon: Camera, label: 'Photo', action: () => { router.push('/new?mode=photo'); setIsOpen(false); } },
  ];

  return (
    <>
      {/* FAB Button */}
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
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X size={24} /> : <Plus size={24} />}
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
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(16, 14, 10, 0.3)',
                backdropFilter: 'blur(4px)',
                zIndex: 99,
              }}
              onClick={() => setIsOpen(false)}
            />

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                position: 'fixed',
                bottom: 160,
                right: 24,
                zIndex: 101,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                alignItems: 'flex-end',
              }}
            >
              {actions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={action.action}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      background: 'var(--cream-50)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-full)',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--neutral-600)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <span>{action.label}</span>
                    <Icon size={16} />
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
