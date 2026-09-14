import React, { useState } from 'react';
import {
  MessageSquareQuote,
  Trash2,
  RotateCcw,
  Sparkles,
  Mic,
  Search,
  Download,
} from 'lucide-react';
import type { WordDefinition } from '../../types/script';
import type { UserSettings, SRSCard, Category } from '../../types/srs';
import { useScripts } from '../../hooks/useScripts';
import { ScriptPlayer } from './ScriptPlayer';
import { ScriptGeneratorModal } from './ScriptGeneratorModal';
import { DefinitionModal } from './DefinitionModal';
import { DictionaryService } from '../../services/DictionaryService';
import { getEnvOpenAIApiKey } from '../../utils/env';

interface ScriptsViewProps {
  settings: UserSettings;
  onAddCardToSRS: (cardData: Omit<SRSCard, 'id' | 'repetition' | 'interval' | 'easeFactor' | 'dueDate' | 'lastReviewed' | 'createdAt'>) => void;
  onOpenImportExport?: () => void;
  scriptsHook?: ReturnType<typeof useScripts>;
}

export const ScriptsView: React.FC<ScriptsViewProps> = ({
  settings,
  onAddCardToSRS,
  onOpenImportExport,
  scriptsHook,
}) => {
  const effectiveOpenAIKey = (settings.openAIApiKey || getEnvOpenAIApiKey())?.trim();

  const internalScripts = useScripts(effectiveOpenAIKey);
  const {
    scripts,
    activeScript,
    activeScriptId,
    progressMap,
    isGenerating,
    selectScript,
    deleteScript,
    updateScriptScore,
    updateScriptProgress,
    resetScriptProgress,
    generateNewScript,
    restoreSeedScripts,
  } = scriptsHook || internalScripts;

  const getScoreBadgeClass = (score: number | null | undefined): string => {
    if (score === null || score === undefined) return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    if (score >= 8.5) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 6.0) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
    if (score >= 5.0) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<Category | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Definition Lookup State
  const [isDefModalOpen, setIsDefModalOpen] = useState(false);
  const [activeDefinition, setActiveDefinition] = useState<WordDefinition | null>(null);
  const [isLookingUpDef, setIsLookingUpDef] = useState(false);

  const handleRequestDefinitionLookup = async (term: string, contextSentence: string) => {
    setIsDefModalOpen(true);
    setIsLookingUpDef(true);
    setActiveDefinition(null);

    try {
      const def = await DictionaryService.lookup(
        term,
        contextSentence,
        effectiveOpenAIKey,
        activeScript?.category
      );
      setActiveDefinition(def);
    } catch (e) {
      console.error('Failed to lookup definition', e);
      setActiveDefinition({
        term,
        definition: 'Could not fetch definition.',
        exampleSentence: contextSentence,
        suggestedCategory: activeScript?.category || 'Architecture Review',
      });
    } finally {
      setIsLookingUpDef(false);
    }
  };

  const filteredScripts = scripts.filter((s) => {
    const matchesCategory = selectedCategoryFilter === 'All' || s.category === selectedCategoryFilter;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contextDescription.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/40 via-purple-900/20 to-slate-900/40 border border-indigo-500/20 rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Mic className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Workplace Conversation Scripts & Speaking
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
            Simulate realistic developer, architect and lead dialogues. Practice speaking aloud, listen to AI voice tracks, select unknown idioms to get definitions, and save them straight to your Anki deck.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {onOpenImportExport && (
            <button
              type="button"
              onClick={onOpenImportExport}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-white text-xs font-semibold border border-white/20 dark:border-slate-700 flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-indigo-300" />
              <span>Sync / Backup JSON</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsGeneratorOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate New Script</span>
          </button>

          <button
            type="button"
            onClick={restoreSeedScripts}
            title="Reset to default seed dialogues"
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar list + Active Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Script Library */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Saved Scripts ({filteredScripts.length})
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search scripts by topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              {(['All', 'Architecture Review', 'Scope Negotiation', 'Standup / Follow-up', 'Post-Mortem'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategoryFilter === cat
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredScripts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No scripts found.</p>
              ) : (
                filteredScripts.map((s) => {
                  const isActive = s.id === activeScriptId;
                  const scriptProg = progressMap[s.id];
                  const practicedCount = scriptProg?.completedLines
                    ? Object.values(scriptProg.completedLines).filter(Boolean).length
                    : 0;
                  const displayScore = scriptProg?.lastScore ?? s.lastScore;

                  return (
                    <div
                      key={s.id}
                      onClick={() => selectScript(s.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer group flex items-start justify-between gap-2 ${
                        isActive
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/30'
                          : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {s.category}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {practicedCount > 0 ? `${practicedCount}/${s.lines.length} practiced` : `${s.lines.length} turns`}
                          </span>
                          {displayScore !== undefined && displayScore !== null && (
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono border ${getScoreBadgeClass(
                                displayScore
                              )}`}
                            >
                              {displayScore.toFixed(1)} / 10.0
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {s.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {s.topic}
                        </p>
                      </div>

                      {/* Delete button (only for non-seed or when more than 1) */}
                      {scripts.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete script "${s.title}"?`)) {
                              deleteScript(s.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Delete script"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Active Player */}
        <div className="lg:col-span-8">
          {activeScript ? (
            <ScriptPlayer
              key={activeScript.id}
              script={activeScript}
              settings={settings}
              progress={progressMap[activeScript.id]}
              onProgressChange={(partial) => updateScriptProgress(activeScript.id, partial)}
              onResetProgress={() => resetScriptProgress(activeScript.id)}
              onOpenDefinition={(def) => {
                setActiveDefinition(def);
                setIsDefModalOpen(true);
              }}
              onRequestDefinitionLookup={handleRequestDefinitionLookup}
              onAddCardToSRS={onAddCardToSRS}
              onScoreUpdate={updateScriptScore}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <MessageSquareQuote className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-sm font-medium">Select a conversation script from the list to start practicing.</p>
            </div>
          )}
        </div>
      </div>

      {/* Generator Modal */}
      <ScriptGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onGenerate={generateNewScript}
        isGenerating={isGenerating}
        hasOpenAIKey={Boolean(effectiveOpenAIKey)}
      />

      {/* Definition & Save to Anki Modal */}
      {isDefModalOpen && (
        <DefinitionModal
          key={activeDefinition ? activeDefinition.term : 'loading-def'}
          isOpen={isDefModalOpen}
          onClose={() => setIsDefModalOpen(false)}
          definition={activeDefinition}
          isLoading={isLookingUpDef}
          onAddToDeck={onAddCardToSRS}
          settings={settings}
        />
      )}
    </div>
  );
};
