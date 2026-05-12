import Dexie, { type Table } from 'dexie';

// ── Types ──────────────────────────────────────────────────────

export interface EmotionScore {
  emotion: string;       // e.g. "joy", "sadness", "anger", "hope", "anxiety", "love"
  intensity: number;     // 1-10 scale
}

export interface JournalEntry {
  id?: number;
  title: string;
  content: string;
  mood: number;           // 1-5 scale
  energy: number;         // 1-5 scale
  anxiety: number;        // 1-5 scale
  customEmotions: string[];
  tags: string[];
  location?: string;
  location?: string;
  isLocked?: boolean;
  isVoiceEntry?: boolean;
  // ── Emotion Scoring ──
  emotionScores?: EmotionScore[];    // AI-scored emotions
  overallIntensity?: number;          // 1-10, computed from emotion scores
  isHighIntensity?: boolean;          // true if intensity >= 7 (becomes a Memory)
  aiSummary?: string;                 // AI-generated one-line summary
  // ── Dates ──
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaItem {
  id?: number;
  entryId: number;
  type: 'photo' | 'audio' | 'video';
  blob: Blob;
  caption?: string;
  transcript?: string;
  duration?: number;     // audio/video duration in seconds
  createdAt: Date;
}

export interface MoodRecord {
  id?: number;
  score: number;
  energy: number;
  anxiety: number;
  customEmotions: string[];
  timestamp: Date;
  entryId?: number;
}

export interface Prompt {
  id?: number;
  category: string;
  text: string;
  isFavorite?: boolean;
}

export interface Habit {
  id?: number;
  type: 'sleep' | 'water' | 'workout' | 'reading' | 'meditation' | 'custom';
  label?: string;
  value: number;
  unit?: string;
  timestamp: Date;
}

export interface GratitudeEntry {
  id?: number;
  text: string;
  promptText?: string;
  createdAt: Date;
}

export interface AIMemory {
  id?: number;
  entryId: number;
  summary: string;
  emotionalTone: string;
  themes: string[];
  embedding?: number[];
  createdAt: Date;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: string;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

// ── NEW: Emotional Trend Report ──
export interface EmotionalReport {
  id?: number;
  period: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  summary: string;
  dominantEmotions: EmotionScore[];
  moodAverage: number;
  entryCount: number;
  themes: string[];
  growthObservation: string;
  createdAt: Date;
}

// ── NEW: Notification/Reminder ──
export interface Reminder {
  id?: number;
  type: 'checkin' | 'anniversary' | 'rewind';
  title: string;
  body: string;
  scheduledFor: Date;
  seen: boolean;
  entryId?: number;       // linked entry for anniversaries
  createdAt: Date;
}

// ── NEW: Theme/Customization Preferences ──
export interface ThemePreference {
  id?: number;
  key: string;
  value: string;
}

// ── Database ───────────────────────────────────────────────────

class LuminaDB extends Dexie {
  entries!: Table<JournalEntry>;
  media!: Table<MediaItem>;
  moods!: Table<MoodRecord>;
  prompts!: Table<Prompt>;
  habits!: Table<Habit>;
  gratitude!: Table<GratitudeEntry>;
  aiMemories!: Table<AIMemory>;
  settings!: Table<AppSettings>;
  chatMessages!: Table<ChatMessage>;
  emotionalReports!: Table<EmotionalReport>;
  reminders!: Table<Reminder>;
  themePrefs!: Table<ThemePreference>;

