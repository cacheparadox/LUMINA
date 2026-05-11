'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db, getSetting, setSetting } from '@/lib/db';
import AppShell from '@/components/AppShell';
import { ListChecks, Droplets, Moon, Dumbbell, BookOpen, Brain, Plus, Check, Star, Trash2, Edit2, X } from 'lucide-react';
import { format, isToday } from 'date-fns';

const DEFAULT_HABITS = [
  { id: 'sleep', type: 'sleep', label: 'Sleep', iconName: 'Moon', unit: 'hrs', max: 12, color: 'var(--lavender-300)' },
  { id: 'water', type: 'water', label: 'Water', iconName: 'Droplets', unit: 'glasses', max: 12, color: 'var(--sage-300)' },
  { id: 'workout', type: 'workout', label: 'Workout', iconName: 'Dumbbell', unit: 'min', max: 120, color: 'var(--pink-300)' },
  { id: 'reading', type: 'reading', label: 'Reading', iconName: 'BookOpen', unit: 'min', max: 120, color: 'var(--gold-300)' },
  { id: 'meditation', type: 'meditation', label: 'Meditation', iconName: 'Brain', unit: 'min', max: 60, color: 'var(--lavender-400)' },
];

const ICONS: Record<string, React.ElementType> = {
  Moon, Droplets, Dumbbell, BookOpen, Brain, Star
};

export default function HabitsPage() {
  const [addingHabit, setAddingHabit] = useState<string | null>(null);
  const [habitValue, setHabitValue] = useState(0);
  const [habitList, setHabitList] = useState(DEFAULT_HABITS);
  const [isManageMode, setIsManageMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New custom habit state
  const [newLabel, setNewLabel] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [newMax, setNewMax] = useState(10);

  useEffect(() => {
    getSetting('custom_habits').then(val => {
      if (val) {
        try {
          setHabitList(JSON.parse(val));
        } catch(e) {}
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

  const handleSaveHabitValue = async (type: string) => {
    const existing = todayHabits?.find(h => h.type === type);
    if (existing?.id) {
      await db.habits.delete(existing.id);
    }

    if (habitValue > 0) {
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
    const newId = 'custom_' + Date.now();
    const newList = [...habitList, {
      id: newId,
      type: newId,
      label: newLabel.trim(),
      iconName: 'Star',
      unit: newUnit.trim() || 'times',
      max: newMax || 10,
      color: 'var(--pink-400)',
    }];
    saveHabitList(newList);
    setShowAddModal(false);
    setNewLabel('');
    setNewUnit('');
    setNewMax(10);
  };

  const handleRemoveHabit = (id: string) => {
    if (confirm('Remove this habit from tracking? Past data will not be deleted.')) {
      saveHabitList(habitList.filter(h => h.id !== id));
    }
  };

  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
              <ListChecks size={24} style={{ color: 'var(--pink-300)' }} />
              Self-Care Rituals
            </h1>
            <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 28 }}>
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

        {isManageMode && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            style={{ marginBottom: 20 }}
          >
            <button 
              className="btn-secondary" 
              onClick={() => setShowAddModal(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}
            >
              <Plus size={16} /> Add Custom Habit
            </button>
          </motion.div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatePresence>
            {habitList.map((habit, i) => {
              const Icon = ICONS[habit.iconName] || Star;
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
                    <button 
                      onClick={() => handleRemoveHabit(habit.id)}
                      style={{ position: 'absolute', top: -8, right: -8, background: 'var(--pink-400)', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', zIndex: 10 }}
                    >
                      <X size={12} />
                    </button>
                  )}
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEditing ? 16 : 0, opacity: isManageMode ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: todayEntry ? `${habit.color}25` : 'var(--neutral-100)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s',
                      }}>
                        <Icon size={20} style={{ color: todayEntry ? habit.color : 'var(--neutral-400)' }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--neutral-700)' }}>
                          {habit.label}
                        </h3>
                        {todayEntry ? (
                          <span style={{ fontSize: 12, color: habit.color, fontWeight: 500 }}>
                            {todayEntry.value} {habit.unit} today ✓
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--neutral-400)' }}>
                            Not tracked yet today
                          </span>
                        )}
                      </div>
                    </div>

                    {!isManageMode && (
                      <button
                        onClick={() => {
                          if (isEditing) {
                            setAddingHabit(null);
                          } else {
                            setAddingHabit(habit.id);
                            setHabitValue(todayEntry?.value || 0);
                          }
                        }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          border: todayEntry ? `2px solid ${habit.color}` : '2px solid var(--neutral-200)',
                          background: todayEntry ? `${habit.color}15` : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: todayEntry ? habit.color : 'var(--neutral-400)',
                        }}
                      >
                        {todayEntry ? <Check size={16} /> : <Plus size={16} />}
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  {todayEntry && !isEditing && !isManageMode && (
                    <div style={{
                      marginTop: 12,
                      height: 4,
                      background: 'var(--neutral-100)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        style={{
                          height: '100%',
                          background: habit.color,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  )}

                  {/* Edit slider */}
                  {isEditing && !isManageMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>
                          {habitValue} {habit.unit}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--neutral-400)' }}>
                          max: {habit.max}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={habit.max}
                        value={habitValue}
                        onChange={e => setHabitValue(Number(e.target.value))}
                        style={{ width: '100%', marginBottom: 12 }}
                      />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn-ghost" onClick={() => handleSaveHabitValue(habit.type)} style={{ fontSize: 13, color: 'var(--pink-500)' }}>
                          Clear
                        </button>
                        <button className="btn-primary" onClick={() => handleSaveHabitValue(habit.type)} style={{ fontSize: 13, padding: '8px 16px' }}>
                          Save
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Add Habit Modal */}
        {showAddModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card"
              style={{ width: '100%', maxWidth: 400, padding: 24, background: 'var(--background)' }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 16 }}>
                Create Custom Habit
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 4, display: 'block' }}>Habit Name</label>
                  <input type="text" className="input" placeholder="e.g. Journaling" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
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
                <button className="btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleAddCustomHabit} disabled={!newLabel.trim()}>Create</button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
