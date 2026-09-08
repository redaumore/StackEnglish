import React, { useState } from 'react';
import {
  X,
  Volume2,
  Sparkles,
  Sliders,
  RotateCcw,
  Check,
  Key,
  Database,
  Trash2,
  Eye,
  EyeOff,
  Zap,
  Loader2,
  Mic,
} from 'lucide-react';
import type { OpenAIVoice, OpenAIModel, UserSettings } from '../types/srs';
import { useTTS } from '../hooks/useTTS';
import { hasEnvOpenAIApiKey } from '../utils/env';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onResetAllProgress: () => void;
  onRestoreDefaultDeck: () => void;
}

const OPENAI_VOICES: Array<{ id: OpenAIVoice; label: string; desc: string }> = [
  { id: 'alloy', label: 'Alloy', desc: 'Balanced, clear & versatile (Recommended)' },
  { id: 'nova', label: 'Nova', desc: 'Friendly, warm & natural' },
  { id: 'onyx', label: 'Onyx', desc: 'Deep, authoritative & professional' },
  { id: 'echo', label: 'Echo', desc: 'Smooth, resonant & conversational' },
  { id: 'fable', label: 'Fable', desc: 'Expressive & dynamic' },
  { id: 'shimmer', label: 'Shimmer', desc: 'Bright, crisp & engaging' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetAllProgress,
  onRestoreDefaultDeck,
}) => {
  const { voices, speak, cachedAudioCount, clearAudioCache, refreshCacheCount, isLoading, isSpeaking } = useTTS(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean>(false);
  const [testError, setTestError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestSpeech = async () => {
    setTestError(null);
    setTestSuccess(false);

    const effectiveKey = (settings.openAIApiKey || (hasEnvOpenAIApiKey() ? 'env' : ''))?.trim();
    if (settings.ttsProvider === 'openai' && !effectiveKey) {
      setTestError('Please enter an OpenAI API key or set OPENAI_API_KEY in .env before testing.');
      return;
    }

    try {
      await speak(
        'Let us align on deliverables and ownership for the upcoming sprint.',
        'settings-test',
        settings
      );
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 2500);
      refreshCacheCount();
    } catch (e: any) {
      setTestError(e?.message || 'Failed to play speech.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Study & Audio Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure OpenAI neural TTS, IndexedDB cache, and SM-2 queue pacing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Section 1: Audio Engine Provider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" />
                <span>Text-To-Speech (TTS) Engine</span>
              </h3>

              {settings.ttsProvider === 'openai' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Studio Neural HD Active
                </span>
              )}
            </div>

            {/* Provider Switcher Tabs */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ttsProvider: 'openai' })}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                  settings.ttsProvider === 'openai'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    <span>OpenAI TTS-1 (Neural)</span>
                  </span>
                  {settings.ttsProvider === 'openai' && (
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Human-grade natural fluency + IndexedDB local caching ($0.015 / 1k chars).
                </p>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ ttsProvider: 'web-speech' })}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                  settings.ttsProvider === 'web-speech'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    Native Web Speech
                  </span>
                  {settings.ttsProvider === 'web-speech' && (
                    <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Browser/OS built-in synthesizer. 100% free with no API key needed.
                </p>
              </button>
            </div>

            {/* Provider Configuration Forms */}
            {settings.ttsProvider === 'openai' ? (
              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4 animate-fade-in">
                {/* API Key Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        OpenAI API Key
                      </label>
                      {hasEnvOpenAIApiKey() && (
                        <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20">
                          Loaded from .env
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {hasEnvOpenAIApiKey() ? '.env active (override below if needed)' : 'Stored in local browser storage'}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.openAIApiKey || ''}
                      onChange={(e) => onUpdateSettings({ openAIApiKey: e.target.value })}
                      placeholder={hasEnvOpenAIApiKey() ? '(Using OPENAI_API_KEY from .env)' : 'sk-proj-...'}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                    />
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Voice Selection & Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      OpenAI Neural Voice
                    </label>
                    <select
                      value={settings.openAIVoice || 'alloy'}
                      onChange={(e) => onUpdateSettings({ openAIVoice: e.target.value as OpenAIVoice })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      {OPENAI_VOICES.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label} — {v.desc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Quality Model
                    </label>
                    <select
                      value={settings.openAIModel || 'tts-1'}
                      onChange={(e) => onUpdateSettings({ openAIModel: e.target.value as OpenAIModel })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="tts-1">tts-1 (Lowest latency & cost - $0.015/1k)</option>
                      <option value="tts-1-hd">tts-1-hd (Maximum fidelity - $0.030/1k)</option>
                    </select>
                  </div>
                </div>

                {/* IndexedDB Cache Status Banner */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <span>
                      <strong>{cachedAudioCount} phrases cached</strong> in browser IndexedDB (0 network calls on repeat)
                    </span>
                  </div>

                  {cachedAudioCount > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Clear all cached audio files from IndexedDB?')) {
                          await clearAudioCache();
                        }
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Cache</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Native Web Speech Options */
              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-4 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Browser Voice Selection
                  </label>
                  <select
                    value={settings.preferredVoiceURI}
                    onChange={(e) => onUpdateSettings({ preferredVoiceURI: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 truncate"
                  >
                    {voices.map((voice) => (
                      <option key={voice.uri} value={voice.uri}>
                        {voice.name} ({voice.lang}) {voice.isPreferred ? '★ Preferred' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Playback Rate & Test Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Playback Speed ({settings.playbackRate}x)
                </label>
                <div className="flex items-center gap-2">
                  {[0.8, 1.0, 1.2].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => onUpdateSettings({ playbackRate: r })}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        settings.playbackRate === r
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-5 space-y-1">
                <button
                  type="button"
                  disabled={isLoading || isSpeaking}
                  onClick={handleTestSpeech}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                  ) : testSuccess || isSpeaking ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                  <span>
                    {isLoading
                      ? 'Generating OpenAI Audio...'
                      : isSpeaking
                      ? 'Playing...'
                      : 'Test Audio Quality'}
                  </span>
                </button>
                {testError && (
                  <p className="text-[11px] text-rose-500 dark:text-rose-400 text-center font-medium">
                    {testError}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 1.5: Speech Evaluator */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Mic className="w-4 h-4" />
                <span>Speech & Pronunciation Evaluation (OpenAI Whisper + GPT-4o-mini)</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                0.0 - 10.0 Scoring
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Zap className="w-4 h-4 text-indigo-500" />
                <span>Unified OpenAI Architecture</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Uses the configured <strong>OpenAI API Key</strong> for everything: high-fidelity <strong>Whisper-1</strong> speech transcription and <strong>GPT-4o-mini</strong> pronunciation scoring, stress detection, and flashcard card generation.
              </p>
            </div>
          </div>

          {/* Section 2: Study Pacing */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Daily Study Queue Pacing</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New Cards Per Day
                </label>
                <select
                  value={settings.newCardsPerDay}
                  onChange={(e) =>
                    onUpdateSettings({ newCardsPerDay: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={5}>5 new cards / day (Relaxed)</option>
                  <option value={10}>10 new cards / day (Standard)</option>
                  <option value={15}>15 new cards / day (Accelerated)</option>
                  <option value={20}>20 new cards / day (Intensive)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Session Timer Target
                </label>
                <select
                  value={settings.sessionDurationMinutes}
                  onChange={(e) =>
                    onUpdateSettings({ sessionDurationMinutes: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes (Recommended)</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Reset & Data Controls */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              <span>Danger Zone: Reset Controls</span>
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to reset all review progress and intervals back to day 1?')) {
                    onResetAllProgress();
                    alert('Progress reset complete.');
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-semibold transition-all cursor-pointer"
              >
                Reset Review Intervals
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Restore starter deck of 110 engineering phrases? (Custom added cards will be replaced)')) {
                    onRestoreDefaultDeck();
                    alert('Default deck restored.');
                  }
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Restore 110 Starter Deck
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
