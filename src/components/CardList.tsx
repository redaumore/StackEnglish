import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Search,
  Plus,
  Download,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  BarChart3,
  Play,
  Pause,
  Brain,
  TrendingUp,
  Award,
} from 'lucide-react';
import type { Category, DeckStats, Grade, SRSCard, UserSettings } from '../types/srs';
import { ALL_CATEGORIES, CATEGORY_STYLES } from '../utils/categoryColors';
import { formatInterval, isCardDue, isCardMastered, isCardNew } from '../utils/sm2';
import { AudioButton } from './AudioButton';
import { FlashcardRadarChart } from './FlashcardRadarChart';
import { Flashcard } from './Flashcard';
import { useTimer } from '../hooks/useTimer';

interface CardListProps {
  cards: SRSCard[];
  stats?: DeckStats;
  settings: UserSettings;
  initialView?: 'execution' | 'analytics';
  initialCategory?: Category | 'All';
  onViewChange?: (view: 'execution' | 'analytics') => void;
  onGradeCard?: (cardId: string, grade: Grade) => void;
  onStartStudy?: (category?: Category | 'All', mode?: 'standard' | 'reviewed_only' | 'all') => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (card: SRSCard) => void;
  onDeleteCard: (cardId: string) => void;
  onResetCardProgress: (cardId: string) => void;
  onOpenImportExport: () => void;
}

type StatusFilter = 'all' | 'due' | 'learning' | 'mastered' | 'new';
export type ViewMode = 'execution' | 'analytics';

interface SessionStats {
  totalReviewed: number;
  gradeCounts: Record<Grade, number>;
  cardsStudied: Array<{ card: SRSCard; grade: Grade }>;
}

