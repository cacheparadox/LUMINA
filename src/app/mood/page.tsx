'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';
import AppShell from '@/components/AppShell';
import MoodHeatmap from '@/components/MoodHeatmap';
import { MOOD_CONFIG } from '@/lib/utils';
import { Sparkles, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subMonths, addMonths, subDays, startOfDay, isSameDay } from 'date-fns';

export default function MoodPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const entries = useLiveQuery(
    () => db.entries.orderBy('createdAt').reverse().toArray(),
    []
  );

  const weekEntries = useMemo(() => {
    if (!entries) return [];
    const weekAgo = subDays(new Date(), 7);
    return entries.filter(e => new Date(e.createdAt) >= weekAgo);
  }, [entries]);

  const monthEntries = useMemo(() => {
    if (!entries) return [];
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return entries.filter(e => {
      const d = new Date(e.createdAt);
      return d >= monthStart && d <= monthEnd;
    });
  }, [entries, currentMonth]);

  // Stats
  const avgMood = weekEntries.length > 0
    ? (weekEntries.reduce((s, e) => s + e.mood, 0) / weekEntries.length).toFixed(1)
    : null;

  const avgEnergy = weekEntries.length > 0
    ? (weekEntries.reduce((s, e) => s + e.energy, 0) / weekEntries.length).toFixed(1)
    : null;

  const avgAnxiety = weekEntries.length > 0
    ? (weekEntries.reduce((s, e) => s + e.anxiety, 0) / weekEntries.length).toFixed(1)
    : null;

  // Trend (compare this week vs previous week)
  const prevWeekEntries = useMemo(() => {
    if (!entries) return [];
    const twoWeeksAgo = subDays(new Date(), 14);
    const weekAgo = subDays(new Date(), 7);
    return entries.filter(e => {
      const d = new Date(e.createdAt);
      return d >= twoWeeksAgo && d < weekAgo;
    });
  }, [entries]);

  const prevAvgMood = prevWeekEntries.length > 0
    ? prevWeekEntries.reduce((s, e) => s + e.mood, 0) / prevWeekEntries.length
    : null;

  const moodTrend = avgMood && prevAvgMood
    ? Number(avgMood) > prevAvgMood ? 'up' : Number(avgMood) < prevAvgMood ? 'down' : 'stable'
    : 'stable';

  // Weekly bar chart data
  const weekDays = useMemo(() => {
    const days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const dayEntries = (entries || []).filter(e => isSameDay(new Date(e.createdAt), day));
      
      const avgMood = dayEntries.length > 0
        ? dayEntries.reduce((s, e) => s + e.mood, 0) / dayEntries.length
        : 0;
      
      days.push({
        label: format(day, 'EEE'),
        date: format(day, 'yyyy-MM-dd'),
        mood: avgMood,
        count: dayEntries.length,
      });
    }
    return days;
  }, [entries]);

  // Mood distribution
  const moodDistribution = useMemo(() => {
    if (!entries || entries.length === 0) return [];
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    entries.forEach(e => {
      if (e.mood >= 1 && e.mood <= 5) {
        counts[e.mood as keyof typeof counts]++;
      }
    });
    const total = entries.length;
    return Object.entries(counts).map(([mood, count]) => ({
      mood: Number(mood) as 1 | 2 | 3 | 4 | 5,
      count,
      percentage: Math.round((count / total) * 100),
    }));
  }, [entries]);

  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} style={{ color: 'var(--pink-300)' }} />
            Mood Insights
          </h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 28 }}>
            Track your emotional patterns over time
          </p>
        </motion.div>

        {/* Weekly Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Avg Mood', value: avgMood || '—', color: 'var(--pink-300)', icon: moodTrend === 'up' ? <TrendingUp size={14} /> : moodTrend === 'down' ? <TrendingDown size={14} /> : <Minus size={14} /> },
            { label: 'Avg Energy', value: avgEnergy || '—', color: 'var(--gold-300)' },
            { label: 'Avg Stress', value: avgAnxiety || '—', color: 'var(--lavender-300)' },
            { label: 'Entries', value: weekEntries.length, color: 'var(--sage-300)' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card-static"
              style={{ padding: 16, textAlign: 'center' }}
            >
              <p style={{ fontSize: 11, color: 'var(--neutral-400)', marginBottom: 4 }}>{stat.label}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</span>
                {stat.icon && <span style={{ color: stat.color }}>{stat.icon}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Weekly Mood Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card-static"
          style={{ padding: 24, marginBottom: 24 }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 20 }}>
            This Week
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            {weekDays.map(day => {
              const moodKey = Math.round(day.mood) as keyof typeof MOOD_CONFIG;
              const config = day.mood > 0 ? MOOD_CONFIG[moodKey] : null;
              const isToday = day.label === format(new Date(), 'EEE');
              return (
                <div
                  key={day.date}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {/* Day Label */}
                  <span style={{
                    fontSize: 10,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--pink-400)' : 'var(--neutral-400)',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    {day.label}
                  </span>

                  {/* Mood Bubble */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + weekDays.indexOf(day) * 0.06, type: 'spring', stiffness: 300 }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: config ? `${config.color}20` : 'var(--neutral-100)',
                      border: isToday
                        ? `2px solid ${config ? config.color : 'var(--neutral-300)'}`
                        : `1.5px solid ${config ? config.color + '40' : 'var(--neutral-200)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: config ? 22 : 16,
                      boxShadow: config && isToday ? `0 0 12px ${config.color}40` : 'none',
                      transition: 'all 0.3s',
                    }}
                    title={config ? `${config.label} — ${day.count} ${day.count === 1 ? 'entry' : 'entries'}` : 'No entries'}
                  >
                    {config ? config.emoji : '·'}
                  </motion.div>

                  {/* Entry count dot */}
                  {day.count > 0 && (
                    <span style={{
                      fontSize: 10,
                      color: config ? config.color : 'var(--neutral-400)',
                      fontWeight: 600,
                    }}>
                      {day.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Mood Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card-static"
          style={{ padding: 24, marginBottom: 24 }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 16 }}>
            Mood Distribution
          </h3>
          {moodDistribution.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {moodDistribution.map(item => (
                <div key={item.mood} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20, width: 28 }}>{MOOD_CONFIG[item.mood].emoji}</span>
                  <span style={{ fontSize: 12, color: 'var(--neutral-500)', width: 60 }}>{MOOD_CONFIG[item.mood].label}</span>
                  <div style={{ flex: 1, height: 8, background: 'var(--neutral-100)', borderRadius: 4 }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      style={{
                        height: '100%',
                        background: MOOD_CONFIG[item.mood].color,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--neutral-400)', width: 36, textAlign: 'right' }}>
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--neutral-400)', textAlign: 'center', padding: 20 }}>
              No entries yet. Start journaling to see your mood distribution.
            </p>
          )}
        </motion.div>

        {/* Monthly Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card-static"
          style={{ padding: 24 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn-ghost" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
              <ChevronLeft size={18} />
            </button>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)' }}>
              Mood Calendar
            </h3>
            <button className="btn-ghost" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>
          <MoodHeatmap entries={entries || []} month={currentMonth} />
        </motion.div>
      </div>
    </AppShell>
  );
}
