'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import {
  // Health & Wellness
  Heart, HeartPulse, Activity, Thermometer, Pill, Stethoscope,
  // Fitness
  Dumbbell, Bike, Footprints, Timer, Flame, Zap,
  // Mind & Body
  Brain, Eye, Ear, HandMetal, Smile, Frown, Meh,
  // Sleep & Rest
  Moon, Sun, Sunrise, Sunset, CloudMoon, BedDouble,
  // Food & Drink
  Droplets, Coffee, Wine, Apple, Cookie, UtensilsCrossed,
  // Productivity
  BookOpen, Pencil, Bookmark, GraduationCap, Code, Monitor,
  // Creative
  Palette, Music, Camera, Film, Mic, Brush,
  // Social
  Users, MessageCircle, Phone, Mail, Gift, PartyPopper,
  // Nature
  TreePine, Flower, Leaf, Mountain, CloudRain, Snowflake,
  // Mindfulness
  Sparkles, Star, CloudLightning, Wind, Waves, Compass,
  // Home
  Home, Shirt, Scissors, Wrench, ShoppingCart, Car,
  // Finance
  Wallet, PiggyBank, TrendingUp, Target, Award, Trophy,
  // Misc
  Clock, Calendar, Check, ListChecks, BarChart3, Hash,
  Gamepad2, Dog, Cat, Baby, Glasses, Headphones,
} from 'lucide-react';

// Bundled icon map — these are all compiled into the JS bundle, so they work offline
export const ICON_MAP: Record<string, React.ElementType> = {
  // Health
  Heart, HeartPulse, Activity, Thermometer, Pill, Stethoscope,
  // Fitness
  Dumbbell, Bike, Footprints, Timer, Flame, Zap,
  // Mind
  Brain, Eye, Ear, HandMetal, Smile, Frown, Meh,
  // Sleep
  Moon, Sun, Sunrise, Sunset, CloudMoon, BedDouble,
  // Food
  Droplets, Coffee, Wine, Apple, Cookie, UtensilsCrossed,
  // Productivity
  BookOpen, Pencil, Bookmark, GraduationCap, Code, Monitor,
  // Creative
  Palette, Music, Camera, Film, Mic, Brush,
  // Social
  Users, MessageCircle, Phone, Mail, Gift, PartyPopper,
  // Nature
  TreePine, Flower, Leaf, Mountain, CloudRain, Snowflake,
  // Mind
  Sparkles, Star, CloudLightning, Wind, Waves, Compass,
  // Home
  Home, Shirt, Scissors, Wrench, ShoppingCart, Car,
  // Finance
  Wallet, PiggyBank, TrendingUp, Target, Award, Trophy,
  // Misc
  Clock, Calendar, Check, ListChecks, BarChart3, Hash,
  Gamepad2, Dog, Cat, Baby, Glasses, Headphones,
};

const ICON_NAMES = Object.keys(ICON_MAP);

// Category groupings for nicer browsing
const ICON_CATEGORIES: Record<string, string[]> = {
  'Health': ['Heart', 'HeartPulse', 'Activity', 'Thermometer', 'Pill', 'Stethoscope'],
  'Fitness': ['Dumbbell', 'Bike', 'Footprints', 'Timer', 'Flame', 'Zap'],
  'Mind': ['Brain', 'Eye', 'Ear', 'HandMetal', 'Smile', 'Frown', 'Meh'],
  'Sleep': ['Moon', 'Sun', 'Sunrise', 'Sunset', 'CloudMoon', 'BedDouble'],
  'Food & Drink': ['Droplets', 'Coffee', 'Wine', 'Apple', 'Cookie', 'UtensilsCrossed'],
  'Learning': ['BookOpen', 'Pencil', 'Bookmark', 'GraduationCap', 'Code', 'Monitor'],
  'Creative': ['Palette', 'Music', 'Camera', 'Film', 'Mic', 'Brush'],
  'Social': ['Users', 'MessageCircle', 'Phone', 'Mail', 'Gift', 'PartyPopper'],
  'Nature': ['TreePine', 'Flower', 'Leaf', 'Mountain', 'CloudRain', 'Snowflake'],
  'Mindfulness': ['Sparkles', 'Star', 'CloudLightning', 'Wind', 'Waves', 'Compass'],
  'Home': ['Home', 'Shirt', 'Scissors', 'Wrench', 'ShoppingCart', 'Car'],
  'Goals': ['Wallet', 'PiggyBank', 'TrendingUp', 'Target', 'Award', 'Trophy'],
  'Other': ['Clock', 'Calendar', 'Check', 'ListChecks', 'BarChart3', 'Hash', 'Gamepad2', 'Dog', 'Cat', 'Baby', 'Glasses', 'Headphones'],
};

