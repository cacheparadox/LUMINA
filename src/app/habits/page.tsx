'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db, getSetting, setSetting } from '@/lib/db';
import AppShell from '@/components/AppShell';
import IconPicker, { ICON_MAP } from '@/components/IconPicker';
import { ListChecks, Plus, Check, Edit2, X, Flame, Trophy, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isToday, subDays, startOfDay, isSameDay } from 'date-fns';
import { vibrate } from '@/lib/utils';

const DEFAULT_HABITS = [
  { id: 'sleep', type: 'sleep', label: 'Sleep', iconName: 'Moon', unit: 'hrs', max: 12, color: 'var(--lavender-300)' },
  { id: 'water', type: 'water', label: 'Water', iconName: 'Droplets', unit: 'glasses', max: 12, color: 'var(--sage-300)' },
  { id: 'workout', type: 'workout', label: 'Workout', iconName: 'Dumbbell', unit: 'min', max: 120, color: 'var(--pink-300)' },
  { id: 'reading', type: 'reading', label: 'Reading', iconName: 'BookOpen', unit: 'min', max: 120, color: 'var(--gold-300)' },
  { id: 'meditation', type: 'meditation', label: 'Meditation', iconName: 'Brain', unit: 'min', max: 60, color: 'var(--lavender-400)' },
];

const HABIT_COLORS = [
  'var(--pink-300)', 'var(--lavender-300)', 'var(--sage-300)',
  'var(--gold-300)', 'var(--lavender-400)', 'var(--pink-400)',
];

type ViewMode = 'today' | 'streaks';

