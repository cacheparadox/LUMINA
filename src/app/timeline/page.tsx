'use client';

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';
import AppShell from '@/components/AppShell';
import EntryCard from '@/components/EntryCard';
import { MOOD_CONFIG, formatRelativeDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Feather, Clock, Star } from 'lucide-react';
import { format, isToday, subYears, isSameDay } from 'date-fns';

export default function TimelinePage() {
  const router = useRouter();

  const entries = useLiveQuery(
    () => db.entries.orderBy('createdAt').reverse().toArray(),
    []
  );

  // "On This Day" - entries from same date in previous years
  const onThisDay = useMemo(() => {
    if (!entries) return [];
    const today = new Date();
    return entries.filter(e => {
      const d = new Date(e.createdAt);
      return d.getMonth() === today.getMonth() &&
             d.getDate() === today.getDate() &&
             d.getFullYear() !== today.getFullYear();
    });
  }, [entries]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    if (!entries) return [];
    const groups: { date: string; entries: typeof entries }[] = [];
    let currentDate = '';

    entries.forEach(entry => {
      const dateKey = format(new Date(entry.createdAt), 'yyyy-MM-dd');
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ date: dateKey, entries: [entry] });
      } else {
        groups[groups.length - 1].entries.push(entry);
      }
    });

    return groups;
  }, [entries]);

  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Feather size={24} style={{ color: 'var(--pink-300)' }} />
            Memory Timeline
          </h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 28 }}>
            Your emotional journey, day by day
          </p>
        </motion.div>

        {/* On This Day */}
        {onThisDay.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card-static"
            style={{
              padding: 20,
              marginBottom: 28,
              background: 'linear-gradient(135deg, var(--glass-bg), rgba(255, 213, 128, 0.08))',
              border: '1px solid rgba(255, 213, 128, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Star size={16} style={{ color: 'var(--gold-300)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)' }}>
                On This Day
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {onThisDay.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => router.push(`/entry/${entry.id}`)}
                  style={{
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-600)' }}>
                      {entry.title || 'Untitled'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--neutral-400)' }}>
                      {format(new Date(entry.createdAt), 'yyyy')}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--neutral-500)', fontFamily: 'var(--font-journal)' }}>
                    {entry.content.slice(0, 100)}...
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timeline */}
        {groupedEntries.length === 0 ? (
          <div className="glass-card-static" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 8 }}>
              An empty canvas
            </h3>
            <p style={{ fontSize: 14, color: 'var(--neutral-400)', fontStyle: 'italic', fontFamily: 'var(--font-journal)' }}>
              "Every memory is a star waiting to be born. Start writing to weave your constellation."
            </p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: 15,
              top: 0,
              bottom: 0,
              width: 2,
              background: 'linear-gradient(180deg, var(--pink-200), var(--lavender-200), var(--neutral-100))',
              borderRadius: 1,
            }} />

            {groupedEntries.map((group, gi) => (
              <motion.div
                key={group.date}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: gi * 0.05 }}
                style={{ position: 'relative', paddingLeft: 40, marginBottom: 24 }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: 8,
                  top: 4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: isToday(new Date(group.date))
                    ? 'linear-gradient(135deg, var(--pink-300), var(--lavender-400))'
                    : 'var(--cream-200)',
                  border: '3px solid var(--cream-50)',
                  boxShadow: '0 0 0 1px var(--neutral-200)',
                }} />

                {/* Date header */}
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: isToday(new Date(group.date)) ? 'var(--pink-400)' : 'var(--neutral-500)',
                  marginBottom: 10,
                }}>
                  {isToday(new Date(group.date))
                    ? 'Today'
                    : format(new Date(group.date), 'EEEE, MMMM d, yyyy')}
                </h3>

                {/* Entries */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.entries.map((entry, i) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      index={i}
                      onClick={() => router.push(`/entry/${entry.id}`)}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
