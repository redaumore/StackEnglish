import React from 'react';
import {
  Sparkles,
  Flame,
  ArrowRight,
  Plus,
  Play,
  Zap,
  MessageSquareQuote,
  Brain,
  Mic,
  Activity,
  TrendingUp,
} from 'lucide-react';
import type { Category, DeckStats, UserSettings } from '../types/srs';
import type { EvaluationResult } from '../types/techCard';
import type { ScriptProgressMap } from '../types/script';

interface DashboardProps {
  stats: DeckStats;
  settings: UserSettings;
  onStartStudy: (category?: Category | 'All', mode?: 'standard' | 'reviewed_only' | 'all') => void;
  onOpenAddCard: () => void;
  onOpenCardList: (view?: 'execution' | 'analytics') => void;
  onOpenSettings: () => void;
  onOpenScripts?: () => void;
  onOpenParaphrase?: () => void;
  paraphraseDueCount?: number;
  paraphraseTotalCount?: number;
  paraphraseHistory?: EvaluationResult[];
  scriptsCount?: number;
  scriptsProgressMap?: ScriptProgressMap;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  settings,
  onStartStudy,
  onOpenAddCard,
  onOpenCardList,
  onOpenScripts,
  onOpenParaphrase,
  paraphraseDueCount = 0,
  paraphraseTotalCount = 0,
  paraphraseHistory = [],
  scriptsCount = 0,
  scriptsProgressMap = {},
}) => {
  // 1. Metric: Flashcard Retention Rate & Mastery %
  const totalReviewed = stats.masteredCardsCount + stats.learningCardsCount;
  const retentionPercent =
    stats.totalCards > 0 ? Math.round((stats.masteredCardsCount / stats.totalCards) * 100) : 0;

  // 2. Metric: Oral Paraphrase Score
  const hasParaphraseHistory = paraphraseHistory.length > 0;
  const avgParaphraseScore = hasParaphraseHistory
    ? (
        paraphraseHistory.reduce((acc, curr) => acc + curr.scores.overallScore, 0) /
        paraphraseHistory.length
      ).toFixed(1)
    : null;
  const semanticEquivAvg = hasParaphraseHistory
    ? Math.round(
        (paraphraseHistory.reduce((acc, curr) => acc + curr.scores.semanticEquivalence, 0) /
          paraphraseHistory.length /
          5) *
          100
      )
    : null;

  // 3. Metric: Speaking / Pronunciation Score from scripts
  const scriptProgressEntries = Object.values(scriptsProgressMap);
  const totalEvaluatedLines = scriptProgressEntries.reduce(
    (acc, prog) => acc + Object.keys(prog.evaluations || {}).length,
    0
  );
  let totalPronunciationScore = 0;
  let pronunciationCount = 0;
  scriptProgressEntries.forEach((prog) => {
    Object.values(prog.evaluations || {}).forEach((ev) => {
      if (typeof ev.score === 'number') {
        totalPronunciationScore += ev.score;
        pronunciationCount++;
      }
    });
  });
  const avgPronunciationScore =
    pronunciationCount > 0 ? Math.round(totalPronunciationScore / pronunciationCount) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-mono font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Executive Performance Hub</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Daily Practice & Overview
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-2xl text-sm sm:text-base">
            High-impact deliberate practice across technical vocabulary, oral paraphrase, and engineering speech.
          </p>
        </div>

        {/* Global Streak & Action Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 text-sm font-semibold shadow-xs">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>
              {stats.streakDays} {stats.streakDays === 1 ? 'Day' : 'Days'} Streak
            </span>
          </div>

          <button
            onClick={onOpenAddCard}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-indigo-500" />
            <span>Add Card</span>
          </button>
        </div>
      </div>

      {/* 3 Core Synthetic Metrics (Retención, Parafraseo, Pronunciación) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Retention & Flashcards */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-all hover:shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-indigo-500" />
              SM-2 Retention
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {stats.masteredCardsCount}/{stats.totalCards} Mastered
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {retentionPercent}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">mastery rate</span>
          </div>

          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${retentionPercent}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>{totalReviewed} phrases in review</span>
            <button
              onClick={() => onOpenCardList()}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Deck Detail <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 2: Oral Paraphrase */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-all hover:shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-violet-500" />
              Oral Paraphrase
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
              {paraphraseHistory.length} Sessions
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {avgParaphraseScore ? `${avgParaphraseScore}/5` : '—'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {avgParaphraseScore ? 'avg performance' : 'No evaluations yet'}
            </span>
          </div>

          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-violet-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${semanticEquivAvg ?? (avgParaphraseScore ? (parseFloat(avgParaphraseScore) / 5) * 100 : 0)}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>
              {semanticEquivAvg ? `${semanticEquivAvg}% semantic match` : `${paraphraseTotalCount} tech concepts`}
            </span>
            {onOpenParaphrase && (
              <button
                onClick={onOpenParaphrase}
                className="text-violet-600 dark:text-violet-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Paraphrase Detail <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Metric 3: Pronunciation & Fluency */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-all hover:shadow-md group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              Pronunciation & Flow
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {totalEvaluatedLines} Lines Spoken
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {avgPronunciationScore !== null ? `${avgPronunciationScore}%` : '—'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {avgPronunciationScore !== null ? 'fluency index' : 'Pending assessment'}
            </span>
          </div>

          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${avgPronunciationScore ?? 0}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>{scriptsCount} engineering scripts</span>
            {onOpenScripts && (
              <button
                onClick={onOpenScripts}
                className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Scripts Detail <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Practice Modules (Interactive Exercise Action Center) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <span>Practice Hub</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Select an exercise module to begin your daily deliberate session
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Module 1: Flashcards */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Brain className="w-5 h-5" />
                </div>
                {stats.dueTodayCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 animate-pulse">
                    {stats.dueTodayCount} Due Today
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                    Up to date
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Flashcard Recall (SM-2)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Active recall drills on idiomatic idioms for Standups, Post-Mortems, and System Reviews.
                </p>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Due Reviews</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {stats.dueTodayCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Daily Limit</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {settings.newCardsPerDay} new
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <button
                onClick={() => onStartStudy('All', 'standard')}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Review Session</span>
              </button>
              <button
                onClick={() => onOpenCardList('analytics')}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Metrics & Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Module 2: Oral Paraphrase */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs hover:border-violet-300 dark:hover:border-violet-800 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  <Mic className="w-5 h-5" />
                </div>
                {paraphraseDueCount > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 animate-pulse">
                    {paraphraseDueCount} Due Now
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Ready to practice
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Oral Paraphrase (Voice AI)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Express technical concepts with forbidden-word constraints to build rapid spontaneous phrasing.
                </p>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Due Queue</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {paraphraseDueCount}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Deck Size</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {paraphraseTotalCount} cards
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <button
                onClick={onOpenParaphrase}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Practice Paraphrase</span>
              </button>
              <button
                onClick={onOpenParaphrase}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Metrics & Radar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Module 3: Speaking Scripts */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <MessageSquareQuote className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                  {scriptsCount} Scripts
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Speaking Scripts & Scenarios
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Full dialogue rehearsals for 1-on-1s, client demos, cross-team syncs, and executive updates.
                </p>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Practiced Lines</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {totalEvaluatedLines}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Avg Score</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {avgPronunciationScore !== null ? `${avgPronunciationScore}%` : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <button
                onClick={onOpenScripts}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Dialogues</span>
              </button>
              <button
                onClick={onOpenScripts}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Explore Scenarios</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
