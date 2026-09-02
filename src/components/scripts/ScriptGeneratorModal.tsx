import React, { useState } from 'react';
import { X, Wand2, Sparkles, Loader2, Layers, User, Users } from 'lucide-react';
import type { Category } from '../../types/srs';
import type { GenerateScriptParams } from '../../types/script';

interface ScriptGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: GenerateScriptParams) => Promise<any>;
  isGenerating: boolean;
  hasOpenAIKey: boolean;
}

const CATEGORIES: Category[] = [
  'Architecture Review',
  'Scope Negotiation',
  'Standup / Follow-up',
  'Post-Mortem',
  'Kick-off',
];

const PRESET_TOPICS = [
  {
    topic: 'Monolith vs Microservices Migration & Boundary Decoupling',
    category: 'Architecture Review' as Category,
    userRole: 'Senior Backend Engineer',
    interlocutorRole: 'Lead Architect',
  },
  {
    topic: 'Pushing Back on Sprint Scope Creep Before Product Launch',
    category: 'Scope Negotiation' as Category,
    userRole: 'Tech Lead',
    interlocutorRole: 'Product Manager',
  },
  {
    topic: 'Redis Cache Stale Data & Cascading Fallback Failures',
    category: 'Post-Mortem' as Category,
    userRole: 'Staff Developer',
    interlocutorRole: 'Principal SRE',
  },
  {
    topic: 'Third-Party Auth Provider Latency Spike & Token Refresh Blocker',
    category: 'Standup / Follow-up' as Category,
    userRole: 'Fullstack Engineer',
    interlocutorRole: 'Scrum Master / Lead',
  },
  {
    topic: 'Kicking off High-Scale Event Bus & Observability Standards',
    category: 'Kick-off' as Category,
    userRole: 'Engineering Manager',
    interlocutorRole: 'Platform Architect',
  },
];

export const ScriptGeneratorModal: React.FC<ScriptGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  hasOpenAIKey,
}) => {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<Category>('Architecture Review');
  const [userRole, setUserRole] = useState('Senior Software Engineer');
  const [interlocutorRole, setInterlocutorRole] = useState('Principal Architect / Tech Lead');
  const [difficulty, setDifficulty] = useState<'intermediate' | 'advanced'>('advanced');
  const [situationDetails, setSituationDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_TOPICS[0]) => {
    setTopic(preset.topic);
    setCategory(preset.category);
    setUserRole(preset.userRole);
    setInterlocutorRole(preset.interlocutorRole);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setError(null);
    try {
      await onGenerate({
        topic: topic.trim(),
        category,
        userRole: userRole.trim() || 'Software Engineer',
        interlocutorRole: interlocutorRole.trim() || 'Tech Lead',
        difficulty,
        situationDetails: situationDetails.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Generation failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Workplace Conversation Script
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hasOpenAIKey
                  ? 'Powered by OpenAI GPT-4o-mini (Tailored scenarios & idioms)'
                  : 'Curated technical simulation templates (Offline mode)'}
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Presets Quick Pick */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Scenarios & Inspiration</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TOPICS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all cursor-pointer truncate max-w-full text-left"
                >
                  {preset.topic}
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Conversation Topic / Scenario *
            </label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Negotiating GraphQL migration vs REST v2 endpoints"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Context Category</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Idiomatic Depth / Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="advanced">Advanced (High-density idioms & trade-offs)</option>
                <option value="intermediate">Intermediate (Clear standard technical phrasing)</option>
              </select>
            </div>
          </div>

          {/* Roles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>Your Role (Speaker to practice)</span>
              </label>
              <input
                type="text"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                placeholder="e.g. Senior Backend Lead"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>Counterpart Role</span>
              </label>
              <input
                type="text"
                value={interlocutorRole}
                onChange={(e) => setInterlocutorRole(e.target.value)}
                placeholder="e.g. Principal Architect / PM"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Situation Details */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Specific Situation Nuances (Optional)
            </label>
            <textarea
              rows={2}
              value={situationDetails}
              onChange={(e) => setSituationDetails(e.target.value)}
              placeholder="e.g. We have tight budget limits, high concurrency requirements, and we need to push back diplomatically on a hard Q3 deadline."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !topic.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Script...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Script</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
