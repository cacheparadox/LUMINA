'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/db';
import { callLLM, buildRewindPrompt, getAIConfig } from '@/lib/ai';
import AppShell from '@/components/AppShell';
import EmotionBadge from '@/components/EmotionBadge';
import { MOOD_CONFIG } from '@/lib/utils';
import { Sparkles, ChevronLeft, ChevronRight, Clock, Loader2, Star, Calendar } from 'lucide-react';
import { format, subYears, isSameDay, isSameMonth } from 'date-fns';

export default function RewindPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [rewindText, setRewindText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const entries = useLiveQuery(() => db.entries.orderBy('createdAt').reverse().toArray(), []);

  // Filter entries for selected year and month
  const periodEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter(e => {
      const d = new Date(e.createdAt);
      return d.getFullYear() === selectedYear && (selectedMonth === -1 || d.getMonth() === selectedMonth);
    });
  }, [entries, selectedYear, selectedMonth]);

  // High intensity memories (intensity >= 7)
  const memories = useMemo(() => {
    return periodEntries.filter(e => e.isHighIntensity || (e.overallIntensity && e.overallIntensity >= 7));
  }, [periodEntries]);

  // Anniversaries: entries from today's date in previous years
  const anniversaries = useMemo(() => {
    if (!entries) return [];
    const today = new Date();
    return entries.filter(e => {
      const d = new Date(e.createdAt);
      return d.getMonth() === today.getMonth() && d.getDate() === today.getDate() && d.getFullYear() !== today.getFullYear();
    }).sort((a, b) => new Date(a.createdAt).getFullYear() - new Date(b.createdAt).getFullYear());
  }, [entries]);

  // Monthly anniversaries
  const monthlyAnniversaries = useMemo(() => {
    if (!entries) return [];
    const today = new Date();
    return entries.filter(e => {
      const d = new Date(e.createdAt);
      return d.getDate() === today.getDate() && (d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear());
    }).filter(e => e.isHighIntensity).slice(0, 5);
  }, [entries]);

  // Stats
  const avgMood = periodEntries.length > 0
    ? (periodEntries.reduce((s, e) => s + e.mood, 0) / periodEntries.length).toFixed(1)
    : '0';

  const generateRewind = async () => {
    if (!getAIConfig()?.apiKey) {
      setError('Please set up your API key in Settings first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const prompt = buildRewindPrompt(periodEntries, selectedYear);
      const result = await callLLM(prompt);
      setRewindText(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate rewind');
    }
    setLoading(false);
  };

  const availableYears = useMemo(() => {
    if (!entries || entries.length === 0) return [new Date().getFullYear()];
    const years = new Set(entries.map(e => new Date(e.createdAt).getFullYear()));
    return [...years].sort((a, b) => b - a);
  }, [entries]);

  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={24} style={{ color: 'var(--pink-300)' }} />
            Emotional Rewind
          </h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 24 }}>
            Relive your most intense memories
          </p>
        </motion.div>

        {/* Anniversaries */}
        {anniversaries.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 20, marginBottom: 20, background: 'linear-gradient(135deg, var(--glass-bg), rgba(255,213,128,0.08))', border: '1px solid rgba(255,213,128,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Calendar size={16} style={{ color: 'var(--gold-300)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)' }}>On This Day</h3>
            </div>
            {anniversaries.map(entry => (
              <div key={entry.id} style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-600)' }}>{entry.title || 'Untitled'}</span>
                  <span style={{ fontSize: 11, color: 'var(--gold-300)', fontWeight: 600 }}>{new Date(entry.createdAt).getFullYear()}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--neutral-500)', fontFamily: 'var(--font-journal)' }}>{entry.content.slice(0, 120)}...</p>
                {entry.emotionScores && <div style={{ marginTop: 6 }}><EmotionBadge scores={entry.emotionScores} compact /></div>}
              </div>
            ))}
          </motion.div>
        )}

        {/* Time Selector */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {availableYears.map(y => (
              <button key={y} onClick={() => setSelectedYear(y)} className={selectedYear === y ? 'tag tag-pink' : 'tag'} style={{ cursor: 'pointer', border: 'none', fontSize: 13, fontWeight: 600 }}>
                {y}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--neutral-200)' }} />
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            <button onClick={() => setSelectedMonth(-1)} className={selectedMonth === -1 ? 'tag tag-pink' : 'tag'} style={{ cursor: 'pointer', border: 'none', fontSize: 12 }}>All Year</button>
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
              <button key={m} onClick={() => setSelectedMonth(i)} className={selectedMonth === i ? 'tag tag-pink' : 'tag'} style={{ cursor: 'pointer', border: 'none', fontSize: 12 }}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Entries', value: periodEntries.length, color: 'var(--pink-300)' },
            { label: 'Memories', value: memories.length, color: 'var(--lavender-400)' },
            { label: 'Avg Mood', value: avgMood, color: 'var(--gold-300)' },
          ].map(stat => (
            <div key={stat.label} className="glass-card-static" style={{ padding: 14, textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: 'var(--neutral-400)', marginBottom: 2 }}>{stat.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* High Intensity Memories */}
        {memories.length > 0 && (
          <div className="glass-card-static" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Star size={14} style={{ color: 'var(--pink-400)' }} /> High-Intensity Memories
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {memories.slice(0, 10).map(entry => (
                <div key={entry.id} style={{ padding: 12, borderRadius: 'var(--radius-md)', background: 'rgba(244,160,181,0.05)', border: '1px solid rgba(244,160,181,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-700)' }}>{entry.title || 'Untitled'}</span>
                    <span style={{ fontSize: 11, color: 'var(--neutral-400)' }}>{format(new Date(entry.createdAt), 'MMM d')}</span>
                  </div>
                  {entry.aiSummary && <p style={{ fontSize: 12, color: 'var(--lavender-400)', fontStyle: 'italic', marginBottom: 6, fontFamily: 'var(--font-journal)' }}>{entry.aiSummary}</p>}
                  {entry.emotionScores && <EmotionBadge scores={entry.emotionScores} intensity={entry.overallIntensity} compact />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Rewind */}
        <div className="glass-card-static" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 12 }}>
            ✨ AI Yearly Rewind
          </h3>
          {rewindText ? (
            <div style={{ fontFamily: 'var(--font-journal)', fontSize: 15, lineHeight: 1.8, color: 'var(--neutral-600)', whiteSpace: 'pre-wrap' }}>
              {rewindText}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--neutral-400)', marginBottom: 16 }}>
                Generate a beautiful AI-narrated summary of your emotional journey for this period.
              </p>
              {error && <p style={{ fontSize: 12, color: 'var(--pink-500)', marginBottom: 12 }}>{error}</p>}
              <button className="btn-primary" onClick={generateRewind} disabled={loading || periodEntries.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto', opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={16} /> Generate Rewind</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
