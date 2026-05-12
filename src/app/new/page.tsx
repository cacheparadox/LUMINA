'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db, computeIntensity, isHighIntensityEntry, getSetting } from '@/lib/db';
import type { EmotionScore } from '@/lib/db';
import { callLLM, buildEmotionScoringPrompt, parseEmotionScores, getAIConfig } from '@/lib/ai';
import AppShell from '@/components/AppShell';
import MoodSelector from '@/components/MoodSelector';
import VoiceRecorder from '@/components/VoiceRecorder';
import EmotionBadge from '@/components/EmotionBadge';
import { EMOTION_STICKERS, TAG_SUGGESTIONS, ENERGY_LEVELS, ANXIETY_LEVELS, vibrate, MOOD_CONFIG } from '@/lib/utils';
import {
  ArrowLeft, Save, Tag, MapPin, Image as ImageIcon,
  Mic, X, ChevronDown, ChevronUp, Sparkles, Loader2
} from 'lucide-react';

const MOOD_QUOTES: Record<number, string[]> = {
  1: [ // Awful
    "Even the darkest night will end, and the sun will rise.",
    "It's okay to not be okay. You're still here, and that matters.",
    "Storms don't last forever. You are stronger than you know.",
    "This too shall pass. Be gentle with yourself today.",
    "Breathe. You're just having a bad day, not a bad life.",
    "Your feelings are valid, but they are not your permanent reality.",
    "Softness is not weakness. It takes courage to stay delicate in a tough world.",
    "Healing is not linear. Give yourself permission to rest.",
    "You are doing the best you can with what you have.",
    "Small steps still move you forward.",
    "The sun is a daily reminder that we too can rise from the darkness.",
    "You don't have to carry the whole world on your shoulders.",
    "Rest is productive. Your worth is not tied to your output.",
    "Courage doesn't always roar. Sometimes it's the quiet voice at the end of the day.",
    "You have survived 100% of your hardest days.",
    "Be your own safest place today.",
    "It's okay to let go of what you can't control.",
    "A seed must spend time in the dark before it can bloom.",
    "You are enough, exactly as you are in this moment.",
    "This feeling is a visitor. It will leave when it's ready.",
    "Give yourself the same grace you give to others."
  ],
  2: [ // Bad
    "Bad days build good people. You're growing through this.",
    "You don't have to be positive all the time. Feel what you feel.",
    "The wound is where the light enters you. — Rumi",
    "Some days you survive, and that is enough.",
    "Everything you're feeling is teaching you something.",
    "Growth often happens in the uncomfortable silences.",
    "You are allowed to take up space, even when you're not at your best.",
    "One day, this will be a story of how you overcame.",
    "In the middle of difficulty lies opportunity. — Einstein",
    "Be patient with your process.",
    "You are not your mistakes. You are the person who learns from them.",
    "Flowers need rain as much as they need sun.",
    "Trust the timing of your life.",
    "Don't compare your behind-the-scenes with everyone else's highlight reel.",
    "Your value is inherent. It cannot be earned or lost.",
    "You are allowed to start over as many times as you need.",
    "Sometimes the most productive thing you can do is relax.",
    "The forest would be very silent if only the best birds sang.",
    "You are a work in progress, and that is beautiful.",
    "Keep going. The view is better from the next hill.",
    "You are stronger than the things that try to break you."
  ],
  3: [ // Okay
    "You're exactly where you need to be right now.",
    "Ordinary days are the ones we remember most fondly.",
    "Life is a collection of moments. You just captured one.",
    "Stillness is not the absence of motion, but the presence of peace.",
    "Balance is not something you find, it's something you create.",
    "There is magic in the mundane.",
    "Appreciate the quiet moments. They are the anchors of life.",
    "Consistency is the quietest form of greatness.",
    "Root yourself in the present. The future can wait.",
    "Every day holds a small miracle if you look closely enough.",
    "Peace is a choice you make, one breath at a time.",
    "You are the architect of your own calm.",
    "Contentment is a superpower in a world that always wants more.",
    "Enjoy the space between 'no longer' and 'not yet'.",
    "The middle path is often the most beautiful one.",
    "Simple days are soul food.",
    "Find joy in the rhythm of the ordinary.",
    "You don't need a reason to feel at peace.",
    "Life doesn't have to be perfect to be wonderful.",
    "Breathe in the now. It's all we truly have.",
    "Slow down. You're not missing anything."
  ],
  4: [ // Good
    "Your light is contagious. Keep shining.",
    "Good energy attracts good things. Today proved it.",
    "Happiness is not a destination—it's a way of traveling.",
    "This feeling? You deserve it. Remember it.",
    "Optimism is a radical act of self-care.",
    "You are creating a life you love, one day at a time.",
    "Success is falling in love with the process.",
    "Your growth is visible. Be proud of yourself.",
    "Confidence is not 'they will like me', it's 'I'll be fine if they don't'.",
    "Celebrate the small wins. They lead to the big ones.",
    "You are blooming in your own time.",
    "Positivity is like a muscle. The more you use it, the stronger it gets.",
    "Life is rewarding your courage.",
    "Kindness is the ultimate form of strength.",
    "You are making an impact, even when you don't see it.",
    "Keep that spark. It's what makes you, you.",
    "The world needs more of your specific kind of magic.",
    "You are attracting everything you've been working for.",
    "Joy is what happens when we allow ourselves to recognize how good things are.",
    "Your future is as bright as your faith.",
    "You are a magnet for miracles."
  ],
  5: [ // Amazing
    "You are radiant today. The universe feels it too.",
    "Moments like these are what life is made of. ✨",
    "Bottled lightning — that's what today feels like.",
    "When was the last time you felt this alive? Save this feeling.",
    "Abundance is your natural state.",
    "You are standing in the full light of your own potential.",
    "Anything is possible when you believe in your own power.",
    "Gratitude turns what we have into enough, and more.",
    "You are a masterpiece in progress.",
    "The energy you're putting out is coming back ten-fold.",
    "This is your season of growth and joy.",
    "You have everything you need to create the life of your dreams.",
    "Today was a victory. Own it.",
    "Your soul is singing today. Listen to it.",
    "You are a force of nature.",
    "Infinite possibilities are opening up for you.",
    "The sky isn't the limit; it's just the beginning.",
    "You are at the peak of your powers.",
    "Magic is something you make, and you're making it now.",
    "Bliss is your birthright.",
    "Shine on, you brilliant human. The world is watching."
  ],
};

function NewEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const promptText = searchParams.get('prompt');

  const [title, setTitle] = useState(promptText || '');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [anxiety, setAnxiety] = useState(2);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [location, setLocation] = useState('');
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [magicMoment, setMagicMoment] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [audioBlobs, setAudioBlobs] = useState<{ blob: Blob; duration: number }[]>([]);
  const [isVoiceEntry, setIsVoiceEntry] = useState(false);
  const [recentTags, setRecentTags] = useState<string[]>(TAG_SUGGESTIONS.slice(0, 8));
  const [savedQuote, setSavedQuote] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function loadTags() {
      const allEntries = await db.entries.toArray();
      const tagCounts: Record<string, number> = {};
      allEntries.forEach(e => {
        e.tags.forEach(t => {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        });
      });
      const sortedTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(t => t[0]);
        
      const combined = Array.from(new Set([...sortedTags.slice(0, 8), ...TAG_SUGGESTIONS.slice(0, 4)]));
      setRecentTags(combined.slice(0, 10)); // Limit to 10
    }
    loadTags();
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.focus();
      if (promptText) {
        contentRef.current.setSelectionRange(content.length, content.length);
      }
    }
  }, []);

  const handleSave = async () => {
    if (!content.trim() && !title.trim()) return;
    setSaving(true);

    try {
      vibrate([30, 50, 30]);
      setMagicMoment(true);
      await new Promise(r => setTimeout(r, 600));

      const entryId = await db.entries.add({
        title: title || (content.trim().split('\n')[0].slice(0, 50)),
        content: selectedStickers.length > 0 ? `${selectedStickers.join(' ')} ${content}` : content,
        mood,
        energy,
        anxiety,
        customEmotions: selectedStickers,
        tags,
        location: location || undefined,
        isVoiceEntry,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Save mood record
      await db.moods.add({
        score: mood,
        energy,
        anxiety,
        customEmotions: selectedStickers,
        timestamp: new Date(),
        entryId: entryId as number,
      });

      // Save photos as media
      for (const photo of photos) {
        await db.media.add({
          entryId: entryId as number,
          type: 'photo',
          blob: photo,
          createdAt: new Date(),
        });
      }

      // Save audio recordings
      for (const audio of audioBlobs) {
        await db.media.add({
          entryId: entryId as number,
          type: 'audio',
          blob: audio.blob,
          duration: audio.duration,
          createdAt: new Date(),
        });
      }

      // AI Emotion Scoring (async, non-blocking)
      scoreEmotions(entryId as number, content);

      // Ntfy Integration
      const ntfyEnabled = await getSetting('ntfy_enabled') === 'true';
      const ntfyChannel = await getSetting('ntfy_channel');
      if (ntfyEnabled && ntfyChannel) {
        try {
          const moodEmoji = MOOD_CONFIG[mood as keyof typeof MOOD_CONFIG].emoji;
          fetch(`https://ntfy.sh/${ntfyChannel}`, {
            method: 'POST',
            body: `New Memory: ${title || 'Untitled'}\nMood: ${moodEmoji}\nEnergy: ${energy}/5\nAnxiety: ${anxiety}/5\nTags: ${tags.join(', ')}\n\n${content}`,
            headers: {
              'Title': 'LUMINA Entry Saved',
              'Tags': 'memo,brain,sparkles',
              'Priority': 'default'
            }
          });
        } catch (e) {
          console.error('Ntfy send failed:', e);
        }
      }

      // Show mood quote instead of navigating immediately
      const quotes = MOOD_QUOTES[mood as keyof typeof MOOD_QUOTES] || MOOD_QUOTES[3];
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setSavedQuote(randomQuote);
      setSaving(false);
    } catch (err) {
      console.error('Failed to save entry:', err);
      setSaving(false);
    }
  };

  const scoreEmotions = async (entryId: number, text: string) => {
    const config = getAIConfig();
    if (!config?.apiKey || text.length < 20) return;
    try {
      const prompt = buildEmotionScoringPrompt(text);
      const response = await callLLM(prompt, config);
      const result = parseEmotionScores(response);
      if (result) {
        const intensity = computeIntensity(result.emotions);
        await db.entries.update(entryId, {
          emotionScores: result.emotions,
          overallIntensity: intensity,
          isHighIntensity: isHighIntensityEntry(intensity),
          aiSummary: result.summary,
        });
      }
    } catch (err) {
      console.error('Emotion scoring failed:', err);
    }
  };

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags(prev => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <AppShell>
      <div className="page-enter">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button
            className="btn-ghost"
            onClick={() => router.back()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--neutral-400)' }}>{wordCount} words</span>
            <motion.button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </motion.button>
          </div>
        </div>

        {/* Prompt Banner */}
        {promptText && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, var(--lavender-100), var(--pink-100))',
              borderRadius: 'var(--radius-md)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkles size={14} color="var(--lavender-500)" />
            <span style={{ fontSize: 12, color: 'var(--lavender-500)', fontWeight: 500 }}>
              Writing from today&apos;s reflection prompt
            </span>
          </motion.div>
        )}

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Give this entry a title..."
          className="input"
          style={{
            fontSize: 20,
            fontWeight: 600,
            border: 'none',
            background: 'transparent',
            padding: '8px 0',
            marginBottom: 4,
          }}
        />

        {/* Content */}
        <div className="glass-card-static" style={{ padding: 20, marginBottom: 24, minHeight: 200 }}>
          <textarea
            ref={contentRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What's on your mind? Let your thoughts flow freely..."
            className="input-journal"
            style={{ minHeight: 250 }}
          />
        </div>

        {/* Voice Recording */}
        <div style={{ marginBottom: 20 }}>
          <button
            className="btn-ghost"
            onClick={() => setShowVoice(!showVoice)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: showVoice ? 16 : 0 }}
          >
            <Mic size={16} style={{ color: 'var(--pink-400)' }} />
            {showVoice ? 'Hide Voice Recorder' : 'Record Voice Note'}
          </button>
          {showVoice && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <div className="glass-card-static" style={{ padding: 24 }}>
                <VoiceRecorder
                  onRecordingComplete={(blob, duration) => {
                    setAudioBlobs(prev => [...prev, { blob, duration }]);
                    setIsVoiceEntry(true);
                  }}
                  onTranscript={(text) => {
                    setContent(prev => prev ? prev + '\n\n' + text : text);
                  }}
                />
                {audioBlobs.length > 0 && (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--neutral-400)' }}>
                    {audioBlobs.length} voice note{audioBlobs.length > 1 ? 's' : ''} attached
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sticker Row */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-400)', marginBottom: 8 }}>
            How are you feeling? (tap to add)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EMOTION_STICKERS.slice(0, 16).map(sticker => (
              <motion.button
                key={sticker}
                whileTap={{ scale: 0.8 }}
                onClick={() => {
                  setSelectedStickers(prev =>
                    prev.includes(sticker) ? prev.filter(s => s !== sticker) : [...prev, sticker]
                  );
                }}
                style={{
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  borderRadius: 'var(--radius-sm)',
                  border: selectedStickers.includes(sticker) ? '2px solid var(--pink-300)' : '1px solid var(--neutral-100)',
                  background: selectedStickers.includes(sticker) ? 'var(--pink-100)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {sticker}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Mood & Energy */}
        <div className="glass-card-static" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 16 }}>
            Mood Check-in
          </h3>
          <MoodSelector value={mood} onChange={setMood} />

          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>Energy</span>
              <span style={{ fontSize: 12, color: 'var(--pink-400)', fontWeight: 500 }}>
                {ENERGY_LEVELS[energy - 1]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={energy}
              onChange={e => setEnergy(Number(e.target.value))}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--neutral-500)' }}>Stress Level</span>
              <span style={{ fontSize: 12, color: 'var(--lavender-400)', fontWeight: 500 }}>
                {ANXIETY_LEVELS[anxiety - 1]}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={anxiety}
              onChange={e => setAnxiety(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="glass-card-static" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag size={14} /> Tags
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {recentTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`tag ${tags.includes(tag) ? 'tag-pink' : ''}`}
                style={{ cursor: 'pointer', border: 'none', opacity: tags.includes(tag) ? 1 : 0.5, transition: 'opacity 0.2s' }}
              >
                {tag}
              </button>
            ))}
            {tags.filter(t => !recentTags.includes(t)).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="tag tag-pink"
                style={{ cursor: 'pointer', border: 'none' }}
              >
                {tag}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomTag()}
              placeholder="Add custom tag..."
              className="input"
              style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
            />
            <button className="btn-secondary" onClick={addCustomTag} style={{ padding: '8px 16px', fontSize: 13 }}>
              Add
            </button>
          </div>
        </div>

        {/* Advanced Options */}
        <button
          className="btn-ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 6,
            marginBottom: 12,
          }}
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAdvanced ? 'Less options' : 'More options'}
        </button>

        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            style={{ overflow: 'hidden' }}
          >
            {/* Location */}
            <div className="glass-card-static" style={{ padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} /> Location
              </h3>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Where are you writing from?"
                className="input"
              />
            </div>

            {/* Photo Upload */}
            <div className="glass-card-static" style={{ padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ImageIcon size={14} /> Photos
              </h3>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                  border: '2px dashed var(--neutral-200)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  color: 'var(--neutral-400)',
                  fontSize: 13,
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
                <ImageIcon size={18} style={{ marginRight: 8 }} />
                Tap to add photos
              </label>
              {photos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                  {photos.map((p, i) => {
                    const url = URL.createObjectURL(p);
                    return (
                      <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        <img
                          src={url}
                          alt="Upload"
                          onClick={() => setFullscreenImage(url)}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                        />
                        <button
                          className="btn-ghost"
                          onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ position: 'absolute', top: 4, right: 4, padding: 4, background: 'rgba(0,0,0,0.5)', color: 'white' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
        <div style={{ height: 60 }} />

        {/* Fullscreen Image Overlay */}
        {fullscreenImage && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'zoom-out'
            }}
            onClick={() => setFullscreenImage(null)}
          >
            <img
              src={fullscreenImage}
              style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }}
              alt="Fullscreen view"
            />
          </div>
        )}

        {/* Magic Moment Animation */}
        {magicMoment && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 2, 4] }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '150vh',
              height: '150vh',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${MOOD_CONFIG[mood as keyof typeof MOOD_CONFIG].color} 0%, transparent 70%)`,
              zIndex: 9999,
              pointerEvents: 'none',
              mixBlendMode: 'screen'
            }}
          />
        )}

        {/* Post-Save Mood Quote Overlay */}
        <AnimatePresence>
          {savedQuote && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => router.push('/')}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: 'var(--background)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 40,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Sparkles size={48} style={{ color: MOOD_CONFIG[mood as keyof typeof MOOD_CONFIG].color, marginBottom: 32 }} />
                <h2 style={{
                  fontSize: 24,
                  fontWeight: 600,
                  color: 'var(--neutral-800)',
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-journal)',
                  maxWidth: 500,
                  marginBottom: 40,
                }}>
                  "{savedQuote}"
                </h2>
                <p style={{ fontSize: 13, color: 'var(--neutral-400)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Tap anywhere to continue
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

export default function NewEntryPage() {
  return (
    <Suspense fallback={<AppShell><div style={{ padding: 40, textAlign: 'center' }}>Loading...</div></AppShell>}>
      <NewEntryForm />
    </Suspense>
  );
}