export default function HabitsPage() {
  const [addingHabit, setAddingHabit] = useState<string | null>(null);
  const [habitValue, setHabitValue] = useState(0);
  const [habitList, setHabitList] = useState(DEFAULT_HABITS);
  const [isManageMode, setIsManageMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('today');

  // New custom habit state
  const [newLabel, setNewLabel] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newMax, setNewMax] = useState(10);
  const [newIconName, setNewIconName] = useState('Star');
  const [newColor, setNewColor] = useState('var(--pink-400)');
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  useEffect(() => {
    getSetting('custom_habits').then(val => {
      if (val) {
        try { setHabitList(JSON.parse(val)); } catch(e) {}
      }
    });
  }, []);

  const saveHabitList = async (list: typeof DEFAULT_HABITS) => {
    setHabitList(list);
    await setSetting('custom_habits', JSON.stringify(list));
  };

  const todayHabits = useLiveQuery(async () => {
    const all = await db.habits.orderBy('timestamp').reverse().toArray();
    return all.filter(h => isToday(new Date(h.timestamp)));
  }, []);

  // All habits for streak calculation (last 60 days)
  const allHabits = useLiveQuery(async () => {
    const cutoff = subDays(new Date(), 60);
    return db.habits.where('timestamp').aboveOrEqual(cutoff).toArray();
  }, []);

  const handleSaveHabitValue = async (type: string) => {
    const existing = todayHabits?.find(h => h.type === type);
    if (existing?.id) {
      await db.habits.delete(existing.id);
    }
    if (habitValue > 0) {
      vibrate(20);
      await db.habits.add({
        type: type as any,
        value: habitValue,
        timestamp: new Date(),
      });
    }
    setAddingHabit(null);
    setHabitValue(0);
  };

  const handleAddCustomHabit = () => {
    if (!newLabel.trim()) return;
    
    if (editingHabitId) {
      const newList = habitList.map(h => h.id === editingHabitId ? {
        ...h,
        label: newLabel.trim(),
        iconName: newIconName,
        unit: newUnit.trim() || 'times',
        max: newMax || 10,
        color: newColor,
      } : h);
      saveHabitList(newList);
    } else {
      const newId = 'custom_' + Date.now();
      const newList = [...habitList, {
        id: newId, type: newId,
        label: newLabel.trim(),
        iconName: newIconName,
        unit: newUnit.trim() || 'times',
        max: newMax || 10,
        color: newColor,
      }];
      saveHabitList(newList);
    }
    
    setShowAddModal(false);
    setEditingHabitId(null);
    setNewLabel(''); setNewUnit(''); setNewMax(10);
    setNewIconName('Star'); setNewColor('var(--pink-400)');
  };

  const handleEditHabit = (habit: typeof DEFAULT_HABITS[0]) => {
    setEditingHabitId(habit.id);
    setNewLabel(habit.label);
    setNewUnit(habit.unit);
    setNewMax(habit.max);
    setNewIconName(habit.iconName);
    setNewColor(habit.color);
    setShowAddModal(true);
  };

  const moveHabit = (index: number, direction: 'up' | 'down') => {
    const newList = [...habitList];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    
    const [movedItem] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, movedItem);
    saveHabitList(newList);
  };

  const handleRemoveHabit = (id: string) => {
    saveHabitList(habitList.filter(h => h.id !== id));
  };

  // Streak calculations — only considers live habit types
  const liveTypes = new Set(habitList.map(h => h.type));

  const getStreakData = (habit: typeof DEFAULT_HABITS[0]) => {
    if (!allHabits) return { current: 0, best: 0, last30: Array(30).fill({ tracked: false, progress: 0 }) };
    
    const typeHabits = allHabits.filter(h => h.type === habit.type);
    const last30: { tracked: boolean; progress: number }[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const entry = typeHabits.find(h => isSameDay(new Date(h.timestamp), day));
      
      if (entry) {
        last30.push({ 
          tracked: true, 
          progress: entry.value / habit.max 
        });
      } else {
        last30.push({ tracked: false, progress: 0 });
      }
    }

    let current = 0;
    for (let i = last30.length - 1; i >= 0; i--) {
      if (last30[i].tracked && last30[i].progress >= 1) current++; 
      else if (i === last30.length - 1) continue; // Allow today to be incomplete without breaking streak?
      else break;
    }

    let best = 0, run = 0;
    for (const day of last30) {
      if (day.tracked && day.progress >= 1) { 
        run++; 
        best = Math.max(best, run); 
      } else { 
        run = 0; 
      }
    }

    return { current, best, last30 };
  };

  // Deduplicated today count: unique live habit types that have at least one entry today
  const totalTrackedToday = useMemo(() => {
    if (!todayHabits) return 0;
    const trackedTypes = new Set(todayHabits.map(h => h.type));
    // Only count types that are still in the live habit list
    return [...trackedTypes].filter(t => liveTypes.has(t)).length;
  }, [todayHabits, habitList]);

  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ListChecks size={24} style={{ color: 'var(--pink-300)' }} />
              Self-Care Rituals
            </h1>
            <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 20 }}>
              Small steps, big changes
            </p>
          </div>
          <button
            className="btn-ghost"
            onClick={() => setIsManageMode(!isManageMode)}
            style={{ fontSize: 13, display: 'flex', gap: 4, alignItems: 'center', color: isManageMode ? 'var(--pink-500)' : 'var(--neutral-400)' }}
          >
            <Edit2 size={14} />
            {isManageMode ? 'Done' : 'Edit'}
          </button>
        </motion.div>

        {/* View Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['today', 'streaks'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={viewMode === mode ? 'tag tag-pink' : 'tag'}
              style={{ cursor: 'pointer', border: 'none', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {mode === 'today' ? <Check size={13} /> : <Flame size={13} />}
              {mode === 'today' ? 'Today' : 'Streaks'}
            </button>
          ))}
        </div>

        {isManageMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginBottom: 20 }}>
            <button
              className="btn-secondary"
              onClick={() => setShowAddModal(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}
            >
              <Plus size={16} /> Add Custom Habit
            </button>
          </motion.div>
        )}

        {/* ═══════ TODAY VIEW ═══════ */}
        {viewMode === 'today' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AnimatePresence>
              {habitList.map((habit, i) => {
                const Icon = ICON_MAP[habit.iconName] || ICON_MAP['Star'];
                const todayEntry = todayHabits?.find(h => h.type === habit.type);
                const isEditing = addingHabit === habit.id;
                const progress = todayEntry ? (todayEntry.value / habit.max) * 100 : 0;

                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card-static"
                    style={{ padding: 20, position: 'relative' }}
                  >
                    {isManageMode && (
                      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8, zIndex: 10 }}>
                        <button
                          onClick={() => moveHabit(i, 'up')}
                          disabled={i === 0}
                          style={{ background: 'var(--neutral-100)', color: 'var(--neutral-600)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1 }}
                        >
                          <ChevronLeft size={16} style={{ transform: 'rotate(90deg)' }} />
                        </button>
                        <button
                          onClick={() => moveHabit(i, 'down')}
                          disabled={i === habitList.length - 1}
                          style={{ background: 'var(--neutral-100)', color: 'var(--neutral-600)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: i === habitList.length - 1 ? 'default' : 'pointer', opacity: i === habitList.length - 1 ? 0.3 : 1 }}
                        >
                          <ChevronLeft size={16} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                        <button
                          onClick={() => handleEditHabit(habit)}
                          style={{ background: 'var(--gold-300)', color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveHabit(habit.id)}
                          style={{ background: 'var(--pink-400)', color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEditing ? 16 : 0, opacity: isManageMode ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: '50%',
                          background: todayEntry ? `${habit.color}25` : 'var(--neutral-100)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.3s',
                        }}>
                          <Icon size={20} style={{ color: todayEntry ? habit.color : 'var(--neutral-400)' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--neutral-700)' }}>{habit.label}</h3>
                          {todayEntry ? (
                            <span style={{ fontSize: 12, color: habit.color, fontWeight: 500 }}>
                              {todayEntry.value} {habit.unit} today ✓
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Not tracked yet today</span>
                          )}
                        </div>
                      </div>

                      {!isManageMode && (
                        <button
                          onClick={() => {
                            if (isEditing) { setAddingHabit(null); } else { setAddingHabit(habit.id); setHabitValue(todayEntry?.value || 0); }
                          }}
                          style={{
                            width: 36, height: 36, borderRadius: '50%',
                            border: todayEntry ? `2px solid ${habit.color}` : '2px solid var(--neutral-200)',
                            background: todayEntry ? `${habit.color}15` : 'transparent',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: todayEntry ? habit.color : 'var(--neutral-400)',
                          }}
                        >
                          {todayEntry ? <Check size={16} /> : <Plus size={16} />}
                        </button>
                      )}
                    </div>

                    {todayEntry && !isEditing && !isManageMode && (
                      <div style={{ marginTop: 12, height: 4, background: 'var(--neutral-100)', borderRadius: 2, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ delay: 0.3, duration: 0.6 }}
                          style={{ height: '100%', background: habit.color, borderRadius: 2 }}
                        />
                      </div>
                    )}

                    {isEditing && !isManageMode && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>{habitValue} {habit.unit}</span>
                          <span style={{ fontSize: 12, color: 'var(--neutral-400)' }}>max: {habit.max}</span>
                        </div>
                        <input type="range" min="0" max={habit.max} value={habitValue} onChange={e => setHabitValue(Number(e.target.value))} style={{ width: '100%', marginBottom: 12 }} />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="btn-ghost" onClick={() => { setHabitValue(0); handleSaveHabitValue(habit.type); }} style={{ fontSize: 13, color: 'var(--pink-500)' }}>Clear</button>
                          <button className="btn-primary" onClick={() => handleSaveHabitValue(habit.type)} style={{ fontSize: 13, padding: '8px 16px' }}>Save</button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ═══════ STREAKS VIEW ═══════ */}
        {viewMode === 'streaks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Overview Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card-static" style={{ padding: 20, textAlign: 'center', background: 'linear-gradient(135deg, var(--glass-bg), rgba(244,160,181,0.08))' }}>
              <div style={{ fontSize: 36, marginBottom: 4 }}>🔥</div>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--pink-400)' }}>
                {totalTrackedToday}/{habitList.length}
              </p>
              <p style={{ fontSize: 12, color: 'var(--neutral-400)' }}>rituals completed today</p>
            </motion.div>

            {/* Per-habit streak cards */}
            {habitList.map((habit, i) => {
              const Icon = ICON_MAP[habit.iconName] || ICON_MAP['Star'];
              const streak = getStreakData(habit.type);

              return (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card-static"
                  style={{ padding: 20 }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: `${habit.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} style={{ color: habit.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--neutral-700)' }}>{habit.label}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                          <Flame size={14} style={{ color: streak.current > 0 ? 'var(--pink-400)' : 'var(--neutral-300)' }} />
                          <span style={{ fontSize: 18, fontWeight: 700, color: streak.current > 0 ? 'var(--pink-400)' : 'var(--neutral-400)' }}>{streak.current}</span>
                        </div>
                        <p style={{ fontSize: 9, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                          <Trophy size={14} style={{ color: streak.best > 0 ? 'var(--gold-300)' : 'var(--neutral-300)' }} />
                          <span style={{ fontSize: 18, fontWeight: 700, color: streak.best > 0 ? 'var(--gold-300)' : 'var(--neutral-400)' }}>{streak.best}</span>
                        </div>
                        <p style={{ fontSize: 9, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Best</p>
                      </div>
                    </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 3 }}>
                    {streak.last30.map((day, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.015 }}
                        title={`${format(subDays(new Date(), 29 - idx), 'MMM d')}: ${Math.round(day.progress * 100)}%`}
                        style={{
                          aspectRatio: '1',
                          borderRadius: 4,
                          background: day.tracked ? habit.color : 'var(--neutral-100)',
                          opacity: day.tracked ? (day.progress >= 1 ? 1 : 0.6) : 0.2,
                          transition: 'all 0.2s',
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--neutral-400)', marginTop: 6, textAlign: 'right' }}>
                    {streak.last30.filter(d => d.tracked && d.progress >= 1).length}/30 days completed
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ═══════ ADD HABIT MODAL ═══════ */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: 'rgba(0,0,0,0.5)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 24,
              }}
              onClick={() => { setShowAddModal(false); setEditingHabitId(null); }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card"
                style={{ width: '100%', maxWidth: 400, padding: 24, background: 'var(--cream-50)' }}
                onClick={e => e.stopPropagation()}
              >
                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16 }}>
                  {editingHabitId ? 'Edit Ritual' : 'Create Custom Ritual'}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 4, display: 'block' }}>Habit Name</label>
                    <input type="text" className="input" placeholder="e.g. Journaling" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 4, display: 'block' }}>Icon</label>
                    <IconPicker selected={newIconName} onChange={setNewIconName} color={newColor} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 6, display: 'block' }}>Color</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {HABIT_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewColor(c)}
                          style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: c, border: newColor === c ? '3px solid var(--neutral-700)' : '2px solid var(--neutral-200)',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 4, display: 'block' }}>Unit</label>
                    <input type="text" className="input" placeholder="e.g. pages, mins, times" value={newUnit} onChange={e => setNewUnit(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 4, display: 'block' }}>Daily Goal (Max)</label>
                    <input type="number" className="input" value={newMax} onChange={e => setNewMax(Number(e.target.value))} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button className="btn-ghost" onClick={() => { setShowAddModal(false); setEditingHabitId(null); }}>Cancel</button>
                  <button className="btn-primary" onClick={handleAddCustomHabit} disabled={!newLabel.trim()}>
                    {editingHabitId ? 'Save Changes' : 'Create'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
