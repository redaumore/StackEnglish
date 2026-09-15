import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Category, DeckStats, Grade, ReviewLog, SRSCard, UserSettings } from '../types/srs';
import { DEFAULT_DECK } from '../data/defaultDeck';
import { calculateSM2, isCardDue, isCardMastered, isCardNew } from '../utils/sm2';
import { getEnvOpenAIApiKey, getEnvGeminiApiKey } from '../utils/env';

const STORAGE_KEYS = {
  CARDS: 'stackenglish_cards_v1',
  SETTINGS: 'stackenglish_settings_v1',
  REVIEWS: 'stackenglish_reviews_v1',
};

const LEGACY_STORAGE_KEYS = {
  CARDS: 'anki4devs_cards_v1',
  SETTINGS: 'anki4devs_settings_v1',
  REVIEWS: 'anki4devs_reviews_v1',
};

const DEFAULT_SETTINGS: UserSettings = {
  newCardsPerDay: 10,
  sessionDurationMinutes: 20,
  preferredVoiceURI: '',
  playbackRate: 1.0,
  theme: 'dark',
  autoPlayPhraseAudio: false,
  autoPlaySentenceAudio: false,
  ttsProvider: getEnvOpenAIApiKey() ? 'openai' : 'web-speech',
  openAIApiKey: getEnvOpenAIApiKey(),
  geminiApiKey: getEnvGeminiApiKey(),
  openAIVoice: 'alloy',
  openAIModel: 'tts-1',
};