interface IconPickerProps {
  selected: string;
  onChange: (name: string) => void;
  color?: string;
}

export default function IconPicker({ selected, onChange, color = 'var(--pink-400)' }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return ICON_CATEGORIES;
    const q = search.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [cat, names] of Object.entries(ICON_CATEGORIES)) {
      const filtered = names.filter(n => n.toLowerCase().includes(q));
      if (filtered.length > 0) result[cat] = filtered;
    }
    return result;
  }, [search]);

  const SelectedIcon = ICON_MAP[selected] || Star;

  return (
    <div>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          background: 'var(--neutral-100)',
          border: '1.5px solid var(--neutral-200)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          width: '100%',
          color: 'var(--neutral-700)',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SelectedIcon size={18} style={{ color }} />
        </div>
        <span style={{ flex: 1, textAlign: 'left' }}>{selected}</span>
        <span style={{ fontSize: 11, color: 'var(--neutral-400)' }}>Tap to change</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }} onClick={() => setOpen(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 480,
                maxHeight: '75vh',
                background: 'var(--cream-50)',
                borderRadius: '20px 20px 0 0',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '16px 20px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', borderBottom: '1px solid var(--neutral-200)',
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)' }}>
                  Choose Icon
                </h3>
                <button onClick={() => setOpen(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--neutral-400)', padding: 4,
                }}>
                  <X size={20} />
                </button>
              </div>

              {/* Search */}
              <div style={{ padding: '12px 20px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', background: 'var(--neutral-100)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)',
                }}>
                  <Search size={16} style={{ color: 'var(--neutral-400)' }} />
                  <input
                    type="text"
                    placeholder="Search icons..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      flex: 1, border: 'none', outline: 'none',
                      background: 'transparent', fontSize: 14,
                      color: 'var(--neutral-700)', fontFamily: 'var(--font-body)',
                    }}
                  />
                </div>
              </div>

              {/* Icon Grid */}
              <div style={{ overflow: 'auto', padding: '0 20px 24px', flex: 1 }}>
                {Object.entries(filteredCategories).map(([cat, names]) => (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <p style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--neutral-400)',
                      textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
                    }}>
                      {cat}
                    </p>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6, 1fr)',
                      gap: 6,
                    }}>
                      {names.map(name => {
                        const Icon = ICON_MAP[name];
                        const isSelected = selected === name;
                        return (
                          <motion.button
                            key={name}
                            whileTap={{ scale: 0.85 }}
                            onClick={() => { onChange(name); setOpen(false); setSearch(''); }}
                            style={{
                              width: '100%', aspectRatio: '1',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              borderRadius: 'var(--radius-md)',
                              border: isSelected ? `2px solid ${color}` : '1.5px solid var(--neutral-200)',
                              background: isSelected ? `${color}15` : 'var(--neutral-50)',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            <Icon size={20} style={{
                              color: isSelected ? color : 'var(--neutral-500)',
                            }} />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {Object.keys(filteredCategories).length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--neutral-400)', fontSize: 13, paddingTop: 32 }}>
                    No icons match "{search}"
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
