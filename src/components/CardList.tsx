import { useState, useMemo } from 'react';
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
  Brain,
  TrendingUp,
} from 'lucide-react';
import type { Category, DeckStats, SRSCard, UserSettings } from '../types/srs';
import { ALL_CATEGORIES, CATEGORY_STYLES } from '../utils/categoryColors';
import { formatInterval, isCardDue, isCardMastered, isCardNew } from '../utils/sm2';
import { AudioButton } from './AudioButton';

interface CardListProps {
  cards: SRSCard[];
  stats?: DeckStats;
  settings: UserSettings;
  onStartStudy?: (category?: Category | 'All', mode?: 'standard' | 'reviewed_only' | 'all') => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (card: SRSCard) => void;
  onDeleteCard: (cardId: string) => void;
  onResetCardProgress: (cardId: string) => void;
  onOpenImportExport: () => void;
}

type StatusFilter = 'all' | 'due' | 'learning' | 'mastered' | 'new';
type ViewMode = 'cards' | 'analytics';

export const CardList: React.FC<CardListProps> = ({
  cards,
  stats,
  settings,
  onStartStudy,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteCard,
  onResetCardProgress,
  onOpenImportExport,
}) => {
  const [activeView, setActiveView] = useState<ViewMode>('cards');
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Deck Library & Phrases
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse, search, edit, and manage all {cards.length} spaced repetition cards.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveView('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cards ({cards.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeView === 'analytics'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Metrics & Breakdown</span>
            </button>
          </div>

          <button
            onClick={onOpenImportExport}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Sync / Backup</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Phrase</span>
          </button>
        </div>
      </div>

      {activeView === 'analytics' ? (
        /* Detailed Metrics & Category Breakdown View */
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
                {stats?.dueTodayCount ?? cards.filter((c) => isCardDue(c)).length}
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
              {onStartStudy && (
                <button
                  onClick={() => onStartStudy('All', 'standard')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Study All Due</span>
                </button>
              )}
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
                      {onStartStudy && due > 0 && (
                        <button
                          type="button"
                          onClick={() => onStartStudy(category, 'standard')}
                          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Study Category ({due})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilter(category);
                          setActiveView('cards');
                        }}
                        className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                      >
                        Filter Cards
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Cards Explorer View */
        <>
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
        </>
      )}

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
  );
};