function calculateStreak(logs: ReviewLog[]): number {
  if (!logs || logs.length === 0) return 0;

  const dates = Array.from(
    new Set(
      logs.map((log) => {
        const d = new Date(log.timestamp);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })
    )
  ).sort().reverse();

  if (dates.length === 0) return 0;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  let streak = 0;
  let checkDate = new Date();

  if (dates[0] === todayStr) {
    streak = 1;
    checkDate.setDate(checkDate.getDate() - 1);
  } else if (dates[0] === yesterdayStr) {
    streak = 1;
    checkDate = new Date(yesterday);
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    return 0;
  }

  while (true) {
    const formatted = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (dates.includes(formatted)) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function useSRS() {
  const [cards, setCards] = useState<SRSCard[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CARDS) || localStorage.getItem(LEGACY_STORAGE_KEYS.CARDS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load cards from storage', e);
    }
    return DEFAULT_DECK;
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const envOpenAI = getEnvOpenAIApiKey();
    const envGemini = getEnvGeminiApiKey();

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS) || localStorage.getItem(LEGACY_STORAGE_KEYS.SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        const resolvedOpenAI = parsed.openAIApiKey?.trim() ? parsed.openAIApiKey : envOpenAI;
        const resolvedGemini = parsed.geminiApiKey?.trim() ? parsed.geminiApiKey : envGemini;
        // If envOpenAI exists and user hasn't explicitly set ttsProvider or it was default web-speech with no key, prefer openai
        const resolvedProvider =
          parsed.ttsProvider === 'openai' || (envOpenAI && !parsed.openAIApiKey)
            ? 'openai'
            : parsed.ttsProvider || DEFAULT_SETTINGS.ttsProvider;

        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          openAIApiKey: resolvedOpenAI,
          geminiApiKey: resolvedGemini,
          ttsProvider: resolvedProvider,
        };
      }
    } catch (e) {
      console.error('Failed to load settings from storage', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REVIEWS) || localStorage.getItem(LEGACY_STORAGE_KEYS.REVIEWS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load review logs from storage', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
    } catch (e) {
      console.error('Failed to persist cards', e);
    }
  }, [cards]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to persist settings', e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviewLogs));
    } catch (e) {
      console.error('Failed to persist review logs', e);
    }
  }, [reviewLogs]);

  const stats: DeckStats = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let dueTodayCount = 0;
    let newCardsAvailableCount = 0;
    let masteredCardsCount = 0;
    let learningCardsCount = 0;

    const breakdown: Record<Category, { total: number; mastered: number; due: number }> = {
      'Kick-off': { total: 0, mastered: 0, due: 0 },
      'Standup / Follow-up': { total: 0, mastered: 0, due: 0 },
      'Scope Negotiation': { total: 0, mastered: 0, due: 0 },
      'Architecture Review': { total: 0, mastered: 0, due: 0 },
      'Post-Mortem': { total: 0, mastered: 0, due: 0 },
    };

    cards.forEach((c) => {
      if (breakdown[c.category]) {
        breakdown[c.category].total += 1;
      }

      if (isCardMastered(c)) {
        masteredCardsCount += 1;
        if (breakdown[c.category]) breakdown[c.category].mastered += 1;
      } else if (!isCardNew(c)) {
        learningCardsCount += 1;
      }

      if (isCardNew(c)) {
        newCardsAvailableCount += 1;
      } else if (isCardDue(c, now)) {
        dueTodayCount += 1;
        if (breakdown[c.category]) breakdown[c.category].due += 1;
      }
    });

    const todayReviewedCount = reviewLogs.filter((log) => {
      const d = new Date(log.timestamp);
      const logDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return logDay === todayStr;
    }).length;

    const streakDays = calculateStreak(reviewLogs);

    return {
      totalCards: cards.length,
      dueTodayCount,
      newCardsAvailableCount,
      masteredCardsCount,
      learningCardsCount,
      streakDays,
      todayReviewedCount,
      categoryBreakdown: breakdown,
    };
  }, [cards, reviewLogs]);

  const getSessionCards = useCallback(
    (categoryFilter?: Category | 'All', mode: 'standard' | 'reviewed_only' | 'all' = 'standard'): SRSCard[] => {
      const now = new Date();
      let pool = cards;
      if (categoryFilter && categoryFilter !== 'All') {
        pool = cards.filter((c) => c.category === categoryFilter);
      }

      if (mode === 'reviewed_only') {
        return pool.filter((c) => !isCardNew(c));
      }

      if (mode === 'all') {
        return pool;
      }

      const dueCards = pool.filter((c) => isCardDue(c, now));
      const unstudiedCards = pool.filter((c) => isCardNew(c));

      // Group unstudied cards by category to interleave across available topics
      const cardsByCategory = new Map<string, SRSCard[]>();
      unstudiedCards.forEach((card) => {
        const catList = cardsByCategory.get(card.category);
        if (catList) {
          catList.push(card);
        } else {
          cardsByCategory.set(card.category, [card]);
        }
      });

      const interleavedNewCards: SRSCard[] = [];
      const queues = Array.from(cardsByCategory.values());
      let hasMore = true;
      let round = 0;

      while (hasMore) {
        hasMore = false;
        for (const queue of queues) {
          if (round < queue.length) {
            interleavedNewCards.push(queue[round]);
            hasMore = true;
          }
        }
        round++;
      }

      const newBatch = interleavedNewCards.slice(0, settings.newCardsPerDay);

      return [...dueCards, ...newBatch];
    },
    [cards, settings.newCardsPerDay]
  );

  const gradeCard = useCallback(
    (cardId: string, grade: Grade): SRSCard => {
      const targetIndex = cards.findIndex((c) => c.id === cardId);
      if (targetIndex === -1) {
        throw new Error(`Card ${cardId} not found`);
      }

      const currentCard = cards[targetIndex];
      const prevInterval = currentCard.interval;
      const prevEF = currentCard.easeFactor;

      const sm2Result = calculateSM2(currentCard, grade);

      const updatedCard: SRSCard = {
        ...currentCard,
        interval: sm2Result.interval,
        repetition: sm2Result.repetition,
        easeFactor: sm2Result.easeFactor,
        dueDate: sm2Result.dueDate,
        lastReviewed: sm2Result.lastReviewed,
      };

      setCards((prev) => {
        const next = [...prev];
        next[targetIndex] = updatedCard;
        return next;
      });

      const newLog: ReviewLog = {
        id: 'rev-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        cardId,
        timestamp: new Date().toISOString(),
        grade,
        previousInterval: prevInterval,
        newInterval: sm2Result.interval,
        previousEaseFactor: prevEF,
        newEaseFactor: sm2Result.easeFactor,
      };

      setReviewLogs((prev) => [...prev, newLog]);

      return updatedCard;
    },
    [cards]
  );

  const addCard = useCallback((newCardData: Omit<SRSCard, 'id' | 'repetition' | 'interval' | 'easeFactor' | 'dueDate' | 'lastReviewed' | 'createdAt'>) => {
    const newCard: SRSCard = {
      ...newCardData,
      id: 'card-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
      repetition: 0,
      interval: 0,
      easeFactor: 2.5,
      dueDate: new Date().toISOString(),
      lastReviewed: null,
      createdAt: new Date().toISOString(),
    };
    setCards((prev) => [newCard, ...prev]);
    return newCard;
  }, []);

  const updateCard = useCallback((updatedCard: SRSCard) => {
    setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

  const resetCardProgress = useCallback((cardId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              repetition: 0,
              interval: 0,
              easeFactor: 2.5,
              dueDate: new Date().toISOString(),
              lastReviewed: null,
            }
          : c
      )
    );
  }, []);

  const resetAllProgress = useCallback(() => {
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString(),
        lastReviewed: null,
      }))
    );
    setReviewLogs([]);
  }, []);

  const restoreDefaultDeck = useCallback(() => {
    setCards(DEFAULT_DECK);
    setReviewLogs([]);
  }, []);

  const exportDeckJSON = useCallback(
    (extraData?: { scripts?: unknown; scriptProgress?: unknown }): string => {
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        totalCards: cards.length,
        cards,
        settings,
        ...(extraData?.scripts ? { totalScripts: (extraData.scripts as any[]).length, scripts: extraData.scripts } : {}),
        ...(extraData?.scriptProgress ? { scriptProgress: extraData.scriptProgress } : {}),
      };
      return JSON.stringify(exportData, null, 2);
    },
    [cards, settings]
  );


  const importDeckJSON = useCallback(
    (
      jsonString: string,
      mode: 'merge' | 'replace' = 'merge',
      onImportScripts?: (
        rawScripts: unknown,
        rawProgress?: unknown,
        mode?: 'merge' | 'replace'
      ) => { importedCount: number; duplicatesSkipped: number; progressImportedCount: number }
    ): {
      count: number;
      duplicatesSkipped: number;
      scriptsImported?: number;
      scriptsSkipped?: number;
      scriptsProgressImported?: number;
    } => {
      let parsed: any;
      try {
        parsed = JSON.parse(jsonString);
      } catch {
        throw new Error('Invalid JSON format.');
      }

      let importedCards: SRSCard[] = [];
      let hasCards = false;

      if (Array.isArray(parsed)) {
        importedCards = parsed;
        hasCards = true;
      } else if (parsed && Array.isArray(parsed.cards)) {
        importedCards = parsed.cards;
        hasCards = true;
      }

      let scriptsResult: { importedCount: number; duplicatesSkipped: number; progressImportedCount: number } | undefined;
      if (onImportScripts && parsed && !Array.isArray(parsed) && Array.isArray(parsed.scripts)) {
        scriptsResult = onImportScripts(parsed.scripts, parsed.scriptProgress, mode);
      }

      // If user supplied a file with scripts only or cards only or both
      if (!hasCards && !scriptsResult) {
        throw new Error('JSON does not contain a valid cards or speaking scripts array.');
      }

      let validCards: SRSCard[] = [];
      if (hasCards) {
        validCards = importedCards.filter(
          (c) => c && typeof c.phrase === 'string' && typeof c.category === 'string' && typeof c.meaning_en === 'string'
        );
      }

      if (validCards.length === 0 && (!scriptsResult || scriptsResult.importedCount === 0)) {
        if (!scriptsResult || (scriptsResult.importedCount === 0 && scriptsResult.duplicatesSkipped === 0)) {
          throw new Error('No valid cards or speaking scripts found in imported data.');
        }
      }

      if (validCards.length === 0) {
        return {
          count: 0,
          duplicatesSkipped: 0,
          scriptsImported: scriptsResult?.importedCount || 0,
          scriptsSkipped: scriptsResult?.duplicatesSkipped || 0,
          scriptsProgressImported: scriptsResult?.progressImportedCount || 0,
        };
      }

      if (mode === 'replace') {
        setCards(validCards);
        return {
          count: validCards.length,
          duplicatesSkipped: 0,
          scriptsImported: scriptsResult?.importedCount || 0,
          scriptsSkipped: scriptsResult?.duplicatesSkipped || 0,
          scriptsProgressImported: scriptsResult?.progressImportedCount || 0,
        };
      }

      let duplicatesSkipped = 0;
      const existingPhrases = new Set(cards.map((c) => c.phrase.trim().toLowerCase()));
      const existingIds = new Set(cards.map((c) => c.id));
      const toAdd: SRSCard[] = [];

      for (const card of validCards) {
        const phraseKey = card.phrase.trim().toLowerCase();
        if (existingPhrases.has(phraseKey)) {
          duplicatesSkipped++;
          continue;
        }

        const id = existingIds.has(card.id) ? 'card-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6) : card.id;

        toAdd.push({
          ...card,
          id,
          repetition: card.repetition ?? 0,
          interval: card.interval ?? 0,
          easeFactor: card.easeFactor ?? 2.5,
          dueDate: card.dueDate ?? new Date().toISOString(),
          lastReviewed: card.lastReviewed ?? null,
          createdAt: card.createdAt ?? new Date().toISOString(),
        });
        existingPhrases.add(phraseKey);
        existingIds.add(id);
      }

      setCards((prev) => [...prev, ...toAdd]);
      return {
        count: toAdd.length,
        duplicatesSkipped,
        scriptsImported: scriptsResult?.importedCount || 0,
        scriptsSkipped: scriptsResult?.duplicatesSkipped || 0,
        scriptsProgressImported: scriptsResult?.progressImportedCount || 0,
      };
    },
    [cards]
  );

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  return {
    cards,
    settings,
    reviewLogs,
    stats,
    getSessionCards,
    gradeCard,
    addCard,
    updateCard,
    deleteCard,
    resetCardProgress,
    resetAllProgress,
    restoreDefaultDeck,
    exportDeckJSON,
    importDeckJSON,
    updateSettings,
  };
}
