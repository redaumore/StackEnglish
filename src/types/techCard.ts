export type ContextDomain = 'git' | 'architecture' | 'agile' | 'debugging' | 'ci_cd';

export interface TechCard {
  id: string;
  sourcePhrase: string;          // e.g. "Address PR feedback"
  modelAnswer: string;           // e.g. "To make requested code changes and reply to reviewer comments"
  forbiddenWords: string[];      // Roots/lemmas not to say: ["address", "pr", "feedback"]
  contextDomain: ContextDomain;
  // SRS SM-2 Properties
  repetition: number;            // Consecutive successful reviews
  intervalDays: number;          // Current interval in days (0 = same session/day)
  easeFactor: number;            // SM-2 Ease Factor (default: 2.5, min: 1.3)
  nextReviewDate: string;        // ISO 8601 string UTC
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationRequest {
  cardId: string;
  sourcePhrase: string;
  modelAnswer: string;
  forbiddenWords: string[];
  userTranscript: string;
  speechDurationSeconds: number;
}

export interface EvaluationResult {
  cardId: string;
  scores: {
    semanticEquivalence: number; // 1.0 - 5.0 (Weight: 40%)
    lexicalCompliance: number;   // 1.0 - 5.0 (Weight: 20%)
    grammarAndSyntax: number;    // 1.0 - 5.0 (Weight: 25%)
    vocabularyRange: number;     // 1.0 - 5.0 (Weight: 15%)
    overallScore: number;        // Weighted average
  };
  telemetry: {
    durationSeconds: number;
    paceCategory: 'fast' | 'thoughtful' | 'extended';
  };
  insights: {
    meaningSummary: string;          // 1 descriptive line of conceptual success
    repeatedForbiddenWords: string[]; // Forbidden words detected (empty if compliant)
    grammarBullets: string[];        // Max 2 direct atomic corrections
    polishedSentence: string;       // User's sentence corrected and polished
  };
  srsUpdate: {
    rating: 'again' | 'hard' | 'good' | 'easy';
    newIntervalDays: number;
    newEaseFactor: number;
    newRepetition: number;
    nextReviewDate: string;         // ISO 8601 calculated
  };
}

export interface SM2State {
  intervalDays: number;
  easeFactor: number;
  repetition: number;
}

export interface SM2Output {
  rating: 'again' | 'hard' | 'good' | 'easy';
  newIntervalDays: number;
  newEaseFactor: number;
  newRepetition: number;
  nextReviewDate: string;
}
