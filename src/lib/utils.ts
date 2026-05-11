import { format, subDays, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

// Mood labels and colors
export const MOOD_CONFIG = {
  1: { label: 'Awful', emoji: '😞', color: '#9B8BB4', gradient: 'from-[#9B8BB4] to-[#7B6B94]' },
  2: { label: 'Bad', emoji: '😔', color: '#C4A0B5', gradient: 'from-[#C4A0B5] to-[#A48095]' },
  3: { label: 'Okay', emoji: '😐', color: '#E8C8A0', gradient: 'from-[#E8C8A0] to-[#D0B090]' },
  4: { label: 'Good', emoji: '😊', color: '#A8D4A0', gradient: 'from-[#A8D4A0] to-[#88B480]' },
  5: { label: 'Amazing', emoji: '✨', color: '#F4A0B5', gradient: 'from-[#F4A0B5] to-[#E08095]' },
} as const;

export const ENERGY_LEVELS = ['Exhausted', 'Low', 'Moderate', 'Energized', 'Overflowing'];
export const ANXIETY_LEVELS = ['Calm', 'Mild', 'Moderate', 'High', 'Overwhelming'];

export const EMOTION_STICKERS = [
  '🌸', '🌙', '☀️', '🌧️', '⛈️', '🌈', '🍃', '🔥',
  '💜', '💗', '💛', '💚', '🩵', '🤍', '🖤', '❤️‍🩹',
  '😊', '😢', '😡', '😴', '🥰', '😤', '🤗', '😌',
  '✨', '🦋', '🌻', '🎵', '📖', '🎨', '🧘', '💫',
];

export const TAG_SUGGESTIONS = [
  'personal', 'work', 'family', 'friends', 'health', 'creativity',
  'relationships', 'growth', 'anxiety', 'gratitude', 'dream', 'milestone',
  'travel', 'nature', 'music', 'reading', 'workout', 'meditation',
];

// Date helpers
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return format(new Date(date), 'MMM d, yyyy');
}

export function getWeekDates(): Date[] {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
}

export function getMonthDates(date: Date): Date[] {
  return eachDayOfInterval({
    start: startOfMonth(date),
    end: endOfMonth(date),
  });
}

export function isSameDayCheck(a: Date, b: Date): boolean {
  return isSameDay(new Date(a), new Date(b));
}

// Text helpers
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

export function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Search helper
export function searchEntries(query: string, content: string): boolean {
  return content.toLowerCase().includes(query.toLowerCase());
}

export function vibrate(pattern: number | number[] = 50) {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch(e) {}
  }
}
