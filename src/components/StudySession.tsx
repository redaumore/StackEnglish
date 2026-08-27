import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Clock,
  Play,
  Pause,
  ArrowLeft,
  Award,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import type { Category, Grade, SRSCard, UserSettings } from '../types/srs';
import { useTimer } from '../hooks/useTimer';
import { Flashcard } from './Flashcard';

interface StudySessionProps {
  sessionCards: SRSCard[];
  settings: UserSettings;
  selectedCategory: Category | 'All';
  onGradeCard: (cardId: string, grade: Grade) => void;
  onFinishSession: () => void;
  onExitToDashboard: () => void;
}

interface SessionStats {
  totalReviewed: number;
  gradeCounts: Record<Grade, number>;
  cardsStudied: Array<{ card: SRSCard; grade: Grade }>;
}

export const StudySession = ({
  sessionCards,
  settings,
  selectedCategory,
  onGradeCard,
  onFinishSession,
  onExitToDashboard,
}: StudySessionProps) => {
  const [queue, setQueue] = useState<SRSCard[]>(sessionCards);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalReviewed: 0,
    gradeCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
    cardsStudied: [],
  });

  const timer = useTimer(settings.sessionDurationMinutes || 20);
  const timerStartRef = useRef(timer.start);
  const timerPauseRef = useRef(timer.pause);

  useEffect(() => {
    const start = timerStartRef.current;
    const pause = timerPauseRef.current;
    start();
    return () => pause();
  }, []);


  const currentCard = queue[currentIndex];

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleGrade = useCallback(
    (grade: Grade) => {
      if (!currentCard) return;

      onGradeCard(currentCard.id, grade);

      setSessionStats((prev) => ({
        totalReviewed: prev.totalReviewed + 1,
        gradeCounts: {
          ...prev.gradeCounts,
          [grade]: prev.gradeCounts[grade] + 1,
        },
        cardsStudied: [...prev.cardsStudied, { card: currentCard, grade }],
      }));

      if (grade === 1) {
        setQueue((prev) => [...prev, currentCard]);
      }

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        setIsCompleted(true);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped) {
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
  }, [handleFlip, handleGrade, isFlipped]);

  if (queue.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            All Caught Up!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm">
            No cards are due for review right now in {selectedCategory === 'All' ? 'the entire deck' : selectedCategory}. Great job staying on top of your spaced repetition schedule.
          </p>
        </div>
        <button
          onClick={onExitToDashboard}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-500 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    );
  }

  if (isCompleted) {
    const accuracy =
      sessionStats.totalReviewed > 0
        ? Math.round(
            ((sessionStats.gradeCounts[3] + sessionStats.gradeCounts[4]) /
              sessionStats.totalReviewed) *
              100
          )
        : 0;

    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 mx-auto shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-amber-400">
              <Award className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Daily Session Completed!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto">
            You practiced <span className="font-semibold text-indigo-500">{sessionStats.totalReviewed} reviews</span> today with a retention accuracy of {accuracy}%.
          </p>
        </div>

        {/* Results Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs uppercase text-slate-400 font-mono">Reviewed</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {sessionStats.totalReviewed}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs uppercase text-emerald-500 font-mono">Retention</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {accuracy}%
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs uppercase text-slate-400 font-mono">Session Time</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
              {timer.formattedTime}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
            <div className="text-xs uppercase text-amber-500 font-mono">Streak Status</div>
            <div className="text-2xl font-bold text-amber-500 mt-1 flex items-center justify-center gap-1">
              <Flame className="w-5 h-5 fill-amber-500" />
              <span>Active</span>
            </div>
          </div>
        </div>

        {/* Breakdown by Grade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Rating Breakdown
          </h3>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <div className="font-bold text-lg">{sessionStats.gradeCounts[1]}</div>
              <div>Again (Fail)</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <div className="font-bold text-lg">{sessionStats.gradeCounts[2]}</div>
              <div>Hard</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <div className="font-bold text-lg">{sessionStats.gradeCounts[3]}</div>
              <div>Good</div>
            </div>
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400">
              <div className="font-bold text-lg">{sessionStats.gradeCounts[4]}</div>
              <div>Easy</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={onExitToDashboard}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-all cursor-pointer"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => {
              onFinishSession();
              onExitToDashboard();
            }}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            Complete Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Session Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitToDashboard}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Pause & Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {selectedCategory === 'All' ? 'Full Deck Session' : selectedCategory}
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              Card {currentIndex + 1} of {queue.length}
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-xs hidden md:block">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(((currentIndex) / queue.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex) / queue.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all ${
              timer.isWarning
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timer.formattedTime}</span>
          </div>

          <button
            onClick={timer.isActive ? timer.pause : timer.start}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={timer.isActive ? 'Pause Timer' : 'Resume Timer'}
          >
            {timer.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => timer.addTime(5)}
            className="px-2 py-1 rounded-lg text-[11px] font-mono bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Extend session by 5 minutes"
          >
            +5m
          </button>
        </div>
      </div>

      {timer.hasFinished && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-700 dark:text-amber-300 flex items-center justify-between text-xs sm:text-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>20-Minute Study Cap Reached!</strong> Spaced repetition studies recommend resting now to maximize cognitive consolidation.
            </span>
          </div>
          <button
            onClick={() => timer.addTime(5)}
            className="shrink-0 ml-3 underline font-semibold cursor-pointer"
          >
            Add 5m
          </button>
        </div>
      )}

      {currentCard && (
        <Flashcard
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
          onGrade={handleGrade}
          settings={settings}
        />
      )}
    </div>
  );
};
