
import {
  Flame,
  Layers,
  Sparkles,
  Settings as SettingsIcon,
  Sun,
  Moon,
  MessageSquareQuote,
  Mic,
} from 'lucide-react';
import type { UserSettings } from '../types/srs';

export type NavTab = 'dashboard' | 'study' | 'cards' | 'scripts' | 'paraphrase' | 'settings';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  streakDays: number;
  dueCount: number;
  paraphraseDueCount?: number;
  settings: UserSettings;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  streakDays,
  dueCount,
  paraphraseDueCount = 0,
  settings,
  onToggleTheme,
}) => {
  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none shrink-0"
          >
            <img
              src="/icon.png"
              alt="StackEnglish"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-lg sm:rounded-xl drop-shadow-md group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">
                  Stack<span className="text-indigo-600 dark:text-indigo-400">English</span>
                </span>
                <span className="px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono font-medium rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Mastering the Developer's Language Stack
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('study')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer relative ${
                currentTab === 'study'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Study</span>
              {dueCount > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    currentTab === 'study'
                      ? 'bg-white text-indigo-600'
                      : 'bg-indigo-600 text-white animate-pulse'
                  }`}
                >
                  {dueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('paraphrase')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer relative ${
                currentTab === 'paraphrase'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span className="hidden lg:inline">Oral </span>
              <span>Paraphrase</span>
              {paraphraseDueCount > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    currentTab === 'paraphrase'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-violet-600 text-white animate-pulse'
                  }`}
                >
                  {paraphraseDueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('scripts')}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'scripts'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <MessageSquareQuote className="w-4 h-4" />
              <span className="hidden lg:inline">Speaking </span>
              <span>Scripts</span>
            </button>
          </nav>

          {/* Right Tools: Streak, Theme Toggle, Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <div
              title={`${streakDays} days consecutive study streak!`}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] sm:text-xs font-semibold"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span>
                {streakDays}d<span className="hidden sm:inline"> streak</span>
              </span>
            </div>

            <button
              onClick={onToggleTheme}
              aria-label="Toggle dark/light theme"
              className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              {settings.theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => onSelectTab('settings')}
              aria-label="Settings"
              className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (< md) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/80 px-2 py-1.5 flex items-center justify-around transition-colors pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      >
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Dashboard</span>
        </button>

        <button
          onClick={() => onSelectTab('study')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all cursor-pointer relative ${
            currentTab === 'study'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5 mb-0.5" />
            {dueCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full text-[9px] font-bold bg-indigo-600 text-white animate-pulse">
                {dueCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Study</span>
        </button>

        <button
          onClick={() => onSelectTab('paraphrase')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all cursor-pointer relative ${
            currentTab === 'paraphrase'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Mic className="w-5 h-5 mb-0.5" />
            {paraphraseDueCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center rounded-full text-[9px] font-bold bg-violet-600 text-white animate-pulse">
                {paraphraseDueCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Paraphrase</span>
        </button>

        <button
          onClick={() => onSelectTab('scripts')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-all cursor-pointer ${
            currentTab === 'scripts'
              ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquareQuote className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Scripts</span>
        </button>
      </nav>
    </>
  );
};
