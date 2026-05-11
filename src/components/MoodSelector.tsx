'use client';

import { motion } from 'framer-motion';
import { MOOD_CONFIG, vibrate } from '@/lib/utils';

interface MoodSelectorProps {
  value: number;
  onChange: (mood: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function MoodSelector({ value, onChange, size = 'md' }: MoodSelectorProps) {
  const emojiSize = size === 'sm' ? 24 : size === 'md' ? 36 : 48;

  return (
    <div style={{
      display: 'flex',
      gap: size === 'sm' ? 8 : 16,
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      {([1, 2, 3, 4, 5] as const).map(mood => {
        const config = MOOD_CONFIG[mood];
        const isSelected = value === mood;
        return (
          <motion.button
            key={mood}
            className={`mood-option ${isSelected ? 'selected' : ''}`}
            onClick={() => {
              vibrate(30);
              onChange(mood);
            }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            animate={isSelected ? {
              y: [0, -6, 0],
              boxShadow: [`0 0 0px ${config.color}00`, `0 8px 24px ${config.color}60`, `0 4px 12px ${config.color}40`],
            } : {
              boxShadow: '0 0 0px transparent'
            }}
            transition={{ duration: 0.4 }}
            style={{
              padding: size === 'sm' ? 8 : 12,
              borderColor: isSelected ? config.color : 'transparent',
              background: isSelected ? `${config.color}18` : 'transparent',
            }}
          >
            <span style={{ fontSize: emojiSize }}>{config.emoji}</span>
            {size !== 'sm' && (
              <span style={{
                fontSize: size === 'md' ? 11 : 13,
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? config.color : 'var(--neutral-400)',
              }}>
                {config.label}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
