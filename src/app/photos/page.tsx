'use client';

import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';
import AppShell from '@/components/AppShell';
import { Image as ImageIcon, Heart, Filter } from 'lucide-react';
import { MOOD_CONFIG } from '@/lib/utils';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function PhotosPage() {
  const router = useRouter();
  const media = useLiveQuery(
    () => db.media.where('type').equals('photo').reverse().toArray(),
    []
  );

  const entries = useLiveQuery(
    () => db.entries.toArray(),
    []
  );

  const [filter, setFilter] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  // Build photo entries with metadata
  const photos = useMemo(() => {
    if (!media || !entries) return [];
    return media.map(m => {
      const entry = entries.find(e => e.id === m.entryId);
      return { ...m, entry };
    }).filter(p => !filter || p.entry?.mood === filter);
  }, [media, entries, filter]);

  return (
    <AppShell>
      <div className="page-enter">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--neutral-700)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ImageIcon size={24} style={{ color: 'var(--pink-300)' }} />
            Photo Memories
          </h1>
          <p style={{ fontSize: 14, color: 'var(--neutral-400)', marginBottom: 20 }}>
            A visual garden of your memories
          </p>
        </motion.div>

        {/* Mood Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          <Filter size={14} style={{ color: 'var(--neutral-400)' }} />
          <button
            onClick={() => setFilter(null)}
            className={filter === null ? 'tag tag-pink' : 'tag'}
            style={{ cursor: 'pointer', border: 'none' }}
          >
            All
          </button>
          {([1, 2, 3, 4, 5] as const).map(mood => (
            <button
              key={mood}
              onClick={() => setFilter(mood)}
              className={filter === mood ? 'tag tag-pink' : 'tag'}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              {MOOD_CONFIG[mood].emoji}
            </button>
          ))}
        </div>

        {photos.length === 0 ? (
          <div className="glass-card-static" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📷</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 8 }}>
              No photos yet
            </h3>
            <p style={{ fontSize: 14, color: 'var(--neutral-400)' }}>
              Attach photos to your journal entries to build your memory wall.
            </p>
          </div>
        ) : (
          <div className="masonry-grid">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="masonry-item"
                onClick={() => photo.entry?.id ? router.push(`/entry/${photo.entry.id}`) : setSelectedPhoto(photo.id!)}
              >
                <img
                  src={URL.createObjectURL(photo.blob)}
                  alt={photo.caption || 'Memory'}
                  style={{ borderRadius: 'var(--radius-lg)' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '24px 12px 12px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                  borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                  color: 'white',
                }}>
                  {photo.entry && (
                    <>
                      <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{MOOD_CONFIG[photo.entry.mood as keyof typeof MOOD_CONFIG]?.emoji}</span>
                        <span>{format(new Date(photo.entry.createdAt), 'MMM d')}</span>
                      </div>
                      {photo.caption && (
                        <p style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>{photo.caption}</p>
                      )}
                    </>
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
