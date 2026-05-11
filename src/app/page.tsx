'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedPrompts } from '@/lib/db';
import type { JournalEntry } from '@/lib/db';
import { MOOD_CONFIG, formatRelativeDate } from '@/lib/utils';
import EntryCard from '@/components/EntryCard';
import AppShell from '@/components/AppShell';
import { useRouter } from 'next/navigation';
import { PenLine, Sparkles, Sun, CloudRain, Moon as MoonIcon, Sunrise } from 'lucide-react';

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours();
  if (hour < 6) return { text: 'Late night thoughts?', icon: <MoonIcon size={20} /> };
  if (hour < 12) return { text: 'Good morning', icon: <Sunrise size={20} /> };
  if (hour < 17) return { text: 'Good afternoon', icon: <Sun size={20} /> };
  if (hour < 21) return { text: 'Good evening', icon: <CloudRain size={20} /> };
  return { text: 'Quiet night', icon: <MoonIcon size={20} /> };
}

export default function JournalPage() {
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);
  const greeting = getGreeting();

  useEffect(() => {
    seedPrompts().then(() => setInitialized(true));
  }, []);

  const entries = useLiveQuery(
    () => db.entries.orderBy('createdAt').reverse().limit(50).toArray(),
    []
  );

  const todayPrompt = useLiveQuery(async () => {
    const all = await db.prompts.toArray();
    if (all.length === 0) return null;
    // Use day of year as seed for "daily" prompt
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    return all[dayOfYear % all.length];
  }, []);

  const todayEntries = entries?.filter(e => {
    const today = new Date();
    const entryDate = new Date(e.createdAt);
    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    );
  });

  const recentMood = todayEntries && todayEntries.length > 0
    ? Math.round(todayEntries.reduce((sum, e) => sum + e.mood, 0) / todayEntries.length)
    : null;

  if (!initialized) {
    return (
      <AppShell>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}>
          <div className="shimmer-bg" style={{
            width: 200,
            height: 24,
            borderRadius: 'var(--radius-md)',
          }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-enter">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ color: 'var(--pink-300)' }}>{greeting.icon}</span>
            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--neutral-700)',
            }}>
              {greeting.text}
            </h1>
          </div>
          <p style={{
            fontSize: 14,
            color: 'var(--neutral-400)',
            marginLeft: 30,
            fontStyle: 'italic',
          }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>

        {/* Today's Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card"
          style={{
            padding: 24,
            marginBottom: 24,
            background: 'linear-gradient(135deg, var(--glass-bg), rgba(244, 160, 181, 0.06))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 8 }}>
                Memory Garden
              </h2>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--pink-400)' }}>
                    {todayEntries?.length || 0}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--neutral-400)', marginLeft: 6 }}>
                    {todayEntries?.length === 1 ? 'memory' : 'memories'}
                  </span>
                </div>
                {recentMood && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 28 }}>
                      {MOOD_CONFIG[recentMood as keyof typeof MOOD_CONFIG]?.emoji}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--neutral-400)' }}>
                      Feeling {MOOD_CONFIG[recentMood as keyof typeof MOOD_CONFIG]?.label?.toLowerCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <motion.button
              className="btn-primary"
              onClick={() => router.push('/new')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <PenLine size={16} />
              New Memory
            </motion.button>
          </div>
        </motion.div>

        {/* Daily Prompt */}
        {todayPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card"
            style={{
              padding: 20,
              marginBottom: 24,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--glass-bg), rgba(196, 181, 224, 0.08))',
            }}
            onClick={() => router.push(`/new?prompt=${encodeURIComponent(todayPrompt.text)}`)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--lavender-200), var(--pink-100))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Sparkles size={16} color="var(--lavender-500)" />
              </div>
              <div>
                <p style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--lavender-400)',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 4,
                }}>
                  Today&apos;s Reflection
                </p>
                <p style={{
                  fontSize: 15,
                  color: 'var(--neutral-600)',
                  fontFamily: 'var(--font-journal)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}>
                  &ldquo;{todayPrompt.text}&rdquo;
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Entries List */}
        <div>
          <h2 style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--neutral-600)',
            marginBottom: 16,
          }}>
            Recent Memories
          </h2>

          {(!entries || entries.length === 0) ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card"
              style={{
                padding: 48,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
              <h3 style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--neutral-600)',
                marginBottom: 8,
              }}>
                Your memory garden awaits
              </h3>
              <p style={{
                fontSize: 14,
                color: 'var(--neutral-400)',
                marginBottom: 20,
                maxWidth: 300,
                margin: '0 auto 20px',
                lineHeight: 1.6,
              }}>
                Plant your first thought and watch your emotional landscape bloom over time.
              </p>
              <button
                className="btn-primary"
                onClick={() => router.push('/new')}
              >
                Plant a Memory ✨
              </button>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {entries.map((entry, i) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onClick={() => router.push(`/entry/${entry.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