export const CardList: React.FC<CardListProps> = ({
  cards,
  stats,
  settings,
  initialView = 'execution',
  initialCategory = 'All',
  onViewChange,
  onGradeCard,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteCard,
  onResetCardProgress,
  onOpenImportExport,
}) => {
  const [internalView, setInternalView] = useState<ViewMode>(initialView);
  const activeView = initialView ?? internalView;

  const handleViewChange = (mode: ViewMode) => {
    setInternalView(mode);
    onViewChange?.(mode);
  };

  // --------------------------------------------------------------------------
  // Flashcard Exercise State (Feature Execution Tab)
  // --------------------------------------------------------------------------
  const [exerciseCategory, setExerciseCategory] = useState<Category | 'All'>(initialCategory);
  const [prevInitialCategory, setPrevInitialCategory] = useState<Category | 'All'>(initialCategory);

  if (prevInitialCategory !== initialCategory) {
    setPrevInitialCategory(initialCategory);
    setExerciseCategory(initialCategory);
  }

  const [exerciseMode, setExerciseMode] = useState<'due' | 'all'>('due');

  // Compute eligible session cards
  const eligibleSessionCards = useMemo(() => {
    return cards.filter((c) => {
      const matchCat = exerciseCategory === 'All' || c.category === exerciseCategory;
      if (!matchCat) return false;
      if (exerciseMode === 'due') {
        return isCardDue(c);
      }
      return true;
    });
  }, [cards, exerciseCategory, exerciseMode]);

  const [queue, setQueue] = useState<SRSCard[]>(eligibleSessionCards);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [isSessionCompleted, setIsSessionCompleted] = useState<boolean>(false);
  const [isSessionStarted, setIsSessionStarted] = useState<boolean>(false);

  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalReviewed: 0,
    gradeCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
    cardsStudied: [],
  });

  // Timer for Flashcard Exercise
  const timer = useTimer(settings.sessionDurationMinutes || 20);
  const timerStartRef = useRef(timer.start);
  const timerPauseRef = useRef(timer.pause);
  const timerResetRef = useRef(timer.reset);

  useEffect(() => {
    timerStartRef.current = timer.start;
    timerPauseRef.current = timer.pause;
    timerResetRef.current = timer.reset;
  });

  const handleStartSession = useCallback(() => {
    setIsSessionStarted(true);
    timerStartRef.current();
  }, []);

  // Sync queue when category or mode changes
  const resetExerciseSession = useCallback(
    (newCategory: Category | 'All', newMode: 'due' | 'all') => {
      setExerciseCategory(newCategory);
      setExerciseMode(newMode);
      const newQueue = cards.filter((c) => {
        const matchCat = newCategory === 'All' || c.category === newCategory;
        if (!matchCat) return false;
        if (newMode === 'due') return isCardDue(c);
        return true;
      });
      setQueue(newQueue);
      setCurrentIndex(0);
      setIsCardFlipped(false);
      setIsSessionCompleted(false);
      setIsSessionStarted(false);
      timerResetRef.current(settings.sessionDurationMinutes || 20);
      setSessionStats({
        totalReviewed: 0,
        gradeCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
        cardsStudied: [],
      });
    },
    [cards, settings.sessionDurationMinutes]
  );

  useEffect(() => {
    if (activeView === 'execution' && isSessionStarted && !isSessionCompleted) {
      timerStartRef.current();
    } else {
      timerPauseRef.current();
    }
  }, [activeView, isSessionStarted, isSessionCompleted]);

  const currentCard = queue[currentIndex];

  const handleFlip = useCallback(() => {
    setIsCardFlipped((prev) => !prev);
  }, []);

  const handleGrade = useCallback(
    (grade: Grade) => {
      if (!currentCard) return;

      onGradeCard?.(currentCard.id, grade);

      setSessionStats((prev) => ({
        totalReviewed: prev.totalReviewed + 1,
        gradeCounts: {
          ...prev.gradeCounts,
          [grade]: prev.gradeCounts[grade] + 1,
        },
        cardsStudied: [...prev.cardsStudied, { card: currentCard, grade }],
      }));

      const reviewedCard: SRSCard = {
        ...currentCard,
        lastReviewed: new Date().toISOString(),
      };

      if (grade === 1) {
        setQueue((prev) => [...prev, reviewedCard]);
      }

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsCardFlipped(false);
      } else {
        setIsSessionCompleted(true);
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      }
    },
    [currentCard, currentIndex, queue.length, onGradeCard]
  );

  // Keyboard Shortcuts for Flashcard Drill
  useEffect(() => {
    if (activeView !== 'execution' || !isSessionStarted || isSessionCompleted || !currentCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (isCardFlipped) {
        if (e.key === '1') {
          e.preventDefault();
          handleGrade(1);
        } else if (e.key === '2') {
          e.preventDefault();
          handleGrade(2);
        } else if (e.key === '3') {
          e.preventDefault();
          handleGrade(3);
        } else if (e.key === '4') {
          e.preventDefault();
          handleGrade(4);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, isSessionStarted, isSessionCompleted, currentCard, isCardFlipped, handleFlip, handleGrade]);

  // --------------------------------------------------------------------------
  // Deck Explorer & Metrics State (Search & Filters)
  // --------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<'phrase' | 'interval' | 'dueDate' | 'category'>('phrase');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();

    return cards
      .filter((card) => {
        if (query) {
          const matchPhrase = card.phrase.toLowerCase().includes(query);
          const matchMeaning = card.meaning_en.toLowerCase().includes(query);
          const matchExample = card.example_sentence.toLowerCase().includes(query);
          if (!matchPhrase && !matchMeaning && !matchExample) return false;
        }

        if (categoryFilter !== 'all' && card.category !== categoryFilter) {
          return false;
        }

        if (statusFilter === 'due' && !isCardDue(card, now)) return false;
        if (statusFilter === 'new' && !isCardNew(card)) return false;
        if (statusFilter === 'mastered' && !isCardMastered(card)) return false;
        if (statusFilter === 'learning' && (isCardNew(card) || isCardMastered(card))) return false;

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'phrase') {
          comparison = a.phrase.localeCompare(b.phrase);
        } else if (sortBy === 'interval') {
          comparison = a.interval - b.interval;
        } else if (sortBy === 'dueDate') {
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } else if (sortBy === 'category') {
          comparison = a.category.localeCompare(b.category);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [cards, searchQuery, categoryFilter, statusFilter, sortBy, sortOrder]);

  const dueTodayCount = useMemo(() => {
    return stats?.dueTodayCount ?? cards.filter((c) => isCardDue(c)).length;
  }, [stats, cards]);

  const maturity = useMemo(() => {
    const total = cards.length;
    if (total === 0) {
      return { learning: 0, young: 0, mature: 0, learningPct: 0, youngPct: 0, maturePct: 0 };
    }
    const mature = cards.filter((c) => isCardMastered(c)).length;
    const learning = cards.filter((c) => isCardNew(c) || c.interval === 0).length;
    const young = Math.max(0, total - mature - learning);
    return {
      learning,
      young,
      mature,
      learningPct: Math.round((learning / total) * 100),
      youngPct: Math.round((young / total) * 100),
      maturePct: Math.round((mature / total) * 100),
    };
  }, [cards]);

  const avgEaseFactor = useMemo(() => {
    if (cards.length === 0) return 2.5;
    const sum = cards.reduce((acc, c) => acc + c.easeFactor, 0);
    return +(sum / cards.length).toFixed(2);
  }, [cards]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Top Header & Context Bar - Unified across both tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-xs shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Flashcard Recall
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                SRS SM-2
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active recall drills on idiomatic expressions for Standups, Post-Mortems, and System Reviews.
            </p>
          </div>
        </div>

        {/* Sub-tab switcher & Batch Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleViewChange('execution')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'execution'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Feature Execution ({dueTodayCount > 0 ? `${dueTodayCount} due` : `${cards.length}`})</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'analytics'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Metrics and Radar</span>
            </button>
          </div>

          {activeView === 'analytics' && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <button
                type="button"
                onClick={onOpenImportExport}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Sync / Backup</span>
              </button>

              <button
                type="button"
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Phrase</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================== */}
      {/* TAB 1: FEATURE EXECUTION (Live Flashcard Exercise Section)             */}
      {/* ====================================================================== */}
      {activeView === 'execution' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Exercise Controls Bar: Category Selector & Mode Toggle */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Category Selector Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 mr-1">Category:</span>
              <button
                type="button"
                onClick={() => resetExerciseSession('All', exerciseMode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  exerciseCategory === 'All'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Deck
              </button>
              {ALL_CATEGORIES.map((cat) => {
                const catDue = cards.filter((c) => c.category === cat && isCardDue(c)).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => resetExerciseSession(cat, exerciseMode)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                      exerciseCategory === cat
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{cat}</span>
                    {catDue > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          exerciseCategory === cat
                            ? 'bg-white text-indigo-600'
                            : 'bg-rose-500/20 text-rose-500 dark:text-rose-400'
                        }`}
                      >
                        {catDue}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mode Toggle (Due vs All) & Timer */}
            <div className="flex items-center gap-3">
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => resetExerciseSession(exerciseCategory, 'due')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    exerciseMode === 'due'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Due Only ({dueTodayCount})
                </button>
                <button
                  type="button"
                  onClick={() => resetExerciseSession(exerciseCategory, 'all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    exerciseMode === 'all'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  All Cards ({cards.length})
                </button>
              </div>

              {/* Timer Pill */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>{timer.formattedTime}</span>
                <button
                  type="button"
                  onClick={
                    !isSessionStarted
                      ? handleStartSession
                      : timer.isActive
                      ? timer.pause
                      : timer.start
                  }
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  title={!isSessionStarted ? 'Start' : timer.isActive ? 'Pause' : 'Resume'}
                >
                  {timer.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Exercise Content Box */}
          {isSessionCompleted ? (
            /* Session Completed Screen */
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-xl animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-md">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Recall Session Completed!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  You completed {sessionStats.totalReviewed} card reviews. Retention accuracy:{' '}
                  <strong className="text-emerald-500 font-mono">
                    {sessionStats.totalReviewed > 0
                      ? Math.round(
                          ((sessionStats.gradeCounts[3] + sessionStats.gradeCounts[4]) /
                            sessionStats.totalReviewed) *
                            100
                        )
                      : 100}
                    %
                  </strong>
                </p>
              </div>

              {/* Quick Results Summary */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                  <div className="font-bold text-base font-mono">{sessionStats.gradeCounts[1]}</div>
                  <div className="text-[10px]">Again</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <div className="font-bold text-base font-mono">{sessionStats.gradeCounts[2]}</div>
                  <div className="text-[10px]">Hard</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <div className="font-bold text-base font-mono">{sessionStats.gradeCounts[3]}</div>
                  <div className="text-[10px]">Good</div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <div className="font-bold text-base font-mono">{sessionStats.gradeCounts[4]}</div>
                  <div className="text-[10px]">Easy</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => resetExerciseSession(exerciseCategory, exerciseMode)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                >
                  Practice Again
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('analytics')}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>View Metrics and Radar</span>
                </button>
              </div>
            </div>
          ) : queue.length === 0 ? (
            /* Empty Queue State */
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-5 shadow-xs animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  All Caught Up!
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {exerciseMode === 'due'
                    ? `No cards are due right now in ${exerciseCategory === 'All' ? 'the entire deck' : exerciseCategory}. Spaced repetition intervals have scheduled your next reviews.`
                    : `No cards found in ${exerciseCategory}.`}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => resetExerciseSession(exerciseCategory, 'all')}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Review Ahead ({cards.length} Cards)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('analytics')}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Inspect Radar & Metrics</span>
                </button>
              </div>
            </div>
          ) : !isSessionStarted ? (
            /* Session Start Trigger Screen */
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-sm animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20 shadow-sm">
                <Brain className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Flashcard Recall Session
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Active recall drills powered by the SM-2 spaced repetition algorithm. Take your time to review your settings before starting the timer.
                </p>
              </div>

              {/* Session Summary Cards */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Queue Size</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {queue.length}
                  </div>
                  <span className="text-[10px] text-slate-400">cards</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Category</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={exerciseCategory === 'All' ? 'All Deck' : exerciseCategory}>
                    {exerciseCategory === 'All' ? 'All Deck' : exerciseCategory}
                  </div>
                  <span className="text-[10px] text-slate-400">{exerciseMode === 'due' ? 'Due reviews' : 'All cards'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Duration</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                    {settings.sessionDurationMinutes || 20}:00
                  </div>
                  <span className="text-[10px] text-slate-400">timer</span>
                </div>
              </div>

              {/* Primary Start Trigger */}
              <div className="pt-2 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartSession}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all cursor-pointer flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Exercise</span>
                </button>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">Space</kbd> to flip &bull; <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono">1-4</kbd> to rate recall
                </span>
              </div>
            </div>
          ) : (
            /* Active Interactive Flashcard Drill */
            <div className="space-y-4">
              {/* Card Queue Header */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Card {currentIndex + 1} of {queue.length}
                  </span>
                  <span>&bull;</span>
                  <span className="text-[11px]">Space to flip &bull; 1-4 to grade</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium">
                    {Math.round((currentIndex / queue.length) * 100)}% Complete
                  </span>
                  <div className="w-28 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${(currentIndex / queue.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* The Live Interactive Flashcard */}
              {currentCard && (
                <Flashcard
                  key={currentCard.id}
                  card={currentCard}
                  isFlipped={isCardFlipped}
                  onFlip={handleFlip}
                  onGrade={handleGrade}
                  settings={settings}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        /* ====================================================================== */
        /* TAB 2: METRICS AND RADAR SECTION                                       */
        /* ====================================================================== */
        <div className="space-y-6 animate-fade-in">
          {/* Top SM-2 Retention Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Total Cards</span>
                <Layers className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {cards.length}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Engineering phrases in deck
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Due For Review</span>
                <Clock className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                {dueTodayCount}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Scheduled by SM-2 for today
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Mastered (Long-term)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {stats?.masteredCardsCount ?? cards.filter((c) => isCardMastered(c)).length}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Interval &ge; 21 days
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Learning & In Review</span>
                <Brain className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {stats?.learningCardsCount ?? cards.filter((c) => !isCardNew(c) && !isCardMastered(c)).length}
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Active recall phase
              </p>
            </div>
          </div>

          {/* Grid: 2 Modular Widgets - Radar & SRS Maturity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Widget 1: Meeting Context Radar Chart */}
            <FlashcardRadarChart
              cards={cards}
              onSelectCategory={(cat) => {
                resetExerciseSession(cat, 'due');
                handleViewChange('execution');
              }}
            />

            {/* Widget 2: SRS Health & Card Maturity */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      SRS Health & Card Maturity
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Total: {cards.length} Cards
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  SuperMemo SM-2 retention tier distribution based on recall intervals
                </p>

                {/* Stacked Progress Bar */}
                <div className="mt-5 space-y-2">
                  <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden p-0.5">
                    {maturity.learningPct > 0 && (
                      <div
                        style={{ width: `${maturity.learningPct}%` }}
                        className="h-full bg-rose-500 rounded-l-full"
                        title={`Learning/Lapse: ${maturity.learning} (${maturity.learningPct}%)`}
                      />
                    )}
                    {maturity.youngPct > 0 && (
                      <div
                        style={{ width: `${maturity.youngPct}%` }}
                        className="h-full bg-amber-500"
                        title={`Young: ${maturity.young} (${maturity.youngPct}%)`}
                      />
                    )}
                    {maturity.maturePct > 0 && (
                      <div
                        style={{ width: `${maturity.maturePct}%` }}
                        className="h-full bg-emerald-500 rounded-r-full"
                        title={`Mature: ${maturity.mature} (${maturity.maturePct}%)`}
                      />
                    )}
                  </div>

                  {/* Legend with counts */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>Learning</span>
                      </div>
                      <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
                        {maturity.learning} ({maturity.learningPct}%)
                      </div>
                      <span className="text-[10px] text-slate-400">interval = 0d</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Young</span>
                      </div>
                      <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
                        {maturity.young} ({maturity.youngPct}%)
                      </div>
                      <span className="text-[10px] text-slate-400">1d &le; interval &lt; 21d</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Mature</span>
                      </div>
                      <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white">
                        {maturity.mature} ({maturity.maturePct}%)
                      </div>
                      <span className="text-[10px] text-slate-400">interval &ge; 21d</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Ease Factor & Retention Meta */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Average Ease Factor (EF):{' '}
                  <strong className="font-mono text-slate-900 dark:text-white">{avgEaseFactor}</strong>
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                  {maturity.maturePct >= 60 ? 'Optimal Long-term Retention' : 'Building Baseline Retention'}
                </span>
              </div>
            </div>
          </div>

          {/* Meeting Context Mastery Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  <span>Meeting Context Mastery Breakdown</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed progress and review backlog categorized by technical scenarios.
                </p>
              </div>
              <button
                onClick={() => {
                  resetExerciseSession('All', 'due');
                  handleViewChange('execution');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Practice All Due ({dueTodayCount})</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_CATEGORIES.map((category) => {
                const style = CATEGORY_STYLES[category];
                const catCards = cards.filter((c) => c.category === category);
                const total = catCards.length;
                const mastered = catCards.filter((c) => isCardMastered(c)).length;
                const due = catCards.filter((c) => isCardDue(c)).length;
                const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;

                return (
                  <div
                    key={category}
                    className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all ${style.cardGlow}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder}`}
                        >
                          {category}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                          {style.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-600 dark:text-slate-400">Mastery Progress</span>
                        <span className="font-mono text-slate-900 dark:text-white font-bold">{percent}%</span>
                      </div>

                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: style.accentColor,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                        <span>
                          {mastered} of {total} mastered
                        </span>
                        {due > 0 ? (
                          <span className="text-rose-500 font-semibold">{due} due today</span>
                        ) : (
                          <span className="text-emerald-500 font-medium">All caught up</span>
                        )}
                      </div>
                    </div>

                    {/* Category Quick Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {due > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            resetExerciseSession(category, 'due');
                            handleViewChange('execution');
                          }}
                          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Practice ({due})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilter(category);
                          const el = document.getElementById('deck-phrase-explorer');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                      >
                        Filter Below
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cards Explorer Toolbar & Table in Metrics Tab */}
          <div id="deck-phrase-explorer" className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-500" />
                  <span>Deck Phrase Explorer ({filteredCards.length} Cards)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Search, filter, edit, or reset individual spaced repetition phrases.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenImportExport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Sync / Backup</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Phrase</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search phrases, meanings, or sentences..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Sort By Selector */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="phrase">Phrase (A-Z)</option>
                    <option value="interval">Interval (Retention)</option>
                    <option value="dueDate">Due Date</option>
                    <option value="category">Category</option>
                  </select>

                  <button
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    title="Toggle sort direction"
                  >
                    {sortOrder.toUpperCase()}
                  </button>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All Categories ({cards.length})
                </button>
                {ALL_CATEGORIES.map((cat) => {
                  const count = cards.filter((c) => c.category === cat).length;
                  const isSelected = categoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="font-semibold text-slate-400 self-center">Status:</span>
                {(['all', 'due', 'learning', 'mastered', 'new'] as StatusFilter[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-0.5 rounded-full capitalize font-medium transition-all cursor-pointer ${
                      statusFilter === status
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Cards List Grid */}
            {filteredCards.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
                <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No matching phrases found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Try adjusting your search query, category filter, or status filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCards.map((card) => {
                  const catStyle = CATEGORY_STYLES[card.category];
                  const isDue = isCardDue(card);
                  const isMastered = isCardMastered(card);
                  const isNew = isCardNew(card);

                  return (
                    <div
                      key={card.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                    >
                      {/* Top Row: Category & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catStyle.badgeBg} ${catStyle.badgeText} ${catStyle.badgeBorder}`}
                        >
                          {card.category}
                        </span>

                        <div className="flex items-center gap-1.5 text-[11px] font-mono">
                          {isMastered ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Mastered ({formatInterval(card.interval)})
                            </span>
                          ) : isDue ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Due Now
                            </span>
                          ) : isNew ? (
                            <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              New Card
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Learning ({formatInterval(card.interval)})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Phrase & Audio */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                            "{card.phrase}"
                          </h3>
                          <AudioButton
                            text={card.phrase}
                            textId={`list-${card.id}`}
                            settings={settings}
                            size="sm"
                            variant="ghost"
                          />
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {card.meaning_en}
                        </p>
                      </div>

                      {/* Example sentence */}
                      <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs italic text-slate-700 dark:text-slate-400">
                        "{card.example_sentence}"
                      </div>

                      {/* Bottom Row: SRS Meta & Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-mono">
                        <div>
                          EF: {card.easeFactor.toFixed(2)} • Reps: {card.repetition}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onResetCardProgress(card.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Reset progress"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenEditModal(card)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit phrase"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Delete phrase "${card.phrase}"?`)) {
                                onDeleteCard(card.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
