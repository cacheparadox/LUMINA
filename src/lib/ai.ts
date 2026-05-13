// OpenRouter AI integration with multi-model fallback
// Works offline by gracefully degrading

import type { EmotionScore } from './db';

export interface AIConfig {
  apiKey: string;
  models: string[];
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const DEFAULT_MODELS = [
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o-mini',
  'google/gemini-flash-1.5',
  'meta-llama/llama-3.1-8b-instruct:free',
];

export function getAIConfig(): AIConfig | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('lumina_ai_config');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem('lumina_ai_config', JSON.stringify(config));
}

export async function callLLM(
  messages: AIMessage[],
  config?: AIConfig | null
): Promise<string> {
  const aiConfig = config || getAIConfig();
  if (!aiConfig?.apiKey) {
    throw new Error('No API key configured');
  }

  const models = aiConfig.models.length > 0 ? aiConfig.models : DEFAULT_MODELS;

  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'LUMINA Journal',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated.';
      }
    } catch {
      continue;
    }
  }

  throw new Error('All models failed. Check your API key or try again later.');
}

// ── Emotion Scoring Prompt ─────────────────────────────────────

export function buildEmotionScoringPrompt(content: string): AIMessage[] {
  return [
    {
      role: 'system',
      content: `You are LUMINA's emotion analysis engine. Analyze journal entries and return ONLY valid JSON. No markdown, no explanations.

You must identify the dominant emotions and their intensity (1-10 scale). Also provide a one-line poetic summary of the entry's emotional essence.

Respond ONLY with this exact JSON format:
{
  "emotions": [
    {"emotion": "joy", "intensity": 7},
    {"emotion": "nostalgia", "intensity": 5}
  ],
  "summary": "A warm reflection on childhood memories tinged with bittersweet longing."
}

Valid emotions: joy, sadness, anger, fear, love, hope, anxiety, nostalgia, gratitude, excitement, loneliness, peace, pride, shame, guilt, confusion, determination, wonder, grief, contentment`
    },
    {
      role: 'user',
      content: `Score the emotions in this journal entry:\n\n${content.slice(0, 1000)}`
    }
  ];
}

export function parseEmotionScores(response: string): { emotions: EmotionScore[]; summary: string } | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.emotions && Array.isArray(parsed.emotions)) {
      return {
        emotions: parsed.emotions.map((e: { emotion: string; intensity: number }) => ({
          emotion: e.emotion,
          intensity: Math.min(10, Math.max(1, Math.round(e.intensity))),
        })),
        summary: parsed.summary || '',
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Emotional Trend Analysis Prompt ────────────────────────────

export function buildTrendAnalysisPrompt(
  entries: { content: string; mood: number; emotionScores?: EmotionScore[]; createdAt: Date }[],
  period: 'weekly' | 'monthly'
): AIMessage[] {
  const entrySummaries = entries.map((e, i) => {
    const emotions = e.emotionScores?.map(s => `${s.emotion}(${s.intensity})`).join(', ') || 'not scored';
    return `Entry ${i + 1} (${new Date(e.createdAt).toLocaleDateString()}, mood: ${e.mood}/5, emotions: ${emotions}):\n${e.content.slice(0, 200)}`;
  }).join('\n\n');

  return [
    {
      role: 'system',
      content: `You are LUMINA's emotional trend analyst. You analyze ${period} journal entries with warmth and psychological insight. You notice patterns, growth, and areas of concern. Never be judgmental. Respond in JSON format ONLY:
{
  "summary": "2-3 sentence emotional overview of the period",
  "dominantEmotions": [{"emotion": "joy", "intensity": 7}],
  "themes": ["creativity", "self-care"],
  "growthObservation": "A warm observation about personal growth",
  "concern": "Any gentle concern or suggestion, or null if none"
}`
    },
    {
      role: 'user',
      content: `Analyze these ${period} journal entries:\n\n${entrySummaries}`
    }
  ];
}

// ── Emotional Analysis Prompt (existing, enhanced) ─────────────

export function buildAnalysisPrompt(entries: { content: string; mood: number; createdAt: Date }[]): AIMessage[] {
  const entrySummaries = entries.map((e, i) => 
    `Entry ${i + 1} (${new Date(e.createdAt).toLocaleDateString()}, mood: ${e.mood}/5):\n${e.content.slice(0, 300)}`
  ).join('\n\n');

  return [
    {
      role: 'system',
      content: `You are LUMINA's emotional reflection engine — Life Unfolding through Memory, Introspection & Narrative Analysis. You analyze journal entries with warmth, empathy, and psychological insight. Never be judgmental. Be like a kind, wise friend. 

CRITICAL: Keep responses as brief as possible while remaining meaningful. Avoid tables entirely. Only provide long replies if the user's input explicitly requires a deep dive.`
    },
    {
      role: 'user',
      content: `Analyze these recent journal entries and provide:\n1. An emotional summary (2-3 sentences)\n2. Recurring themes you notice\n3. A growth observation\n4. A gentle suggestion\n\nEntries:\n${entrySummaries}`
    }
  ];
}

// ── Chat with past self prompt ─────────────────────────────────

export function buildChatPrompt(
  question: string,
  relevantEntries: { content: string; mood: number; createdAt: Date }[]
): AIMessage[] {
  const context = relevantEntries.map(e =>
    `[${new Date(e.createdAt).toLocaleDateString()}, mood: ${e.mood}/5]: ${e.content.slice(0, 200)}`
  ).join('\n');

  return [
    {
      role: 'system',
      content: `You are LUMINA's memory companion — Life Unfolding through Memory, Introspection & Narrative Analysis. The user is asking about their past journal entries. Answer based ONLY on the provided entries. Be warm, insightful, and reference specific entries when possible. 

CRITICAL: Keep responses extremely brief and focused. Avoid tables. If you don't have enough data to answer, say so gently.`
    },
    {
      role: 'user',
      content: `Based on my journal entries:\n\n${context}\n\nMy question: ${question}`
    }
  ];
}

// ── Yearly Rewind Prompt ───────────────────────────────────────

export function buildRewindPrompt(
  entries: { content: string; mood: number; emotionScores?: EmotionScore[]; createdAt: Date }[],
  year: number
): AIMessage[] {
  const highlights = entries
    .filter(e => e.emotionScores && e.emotionScores.some(s => s.intensity >= 7))
    .slice(0, 20);

  const entrySummaries = highlights.map((e, i) => {
    const emotions = e.emotionScores?.map(s => `${s.emotion}(${s.intensity})`).join(', ') || '';
    return `${new Date(e.createdAt).toLocaleDateString()}: ${e.content.slice(0, 150)} [${emotions}]`;
  }).join('\n');

  return [
    {
      role: 'system',
      content: `You are LUMINA's yearly rewind narrator. Create a beautiful, emotional, poetic summary of the user's year. Reference specific moments. Structure as:
1. Opening reflection (poetic, 2-3 sentences)
2. Your Emotional Seasons (divide the year into emotional phases)
3. Peak Moments (most intense memories)
4. Growth Arc (how the user evolved)
5. A closing message of love and encouragement

Keep it warm, personal, and beautiful. Use gentle metaphors.`
    },
    {
      role: 'user',
      content: `Create my ${year} emotional rewind from these high-intensity journal entries:\n\n${entrySummaries}\n\nTotal entries this year: ${entries.length}`
    }
  ];
}
