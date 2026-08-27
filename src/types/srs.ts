export type Category =
  | 'Kick-off'
  | 'Standup / Follow-up'
  | 'Scope Negotiation'
  | 'Architecture Review'
  | 'Post-Mortem';

export type Grade = 1 | 2 | 3 | 4; // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy

export type TTSProvider = 'web-speech' | 'openai';
export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
export type OpenAIModel = 'tts-1' | 'tts-1-hd';

export interface SRSCard {
  id: string;
  phrase: string;
  category: Category;
  meaning_en: string;
  example_sentence: string;
  repetition: number;
  interval: number; // in days
  easeFactor: number; // default: 2.5, min: 1.3
  dueDate: string; // ISO string
  lastReviewed: string | null; // ISO string | null
  tags?: string[];
  createdAt: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  timestamp: string;
  grade: Grade;
  previousInterval: number;
  newInterval: number;
  previousEaseFactor: number;
  newEaseFactor: number;
}

export interface NextIntervalPreview {
  grade: Grade;
  interval: number;
  intervalLabel: string;
  easeFactor: number;
}

export interface UserSettings {
  newCardsPerDay: number;
  sessionDurationMinutes: number;
  preferredVoiceURI: string;
  playbackRate: number; // 0.8 | 1.0 | 1.2
  theme: 'dark' | 'light' | 'system';
  autoPlayPhraseAudio: boolean;
  autoPlaySentenceAudio: boolean;
  ttsProvider: TTSProvider;
  openAIApiKey: string;
  openAIVoice: OpenAIVoice;
  openAIModel: OpenAIModel;
}

export interface DeckStats {
  totalCards: number;
  dueTodayCount: number;
  newCardsAvailableCount: number;
  masteredCardsCount: number; // interval >= 21
  learningCardsCount: number; // interval between 1 and 20
  streakDays: number;
  todayReviewedCount: number;
  categoryBreakdown: Record<Category, { total: number; mastered: number; due: number }>;
}
