'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '@/components/AppShell';
import { Wind, ArrowLeft, Play, Pause } from 'lucide-react';
import { useRouter } from 'next/navigation';

const EXERCISES = [
  {
    id: 'box',
    name: 'Box Breathing',
    desc: 'Equal parts inhale, hold, exhale, hold. Calms anxiety.',
    steps: [
      { label: 'Inhale', duration: 4, scale: 1.6, color: 'var(--lavender-300)' },
      { label: 'Hold', duration: 4, scale: 1.6, color: 'var(--gold-300)' },
      { label: 'Exhale', duration: 4, scale: 1, color: 'var(--sage-300)' },
      { label: 'Hold', duration: 4, scale: 1, color: 'var(--pink-200)' },
    ],
    emoji: '📦',
  },
  {
    id: '478',
    name: '4-7-8 Sleep',
    desc: 'The "relaxing breath." Fall asleep faster.',
    steps: [
      { label: 'Inhale', duration: 4, scale: 1.6, color: 'var(--lavender-400)' },
      { label: 'Hold', duration: 7, scale: 1.6, color: 'var(--gold-300)' },
      { label: 'Exhale', duration: 8, scale: 1, color: 'var(--sage-300)' },
    ],
    emoji: '🌙',
  },
  {
    id: 'calm',
    name: 'Calm Down',
    desc: 'Long exhale activates rest-and-digest. For panic moments.',
    steps: [
      { label: 'Inhale', duration: 3, scale: 1.5, color: 'var(--lavender-300)' },
      { label: 'Exhale', duration: 6, scale: 1, color: 'var(--sage-300)' },
    ],
    emoji: '🕊️',
  },
  {
    id: 'energize',
    name: 'Energize',
    desc: 'Quick rhythmic breathing to wake you up.',
    steps: [
      { label: 'Inhale', duration: 2, scale: 1.5, color: 'var(--pink-300)' },
      { label: 'Exhale', duration: 2, scale: 1, color: 'var(--gold-300)' },
    ],
    emoji: '⚡',
  },
  {
    id: 'focus',
    name: 'Deep Focus',
    desc: 'Measured breaths for deep concentration.',
    steps: [
      { label: 'Inhale', duration: 5, scale: 1.6, color: 'var(--lavender-400)' },
      { label: 'Hold', duration: 2, scale: 1.6, color: 'var(--gold-300)' },
      { label: 'Exhale', duration: 5, scale: 1, color: 'var(--sage-300)' },
      { label: 'Hold', duration: 2, scale: 1, color: 'var(--pink-200)' },
    ],
    emoji: '🎯',
  },
];

export default function BreathePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<typeof EXERCISES[0] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cycles, setCycles] = useState(0);
  const timerRef = useRef<any>(null);

  const currentStep = selected ? selected.steps[stepIdx] : null;

  useEffect(() => {
    if (!isRunning || !selected) return;
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const step = selected.steps[stepIdx];
        if (prev + 1 >= step.duration) {
          const nextIdx = (stepIdx + 1) % selected.steps.length;
          if (nextIdx === 0) setCycles(c => c + 1);
          setStepIdx(nextIdx);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isRunning, stepIdx, selected]);

  const handleStop = () => {
    setIsRunning(false);
    setStepIdx(0);
    setElapsed(0);
    clearInterval(timerRef.current);
  };

  const handleBack = () => {
    handleStop();
    setCycles(0);
    setSelected(null);
  };

  // Active breathing session
  if (selected && isRunning) {
    const step = selected.steps[stepIdx];
    const progress = elapsed / step.duration;
    return (
      <AppShell>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', textAlign: 'center' }}>
          <button onClick={handleBack} className="btn-ghost" style={{ position: 'absolute', top: 24, left: 20, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--neutral-400)' }}>
            <ArrowLeft size={16} /> Back
          </button>

          <p style={{ fontSize: 12, color: 'var(--neutral-400)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            {selected.name} · Cycle {cycles + 1}
          </p>

          {/* Breathing Circle */}
          <div style={{ position: 'relative', width: 220, height: 220, marginBottom: 32 }}>
            {/* Outer ring progress */}
            <svg width={220} height={220} style={{ position: 'absolute', top: 0, left: 0 }}>
              <circle cx={110} cy={110} r={100} fill="none" stroke="var(--neutral-100)" strokeWidth={4} />
              <motion.circle
                cx={110} cy={110} r={100}
                fill="none"
                stroke={step.color}
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray={628}
                animate={{ strokeDashoffset: 628 * (1 - progress) }}
                transition={{ duration: 0.3 }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            </svg>
            {/* Inner breathing orb */}
            <motion.div
              animate={{ scale: step.scale }}
              transition={{ duration: step.duration, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 100, height: 100,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${step.color}, transparent)`,
                opacity: 0.6,
                filter: 'blur(8px)',
              }}
            />
            <motion.div
              animate={{ scale: step.scale }}
              transition={{ duration: step.duration, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 60, height: 60,
                borderRadius: '50%',
                background: step.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 40px ${step.color}`,
              }}
            />
          </div>

          <motion.p
            key={step.label + stepIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4 }}
          >
            {step.label}
          </motion.p>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)' }}>
            {step.duration - elapsed}s
          </p>

          <button onClick={handleStop} className="btn-ghost" style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--neutral-500)' }}>
            <Pause size={16} /> Stop
          </button>
        </div>
      </AppShell>
    );
  }

  // Selected exercise preview
  if (selected) {
    return (
      <AppShell>
        <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
          <button onClick={handleBack} className="btn-ghost" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--neutral-400)', marginBottom: 24 }}>
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ fontSize: 56, marginBottom: 16 }}>{selected.emoji}</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 8 }}>{selected.name}</h2>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 24, maxWidth: 300 }}>{selected.desc}</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {selected.steps.map((s, i) => (
              <div key={i} style={{ padding: '8px 14px', borderRadius: 'var(--radius-full)', background: `${s.color}20`, color: s.color, fontSize: 13, fontWeight: 600 }}>
                {s.label} {s.duration}s
              </div>
            ))}
          </div>

          <motion.button
            className="btn-primary"
            onClick={() => setIsRunning(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 32px', fontSize: 16 }}
          >
            <Play size={18} /> Begin
          </motion.button>
        </div>
      </AppShell>
    );
  }

  // Exercise list
  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wind size={24} style={{ color: 'var(--lavender-400)' }} />
            Calming Corner
          </h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 28 }}>
            Breathe your way to stillness
          </p>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {EXERCISES.map((ex, i) => (
            <motion.button
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card-static"
              onClick={() => setSelected(ex)}
              style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', border: 'none', textAlign: 'left', width: '100%' }}
            >
              <div style={{ fontSize: 32, width: 48, textAlign: 'center', flexShrink: 0 }}>{ex.emoji}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 4 }}>{ex.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--neutral-400)', lineHeight: 1.4 }}>{ex.desc}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {ex.steps.map((s, j) => (
                    <span key={j} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: `${s.color}15`, color: s.color, fontWeight: 600 }}>
                      {s.label} {s.duration}s
                    </span>
                  ))}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
