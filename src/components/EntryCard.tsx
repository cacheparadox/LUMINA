'use client';

import { motion } from 'framer-motion';
import { MOOD_CONFIG } from '@/lib/utils';
import { formatRelativeDate, truncateText } from '@/lib/utils';
import type { JournalEntry } from '@/lib/db';
import { Clock, MapPin, Tag } from 'lucide-react';

interface EntryCardProps {
  entry: JournalEntry;
  onClick?: () => void;
  index?: number;
}

export default function EntryCard({ entry, onClick, index = 0 }: EntryCardProps) {
  const moodConfig = MOOD_CONFIG[entry.mood as keyof typeof MOOD_CONFIG] || MOOD_CONFIG[3];

  return (
    <motion.div
      className="glass-card entry-card"
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -3 }}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Mood Indicator */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: `${moodConfig.color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 20,
        }}>
          {moodConfig.emoji}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h3 style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--neutral-700)',
              lineHeight: 1.3,
            }}>
              {entry.title || 'Untitled Entry'}
            </h3>
            <span style={{
              fontSize: 11,
              color: 'var(--neutral-400)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {formatRelativeDate(entry.createdAt)}
            </span>
          </div>

          <p style={{
            fontSize: 13,
            color: 'var(--neutral-500)',
            marginTop: 6,
            lineHeight: 1.5,
            fontFamily: 'var(--font-journal)',
          }}>
            {truncateText(entry.content, 150)}
          </p>

          {/* Tags & Meta */}
          <div style={{
            display: 'flex',
            gap: 6,
            marginTop: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {entry.tags?.slice(0, 3).map(tag => (
              <span key={tag} className="tag" style={{ fontSize: 10, padding: '2px 8px' }}>
                {tag}
              </span>
            ))}
            {entry.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--neutral-400)' }}>
                <MapPin size={10} />
                {entry.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
