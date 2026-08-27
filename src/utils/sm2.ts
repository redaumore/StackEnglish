import type { Grade, NextIntervalPreview, SRSCard } from '../types/srs';

export interface SM2Result {
  interval: number;
  repetition: number;
  easeFactor: number;
  dueDate: string;
  lastReviewed: string;
}

export function formatInterval(days: number): string {
  if (days < 1) return '<1d';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) {
    const months = (days / 30).toFixed(1).replace(/\.0$/, '');
    return `${months}mo`;
  }
  const years = (days / 365).toFixed(1).replace(/\.0$/, '');
  return `${years}y`;
}

export function calculateSM2(
  card: Pick<SRSCard, 'interval' | 'repetition' | 'easeFactor'>,
  grade: Grade,
  now: Date = new Date()
): SM2Result {
  let newRepetition = card.repetition;
  let newInterval = card.interval;
  let newEaseFactor = card.easeFactor || 2.5;

  if (grade === 1) {
    // Again: Failure
    newRepetition = 0;
    newInterval = 1;
    newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
  } else if (grade === 2) {
    // Hard: Successful but with strain
    newRepetition = newRepetition + 1;
    if (newRepetition === 1) {
      newInterval = 1;
    } else if (newRepetition === 2) {
      newInterval = 3;
    } else {
      newInterval = Math.max(newInterval + 1, Math.round(newInterval * 1.2));
    }
    newEaseFactor = Math.max(1.3, newEaseFactor - 0.15);
  } else if (grade === 3) {
    // Good: Standard SM-2 progression
    newRepetition = newRepetition + 1;
    if (newRepetition === 1) {
      newInterval = 1;
    } else if (newRepetition === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(newInterval * newEaseFactor);
    }
  } else if (grade === 4) {
    // Easy: Confident recall, bonus multiplier
    newRepetition = newRepetition + 1;
    if (newRepetition === 1) {
      newInterval = 3;
    } else if (newRepetition === 2) {
      newInterval = 8;
    } else {
      newInterval = Math.round(newInterval * newEaseFactor * 1.3);
    }
    newEaseFactor = Math.max(1.3, newEaseFactor + 0.15);
  }

  const nextDate = new Date(now.getTime());
  nextDate.setUTCDate(nextDate.getUTCDate() + newInterval);
  nextDate.setUTCHours(4, 0, 0, 0);

  return {
    interval: newInterval,
    repetition: newRepetition,
    easeFactor: Number(newEaseFactor.toFixed(2)),
    dueDate: nextDate.toISOString(),
    lastReviewed: now.toISOString(),
  };
}

export function getIntervalPreviews(card: SRSCard): Record<Grade, NextIntervalPreview> {
  const grades: Grade[] = [1, 2, 3, 4];
  const previews = {} as Record<Grade, NextIntervalPreview>;

  for (const g of grades) {
    const result = calculateSM2(card, g);
    previews[g] = {
      grade: g,
      interval: result.interval,
      intervalLabel: formatInterval(result.interval),
      easeFactor: result.easeFactor,
    };
  }

  return previews;
}

export function isCardDue(card: SRSCard, now: Date = new Date()): boolean {
  if (!card.lastReviewed) {
    return false;
  }
  return new Date(card.dueDate).getTime() <= now.getTime();
}

export function isCardNew(card: SRSCard): boolean {
  return card.lastReviewed === null;
}

export function isCardMastered(card: SRSCard): boolean {
  return card.interval >= 21 || card.repetition >= 4;
}
