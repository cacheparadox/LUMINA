'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';
import AppShell from '@/components/AppShell';
import { Heart, Plus, Sparkles } from 'lucide-react';
import { format, isToday } from 'date-fns';

const GRATITUDE_PROMPTS = [
  "What made you smile today — even just a little?",
  "Name three things you're proud of yourself for.",
  "What simple pleasure did you enjoy recently?",
  "Who or what are you most thankful for right now?",
  "What's a challenge that taught you something valuable?",
  "What part of your day would you relive?",
  "What's something beautiful you noticed today?",
  "Who made your day a little brighter?",
];

export default function GratitudePage() {
  const [newGratitude, setNewGratitude] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState(
    GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)]
  );

  const gratitudeEntries = useLiveQuery(
    () => db.gratitude.orderBy('createdAt').reverse().limit(50).toArray(),
    []
  );

  const todayCount = gratitudeEntries?.filter(e => isToday(new Date(e.createdAt))).length || 0;

  const handleAdd = async () => {
    if (!newGratitude.trim()) return;
    await db.gratitude.add({
      text: newGratitude.trim(),
      promptText: currentPrompt,
      createdAt: new Date(),
    });
    setNewGratitude('');
    setCurrentPrompt(GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)]);
  };

  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Heart size={24} style={{ color: 'var(--pink-300)' }} />
            Gratitude Garden
          </h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 28 }}>
            Nurture what makes your heart full
          </p>
        </motion.div>

        {/* Today's count */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-static"
          style={{
            padding: 20,
            marginBottom: 24,
            textAlign: 'center',
            background: 'linear-gradient(135deg, var(--glass-bg), rgba(244, 160, 181, 0.06))',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 4 }}>🌸</div>
          <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--pink-400)' }}>
            {todayCount}
          </p>
          <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>
            grateful moments today
          </p>
        </motion.div>

        {/* Prompt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-static"
          style={{
            padding: 24,
            marginBottom: 24,
            background: 'linear-gradient(135deg, var(--glass-bg), rgba(196, 181, 224, 0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
            <Sparkles size={16} style={{ color: 'var(--lavender-400)', marginTop: 2 }} />
            <p style={{
              fontSize: 15,
              color: 'var(--neutral-600)',
              fontFamily: 'var(--font-journal)',
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}>
              {currentPrompt}
            </p>
          </div>

          <textarea
            value={newGratitude}
            onChange={e => setNewGratitude(e.target.value)}
            placeholder="I'm grateful for..."
            style={{
              width: '100%',
              minHeight: 80,
              padding: 12,
              background: 'var(--neutral-100)',
              border: '1px solid var(--neutral-200)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-journal)',
              fontSize: 15,
              color: 'var(--neutral-800)',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.6,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <motion.button
              className="btn-primary"
              onClick={handleAdd}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!newGratitude.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: newGratitude.trim() ? 1 : 0.5,
                fontSize: 13, padding: '8px 20px',
              }}
            >
              <Plus size={14} />
              Add Gratitude
            </motion.button>
          </div>
        </motion.div>

        {/* Past entries */}
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 12 }}>
          Your Grateful Moments
        </h3>

        {(!gratitudeEntries || gratitudeEntries.length === 0) ? (
          <div className="glass-card-static" style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--neutral-400)' }}>
              Start planting seeds of gratitude 🌱
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {gratitudeEntries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card-static"
                style={{ padding: 16 }}
              >
                <p style={{
                  fontSize: 14,
                  color: 'var(--neutral-700)',
                  fontFamily: 'var(--font-journal)',
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}>
                  {entry.text}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--neutral-400)' }}>
                    {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
                  </span>
                  {isToday(new Date(entry.createdAt)) && (
                    <span style={{ fontSize: 10, color: 'var(--pink-400)', fontWeight: 500 }}>
                      today 🌸
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
