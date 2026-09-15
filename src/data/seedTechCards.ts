import type { TechCard, ContextDomain } from '../types/techCard';
import type { SRSCard, Category } from '../types/srs';

/**
 * Seed cards from specification (Oral Tech Paraphrase on SRS.md)
 */
export const SEED_TECH_CARDS: TechCard[] = [
  {
    id: 'card_001',
    sourcePhrase: 'Address PR feedback',
    modelAnswer: 'To make requested code changes and reply to reviewer comments',
    forbiddenWords: ['address', 'pr', 'feedback'],
    contextDomain: 'git',
    repetition: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    nextReviewDate: new Date(Date.now() - 1000).toISOString(),
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'card_002',
    sourcePhrase: 'Pair program on a tricky bug',
    modelAnswer: 'To collaborate synchronously with another engineer on the same screen to debug complex code',
    forbiddenWords: ['pair', 'program', 'tricky', 'bug'],
    contextDomain: 'debugging',
    repetition: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    nextReviewDate: new Date(Date.now() - 1000).toISOString(),
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'card_003',
    sourcePhrase: 'Put up a pull request for review',
    modelAnswer: 'To open a PR and request peer code critique and approvals',
    forbiddenWords: ['put', 'pull', 'request', 'review'],
    contextDomain: 'git',
    repetition: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    nextReviewDate: new Date(Date.now() - 1000).toISOString(),
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
  {
    id: 'card_004',
    sourcePhrase: 'Roll back the breaking deployment',
    modelAnswer: 'To revert the production release to the previous stable release because of critical failures',
    forbiddenWords: ['roll', 'back', 'breaking', 'deployment'],
    contextDomain: 'ci_cd',
    repetition: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    nextReviewDate: new Date(Date.now() - 1000).toISOString(),
    createdAt: '2026-09-15T00:00:00Z',
    updatedAt: '2026-09-15T00:00:00Z',
  },
];

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'for', 'of', 'in', 'on', 'with', 'at',
  'by', 'from', 'up', 'about', 'into', 'over', 'after', 'beneath', 'under', 'above',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'we', 'you', 'they', 'i', 'it', 'our', 'your', 'their', 'this', 'that'
]);

function mapCategoryToDomain(category: Category): ContextDomain {
  switch (category) {
    case 'Kick-off':
      return 'agile';
    case 'Standup / Follow-up':
      return 'agile';
    case 'Scope Negotiation':
      return 'agile';
    case 'Architecture Review':
      return 'architecture';
    case 'Post-Mortem':
      return 'debugging';
    default:
      return 'architecture';
  }
}

/**
 * Extracts forbidden words from a phrase by taking significant tokens (length > 2, not stop words)
 */
export function extractForbiddenWords(phrase: string): string[] {
  const words = phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return Array.from(new Set(words));
}

/**
 * Converts standard flashcard (SRSCard) into a TechCard for Oral Paraphrasing
 */
export function convertFlashcardToTechCard(card: SRSCard): TechCard {
  const forbidden = extractForbiddenWords(card.phrase);
  return {
    id: `tech-from-${card.id}`,
    sourcePhrase: card.phrase,
    modelAnswer: card.meaning_en,
    forbiddenWords: forbidden.length > 0 ? forbidden : card.phrase.toLowerCase().split(/\s+/),
    contextDomain: mapCategoryToDomain(card.category),
    repetition: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    nextReviewDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
