import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TechCard, EvaluationResult } from '../types/techCard';
import type { SRSCard } from '../types/srs';
import { SEED_TECH_CARDS, convertFlashcardToTechCard } from '../data/seedTechCards';

const STORAGE_KEYS = {
  TECH_CARDS: 'stackenglish_tech_paraphrase_cards_v1',
  HISTORY: 'stackenglish_tech_paraphrase_history_v1',
};

const LEGACY_STORAGE_KEYS = {
  TECH_CARDS: 'anki4devs_tech_paraphrase_cards_v1',
  HISTORY: 'anki4devs_tech_paraphrase_history_v1',
};

export function useParaphraseSRS() {
  const [techCards, setTechCards] = useState<TechCard[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TECH_CARDS) || localStorage.getItem(LEGACY_STORAGE_KEYS.TECH_CARDS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load tech cards from localStorage:', e);
    }
    return SEED_TECH_CARDS;
  });

  const [history, setHistory] = useState<EvaluationResult[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HISTORY) || localStorage.getItem(LEGACY_STORAGE_KEYS.HISTORY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load paraphrase history:', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TECH_CARDS, JSON.stringify(techCards));
    } catch (e) {
      console.error('Failed to save tech cards:', e);
    }
  }, [techCards]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, [history]);

  // Due cards (nextReviewDate <= now)
  const dueCards = useMemo(() => {
    const now = new Date().toISOString();
    return techCards.filter((card) => !card.nextReviewDate || card.nextReviewDate <= now);
  }, [techCards]);

  // Save an evaluation result and update card SRS state
  const recordEvaluation = useCallback((cardId: string, result: EvaluationResult) => {
    const nowISO = new Date().toISOString();

    setTechCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        return {
          ...card,
          repetition: result.srsUpdate.newRepetition,
          intervalDays: result.srsUpdate.newIntervalDays,
          easeFactor: result.srsUpdate.newEaseFactor,
          nextReviewDate: result.srsUpdate.nextReviewDate,
          updatedAt: nowISO,
        };
      })
    );

    setHistory((prev) => [result, ...prev.slice(0, 99)]);
  }, []);

  // Import / Convert flashcards into TechCards
  const importFlashcards = useCallback((flashcards: SRSCard[]) => {
    setTechCards((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const existingPhrases = new Set(prev.map((c) => c.sourcePhrase.toLowerCase().trim()));

      const converted: TechCard[] = [];
      for (const fc of flashcards) {
        if (!existingPhrases.has(fc.phrase.toLowerCase().trim())) {
          const tc = convertFlashcardToTechCard(fc);
          if (!existingIds.has(tc.id)) {
            converted.push(tc);
          }
        }
      }

      return [...prev, ...converted];
    });
  }, []);

  // Reset progress for a single card
  const resetCard = useCallback((cardId: string) => {
    setTechCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              repetition: 0,
              intervalDays: 0,
              easeFactor: 2.5,
              nextReviewDate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  }, []);

  // Restore seed deck
  const restoreSeedCards = useCallback(() => {
    setTechCards(SEED_TECH_CARDS);
  }, []);

  // Add custom tech card
  const addTechCard = useCallback((cardData: Omit<TechCard, 'id' | 'repetition' | 'intervalDays' | 'easeFactor' | 'nextReviewDate' | 'createdAt' | 'updatedAt'>) => {
    const newCard: TechCard = {
      ...cardData,
      id: `tech-${Date.now()}`,
      repetition: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      nextReviewDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTechCards((prev) => [newCard, ...prev]);
  }, []);

  return {
    techCards,
    dueCards,
    history,
    recordEvaluation,
    importFlashcards,
    resetCard,
    restoreSeedCards,
    addTechCard,
  };
}
