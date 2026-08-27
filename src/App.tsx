import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import type { NavTab } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { StudySession } from './components/StudySession';
import { CardList } from './components/CardList';
import { CardModal } from './components/CardModal';
import { ImportExportModal } from './components/ImportExportModal';
import { SettingsModal } from './components/SettingsModal';
import { useSRS } from './hooks/useSRS';
import type { Category, SRSCard } from './types/srs';

export function App() {
  const {
    cards,
    settings,
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
  } = useSRS();

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [studyCategory, setStudyCategory] = useState<Category | 'All'>('All');
  const [studySessionBatch, setStudySessionBatch] = useState<SRSCard[]>([]);

  // Modals
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<SRSCard | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync theme with root HTML class
  useEffect(() => {
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Launch study session
  const handleStartStudy = (category: Category | 'All' = 'All') => {
    setStudyCategory(category);
    const batch = getSessionCards(category);
    setStudySessionBatch(batch);
    setCurrentTab('study');
  };

  const handleToggleTheme = () => {
    updateSettings({
      theme: settings.theme === 'dark' ? 'light' : 'dark',
    });
  };

  const handleSaveCard = (cardData: {
    phrase: string;
    category: Category;
    meaning_en: string;
    example_sentence: string;
  }) => {
    if (editingCard) {
      updateCard({
        ...editingCard,
        ...cardData,
      });
    } else {
      addCard(cardData);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Header Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else if (tab === 'study') {
            handleStartStudy('All');
          } else {
            setCurrentTab(tab);
          }
        }}
        streakDays={stats.streakDays}
        dueCount={stats.dueTodayCount}
        settings={settings}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Areas */}
      <main className="flex-1 pb-16">
        {currentTab === 'dashboard' && (
          <Dashboard
            stats={stats}
            settings={settings}
            onStartStudy={handleStartStudy}
            onOpenAddCard={() => {
              setEditingCard(null);
              setIsCardModalOpen(true);
            }}
            onOpenCardList={() => setCurrentTab('cards')}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {currentTab === 'study' && (
          <StudySession
            key={`session-${studyCategory}-${studySessionBatch.length}`}
            sessionCards={studySessionBatch}
            settings={settings}
            selectedCategory={studyCategory}
            onGradeCard={gradeCard}
            onFinishSession={() => {
              // Refresh batch
              setStudySessionBatch(getSessionCards(studyCategory));
            }}
            onExitToDashboard={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'cards' && (
          <CardList
            cards={cards}
            settings={settings}
            onOpenAddModal={() => {
              setEditingCard(null);
              setIsCardModalOpen(true);
            }}
            onOpenEditModal={(card) => {
              setEditingCard(card);
              setIsCardModalOpen(true);
            }}
            onDeleteCard={deleteCard}
            onResetCardProgress={resetCardProgress}
            onOpenImportExport={() => setIsImportExportOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-950/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Anki4Devs</span> — Spaced Repetition System for Software Engineering Communication
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>SuperMemo SM-2</span>
            <span>•</span>
            <span>Web Speech TTS</span>
            <span>•</span>
            <span>100% Offline Storage</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isCardModalOpen && (
        <CardModal
          key={editingCard ? editingCard.id : 'new-card'}
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          onSave={handleSaveCard}
          editingCard={editingCard}
        />
      )}


      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onExportJSON={exportDeckJSON}
        onImportJSON={importDeckJSON}
        totalCardsCount={cards.length}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onResetAllProgress={resetAllProgress}
        onRestoreDefaultDeck={restoreDefaultDeck}
      />
    </div>
  );
}

export default App;
