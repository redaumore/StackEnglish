import { useState } from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Flame,
  ArrowRight,
  Plus,
  Play,
  Zap,
} from 'lucide-react';
import type { Category, DeckStats, UserSettings } from '../types/srs';
import { ALL_CATEGORIES, CATEGORY_STYLES } from '../utils/categoryColors';

interface DashboardProps {
  stats: DeckStats;
  settings: UserSettings;
  onStartStudy: (category?: Category | 'All') => void;
  onOpenAddCard: () => void;
  onOpenCardList: () => void;
  onOpenSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  settings,
  onStartStudy,
  onOpenAddCard,
  onOpenCardList,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');

  const totalSessionCards =
    selectedCategory === 'All'
      ? stats.dueTodayCount + Math.min(stats.newCardsAvailableCount, settings.newCardsPerDay)
      : (stats.categoryBreakdown[selectedCategory]?.due || 0) +
        Math.min(
          stats.categoryBreakdown[selectedCategory]?.total -
            (stats.categoryBreakdown[selectedCategory]?.mastered || 0),
          settings.newCardsPerDay
        );

  const estimatedMinutes = Math.max(5, Math.ceil(totalSessionCards * 1.2));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-mono font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Spaced Repetition Engine • SM-2</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Software Engineering English
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-2xl text-sm sm:text-base">
            Master high-impact idiomatic phrases for Kick-offs, Standups, Scope Pushback, System Design reviews, and Blameless Post-Mortems.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddCard}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-indigo-500" />
            <span>Add Custom Phrase</span>
          </button>

          <button
            onClick={() => onStartStudy(selectedCategory)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Session</span>
          </button>
        </div>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Due Today */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Due For Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {stats.dueTodayCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">cards</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            Scheduled by SM-2 algorithm
          </p>
        </div>

        {/* Metric 2: New Available */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              New In Deck
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {stats.newCardsAvailableCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({settings.newCardsPerDay} / day limit)
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Unstudied professional phrases
          </p>
        </div>

        {/* Metric 3: Mastered */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mastered Phrases
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.masteredCardsCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              / {stats.totalCards} total
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Interval &ge; 21 days (Long-term retention)
          </p>
        </div>

        {/* Metric 4: Streak */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daily Streak
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-600 dark:text-amber-400">
              {stats.streakDays}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {stats.streakDays === 1 ? 'day' : 'consecutive days'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {stats.todayReviewedCount > 0
              ? `Completed ${stats.todayReviewedCount} reviews today!`
              : 'Study today to maintain streak'}
          </p>
        </div>
      </div>

      {/* Session Quick Launch Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-900/90 via-slate-900 to-slate-950 border border-indigo-500/30 p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Recommended 20-minute daily session limit</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Ready for your daily retention sprint?
            </h2>

            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              You have <span className="font-semibold text-indigo-300">{stats.dueTodayCount} due reviews</span> and up to{' '}
              <span className="font-semibold text-indigo-300">{Math.min(stats.newCardsAvailableCount, settings.newCardsPerDay)} new phrases</span> queued today. Focus mode with built-in voice playback and keyboard navigation.
            </p>

            {/* Category Filter Pills */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Filter by meeting context:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedCategory === 'All'
                      ? 'bg-white text-slate-950 font-bold shadow'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  All Categories ({stats.totalCards})
                </button>
                {ALL_CATEGORIES.map((cat) => {
                  const catStat = stats.categoryBreakdown[cat];
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white text-slate-950 font-bold shadow'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {cat} ({catStat ? catStat.total : 0})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Session CTA Card */}
          <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-lg">
            <div className="space-y-1">
              <div className="text-xs uppercase font-mono text-slate-400 font-medium">Session Estimate</div>
              <div className="text-3xl font-extrabold text-white font-mono">
                ~{estimatedMinutes} min
              </div>
              <div className="text-xs text-slate-400">
                {totalSessionCards} cards in this study batch
              </div>
            </div>

            <button
              onClick={() => onStartStudy(selectedCategory)}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Daily Study</span>
            </button>

            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <span>Shortcuts:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">
                Space
              </kbd>
              <span>to flip</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">
                1-4
              </kbd>
              <span>to grade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Meeting Context Mastery Breakdown
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Track retention and review load across all technical interaction scenarios.
            </p>
          </div>
          <button
            onClick={onOpenCardList}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Explore Deck</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_CATEGORIES.map((category) => {
            const style = CATEGORY_STYLES[category];
            const catStat = stats.categoryBreakdown[category] || { total: 0, mastered: 0, due: 0 };
            const percent = catStat.total > 0 ? Math.round((catStat.mastered / catStat.total) * 100) : 0;

            return (
              <div
                key={category}
                className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-xs ${style.cardGlow}`}
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
                    <span className="font-mono text-slate-900 dark:text-white">{percent}%</span>
                  </div>

                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: style.accentColor,
                      }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>
                      {catStat.mastered} of {catStat.total} mastered
                    </span>
                    {catStat.due > 0 ? (
                      <span className="text-rose-500 font-semibold">{catStat.due} due today</span>
                    ) : (
                      <span className="text-emerald-500 font-medium">All caught up</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