  constructor() {
    super('lumina');

    this.version(1).stores({
      entries: '++id, title, mood, energy, anxiety, createdAt, updatedAt, *tags, isLocked',
      media: '++id, entryId, type, createdAt',
      moods: '++id, score, energy, anxiety, timestamp, entryId',
      prompts: '++id, category, isFavorite',
      habits: '++id, type, timestamp',
      gratitude: '++id, createdAt',
      aiMemories: '++id, entryId, emotionalTone, createdAt',
      settings: '++id, &key',
      chatMessages: '++id, role, createdAt',
    });

    this.version(2).stores({
      entries: '++id, title, mood, energy, anxiety, createdAt, updatedAt, *tags, isLocked, isHighIntensity, overallIntensity, isVoiceEntry',
      media: '++id, entryId, type, createdAt',
      moods: '++id, score, energy, anxiety, timestamp, entryId',
      prompts: '++id, category, isFavorite',
      habits: '++id, type, timestamp',
      gratitude: '++id, createdAt',
      aiMemories: '++id, entryId, emotionalTone, createdAt',
      settings: '++id, &key',
      chatMessages: '++id, role, createdAt',
      emotionalReports: '++id, period, startDate, endDate, createdAt',
      reminders: '++id, type, scheduledFor, seen, entryId, createdAt',
      themePrefs: '++id, &key',
    });
  }
}

export const db = new LuminaDB();

// ── Helper: Get/Set app setting ────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.settings.where('key').equals(key).first();
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const existing = await db.settings.where('key').equals(key).first();
  if (existing) {
    await db.settings.update(existing.id!, { value });
  } else {
    await db.settings.add({ key, value });
  }
}

// ── Helper: Get/Set theme pref ─────────────────────────────────

export async function getThemePref(key: string): Promise<string | null> {
  const row = await db.themePrefs.where('key').equals(key).first();
  return row?.value ?? null;
}

export async function setThemePref(key: string, value: string): Promise<void> {
  const existing = await db.themePrefs.where('key').equals(key).first();
  if (existing) {
    await db.themePrefs.update(existing.id!, { value });
  } else {
    await db.themePrefs.add({ key, value });
  }
}

// ── Helper: Compute intensity ──────────────────────────────────

export function computeIntensity(scores: EmotionScore[]): number {
  if (!scores || scores.length === 0) return 0;
  const avg = scores.reduce((sum, s) => sum + s.intensity, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

export function isHighIntensityEntry(intensity: number): boolean {
  return intensity >= 7;
}

// ── Seed Data ──────────────────────────────────────────────────

export async function seedPrompts() {
  await db.prompts.clear();

  const prompts: Omit<Prompt, 'id'>[] = [
    // Self-Discovery
    { category: 'self-discovery', text: 'What version of yourself are you slowly becoming through your daily habits?' },
    { category: 'self-discovery', text: 'What do you pretend doesn’t bother you, but actually does?' },
    { category: 'self-discovery', text: 'What parts of your personality only appear when you feel safe?' },
    { category: 'self-discovery', text: 'What are you chasing right now—and what do you think it will finally give you?' },
    { category: 'self-discovery', text: 'What patterns keep repeating in your life no matter the environment?' },
    { category: 'self-discovery', text: 'If your thoughts became visible above your head for one day, what would embarrass you most?' },
    { category: 'self-discovery', text: 'What do you miss about the person you used to be?' },
    { category: 'self-discovery', text: 'What do you tolerate that quietly drains your spirit?' },
    { category: 'self-discovery', text: 'When do you feel most like yourself?' },
    { category: 'self-discovery', text: 'What truth have you been delaying because accepting it would force change?' },
    // Healing
    { category: 'healing', text: 'What memory still hurts even though you act like it doesn’t?' },
    { category: 'healing', text: 'What would forgiveness look like if it wasn’t about excusing someone?' },
    { category: 'healing', text: 'What are you emotionally exhausted from carrying?' },
    { category: 'healing', text: 'What wound keeps shaping your decisions today?' },
    { category: 'healing', text: 'What would healing feel like if nobody else ever apologized?' },
    { category: 'healing', text: 'What pain are you trying to outwork instead of process?' },
    { category: 'healing', text: 'What do you wish someone had said to you when you needed it most?' },
    { category: 'healing', text: 'What are you still blaming yourself for unfairly?' },
    { category: 'healing', text: 'If your younger self saw your current life, what would they need comfort about?' },
    { category: 'healing', text: 'What part of yourself deserves more gentleness?' },
    // Relationships
    { category: 'relationships', text: 'Who makes you feel emotionally safe without trying?' },
    { category: 'relationships', text: 'What kind of love are you secretly hoping to experience someday?' },
    { category: 'relationships', text: 'What behavior do you repeatedly accept even though it hurts you?' },
    { category: 'relationships', text: 'What conversations are long overdue?' },
    { category: 'relationships', text: 'What does your ideal friendship feel like emotionally?' },
    { category: 'relationships', text: 'Who drains your energy the fastest—and why?' },
    { category: 'relationships', text: 'What do you need more of in relationships that you rarely ask for?' },
    { category: 'relationships', text: 'What attachment patterns do you notice in yourself?' },
    { category: 'relationships', text: 'When do you feel most emotionally understood?' },
    { category: 'relationships', text: 'What kind of people bring out the best version of you?' },
    // Productivity
    { category: 'productivity', text: 'What are you avoiding right now that would improve your life the most?' },
    { category: 'productivity', text: 'What excuse do you use most often when you delay something important?' },
    { category: 'productivity', text: 'What does your ideal productive day actually look like?' },
    { category: 'productivity', text: 'What task keeps mentally following you everywhere?' },
    { category: 'productivity', text: 'What habits create momentum for you almost instantly?' },
    { category: 'productivity', text: 'What distractions steal the most time from your life?' },
    { category: 'productivity', text: 'What are you consuming more than creating?' },
    { category: 'productivity', text: 'What would happen if you stayed consistent for 90 days?' },
    { category: 'productivity', text: 'What goal matters enough that failure would genuinely hurt?' },
    { category: 'productivity', text: 'What are you waiting for permission to begin?' },
    // Shadow Work
    { category: 'shadow-work', text: 'What trait in other people secretly irritates you because you recognize it in yourself?' },
    { category: 'shadow-work', text: 'What emotion do you avoid feeling most often?' },
    { category: 'shadow-work', text: 'What version of yourself are you afraid of becoming?' },
    { category: 'shadow-work', text: 'What insecurity silently controls more of your behavior than you\'d admit?' },
    { category: 'shadow-work', text: 'What lie about yourself have you repeated so often it feels true?' },
    { category: 'shadow-work', text: 'What are you trying to prove—and to whom?' },
    { category: 'shadow-work', text: 'What would happen if you stopped performing and were fully honest?' },
    { category: 'shadow-work', text: 'What hidden fear shapes most of your decisions?' },
    { category: 'shadow-work', text: 'When do you become the most emotionally reactive?' },
    { category: 'shadow-work', text: 'What darkness inside you needs understanding instead of suppression?' },
    // Gratitude
    { category: 'gratitude', text: 'What small moment today deserved more appreciation than you gave it?' },
    { category: 'gratitude', text: 'Who in your life quietly improves it just by existing?' },
    { category: 'gratitude', text: 'What hardship unintentionally made you stronger?' },
    { category: 'gratitude', text: 'What part of your current life did you once pray for?' },
    { category: 'gratitude', text: 'What simple comfort would be devastating to lose?' },
    { category: 'gratitude', text: 'What memory always warms you when you revisit it?' },
    { category: 'gratitude', text: 'What are you taking for granted right now?' },
    { category: 'gratitude', text: 'What made today slightly better than yesterday?' },
    { category: 'gratitude', text: 'What personal growth are you proud of lately?' },
    { category: 'gratitude', text: 'What beauty did you notice today that most people probably ignored?' },
    // Creativity
    { category: 'creativity', text: 'What idea keeps returning to you no matter how often you ignore it?' },
    { category: 'creativity', text: 'What would you create if nobody could judge the outcome?' },
    { category: 'creativity', text: 'What emotion inspires your creativity most strongly?' },
    { category: 'creativity', text: 'What kind of art or content feels deeply \'you\'?' },
    { category: 'creativity', text: 'What story inside you still hasn’t been expressed?' },
    { category: 'creativity', text: 'What project would make you proud even if nobody saw it?' },
    { category: 'creativity', text: 'What aesthetics or atmospheres emotionally captivate you lately?' },
    { category: 'creativity', text: 'What creative risk are you too afraid to take?' },
    { category: 'creativity', text: 'What inspires you instantly every single time?' },
    { category: 'creativity', text: 'What does your imagination crave more of?' },
    // Late Night Thoughts
    { category: 'late-night', text: 'What thought keeps visiting you after midnight?' },
    { category: 'late-night', text: 'What are you afraid might never happen for you?' },
    { category: 'late-night', text: 'What feeling have you been numbing with distractions lately?' },
    { category: 'late-night', text: 'What version of your future scares you most?' },
    { category: 'late-night', text: 'What do you wish someone understood about you without explanation?' },
    { category: 'late-night', text: 'What loneliness have you learned to hide well?' },
    { category: 'late-night', text: 'If tonight could speak back to you, what would it say?' },
    { category: 'late-night', text: 'What memory randomly appears when the world gets quiet?' },
    { category: 'late-night', text: 'What emotional weight are you pretending is manageable?' },
    { category: 'late-night', text: 'What truth becomes louder when you’re alone?' },
    // Future Self
    { category: 'future-self', text: 'What would your future self beg you to start today?' },
    { category: 'future-self', text: 'What habits would completely transform your life if compounded for years?' },
    { category: 'future-self', text: 'What are you sacrificing long-term happiness for short-term comfort?' },
    { category: 'future-self', text: 'What kind of life would make your current struggles worth it?' },
    { category: 'future-self', text: 'What identity are your current actions building?' },
    { category: 'future-self', text: 'What would happen if you became radically disciplined for one year?' },
    { category: 'future-self', text: 'What future are you slowly creating through repetition?' },
    { category: 'future-self', text: 'What are you postponing that your future self desperately needs?' },
    { category: 'future-self', text: 'What does your dream life actually feel like emotionally?' },
    { category: 'future-self', text: 'If you met yourself five years from now, would they thank you or warn you?' },
    // Love & Intimacy
    { category: 'intimacy', text: 'What kind of affection heals you the fastest?' },
    { category: 'intimacy', text: 'What does emotional intimacy mean to you beyond romance?' },
    { category: 'intimacy', text: 'What fear do you carry into love without realizing it?' },
    { category: 'intimacy', text: 'What kind of person makes you feel calm instead of addicted?' },
    { category: 'intimacy', text: 'What do you crave emotionally but rarely admit out loud?' },
    { category: 'intimacy', text: 'What relationship memory still lingers softly in your mind?' },
    { category: 'intimacy', text: 'What walls do you put up when someone gets too close?' },
    { category: 'intimacy', text: 'What would secure, healthy love feel like in your daily life?' },
    { category: 'intimacy', text: 'What kind of love story are you secretly hoping for?' },
    { category: 'intimacy', text: 'What emotional need have you ignored for too long?' }
  ];

  await db.prompts.bulkAdd(prompts);
}
