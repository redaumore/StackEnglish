import { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import type { Category, SRSCard } from '../types/srs';
import { ALL_CATEGORIES, CATEGORY_STYLES } from '../utils/categoryColors';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: {
    phrase: string;
    category: Category;
    meaning_en: string;
    example_sentence: string;
  }) => void;
  editingCard?: SRSCard | null;
}

export const CardModal = ({
  isOpen,
  onClose,
  onSave,
  editingCard,
}: CardModalProps) => {
  const [phrase, setPhrase] = useState(editingCard?.phrase || '');
  const [category, setCategory] = useState<Category>(editingCard?.category || 'Kick-off');
  const [meaningEn, setMeaningEn] = useState(editingCard?.meaning_en || '');
  const [exampleSentence, setExampleSentence] = useState(editingCard?.example_sentence || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!phrase.trim()) {
      setError('Please provide a technical phrase.');
      return;
    }
    if (!meaningEn.trim()) {
      setError('Please provide a concise English definition.');
      return;
    }
    if (!exampleSentence.trim()) {
      setError('Please provide an authentic example meeting sentence.');
      return;
    }

    onSave({
      phrase: phrase.trim(),
      category,
      meaning_en: meaningEn.trim(),
      example_sentence: exampleSentence.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingCard ? 'Edit Technical Phrase' : 'Add New Phrase'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Spaced repetition card for professional engineering communication.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Meeting Scenario Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const style = CATEGORY_STYLES[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2.5 rounded-xl text-xs font-medium text-left border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? `${style.badgeBg} ${style.badgeText} ${style.badgeBorder} ring-2 ring-indigo-500/50 font-bold`
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phrase Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Phrase / Idiom
            </label>
            <input
              type="text"
              required
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="e.g. Push back on the scope"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Meaning Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Meaning & Definition (English)
            </label>
            <textarea
              required
              rows={2}
              value={meaningEn}
              onChange={(e) => setMeaningEn(e.target.value)}
              placeholder="e.g. To argue against adding extra features or requirements due to time constraints."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Example Sentence Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Realistic Meeting Example Sentence
            </label>
            <textarea
              required
              rows={3}
              value={exampleSentence}
              onChange={(e) => setExampleSentence(e.target.value)}
              placeholder="e.g. Given our tight deadline for Q3, we need to push back on the scope and defer multi-tenant analytics."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {editingCard ? 'Save Changes' : 'Add Phrase Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
