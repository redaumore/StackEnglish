import React, { useState } from 'react';
import { X, BookOpen, Plus, Check, Loader2, Volume2, Sparkles } from 'lucide-react';
import type { Category, SRSCard } from '../../types/srs';
import type { WordDefinition } from '../../types/script';
import { useTTS } from '../../hooks/useTTS';
import type { UserSettings } from '../../types/srs';

interface DefinitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  definition: WordDefinition | null;
  isLoading: boolean;
  onAddToDeck: (cardData: Omit<SRSCard, 'id' | 'repetition' | 'interval' | 'easeFactor' | 'dueDate' | 'lastReviewed' | 'createdAt'>) => void;
  settings: UserSettings;
}

const CATEGORIES: Category[] = [
  'Kick-off',
  'Standup / Follow-up',
  'Scope Negotiation',
  'Architecture Review',
  'Post-Mortem',
];

export const DefinitionModal: React.FC<DefinitionModalProps> = ({
  isOpen,
  onClose,
  definition,
  isLoading,
  onAddToDeck,
  settings,
}) => {
  const [category, setCategory] = useState<Category>(definition?.suggestedCategory || 'Architecture Review');
  const [editedPhrase, setEditedPhrase] = useState(definition?.term || '');
  const [editedMeaning, setEditedMeaning] = useState(definition?.definition || '');
  const [editedExample, setEditedExample] = useState(definition?.exampleSentence || '');
  const [isSaved, setIsSaved] = useState(false);

  const { speak, isSpeaking } = useTTS(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!editedPhrase.trim() || !editedMeaning.trim()) return;

    onAddToDeck({
      phrase: editedPhrase.trim(),
      category,
      meaning_en: editedMeaning.trim(),
      example_sentence: editedExample.trim() || `Discussion involving ${editedPhrase.trim()}.`,
      tags: ['script-vocabulary'],
    });

    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Word & Phrase Definition
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Contextual English definition & instant SRS card creation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-medium">Looking up English definition & context...</p>
            </div>
          ) : definition ? (
            <>
              {/* Term Header & TTS */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {definition.term}
                    </span>
                    {definition.phonetic && (
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        {definition.phonetic}
                      </span>
                    )}
                    {definition.partOfSpeech && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        {definition.partOfSpeech}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {definition.definition}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => speak(definition.term, 'def-speech', settings)}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Listen to pronunciation"
                >
                  <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`} />
                </button>
              </div>

              {/* Editable Fields for SRS Card creation */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Customize Anki Flashcard</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Phrase / Expression
                  </label>
                  <input
                    type="text"
                    value={editedPhrase}
                    onChange={(e) => setEditedPhrase(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Meaning (English)
                  </label>
                  <textarea
                    rows={2}
                    value={editedMeaning}
                    onChange={(e) => setEditedMeaning(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Example Sentence
                  </label>
                  <textarea
                    rows={2}
                    value={editedExample}
                    onChange={(e) => setEditedExample(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    SRS Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-xs text-slate-400 py-6">No definition available.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isLoading || !definition || isSaved}
            onClick={handleSave}
            className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
              isSaved
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Added to SRS Deck!</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add to SRS Deck</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
