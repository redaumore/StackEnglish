import { useEffect } from 'react';
import { Eye, Lightbulb, MessageSquareQuote } from 'lucide-react';
import type { Grade, SRSCard, UserSettings } from '../types/srs';
import { CATEGORY_STYLES } from '../utils/categoryColors';
import { getIntervalPreviews, formatInterval } from '../utils/sm2';
import { AudioButton } from './AudioButton';

interface FlashcardProps {
  card: SRSCard;
  isFlipped: boolean;
  onFlip: () => void;
  onGrade: (grade: Grade) => void;
  settings: UserSettings;
  isSubmitting?: boolean;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  card,
  isFlipped,
  onFlip,
  onGrade,
  settings,
  isSubmitting = false,
}) => {
  const categoryStyle = CATEGORY_STYLES[card.category] || {
    badgeBg: 'bg-slate-800',
    badgeText: 'text-slate-200',
    badgeBorder: 'border-slate-700',
    accentColor: '#6366f1',
    description: '',
  };

  const intervalPreviews = getIntervalPreviews(card);

  useEffect(() => {
    if (!isFlipped && settings.autoPlayPhraseAudio) {
      const t = setTimeout(() => {
        // trigger
      }, 200);
      return () => clearTimeout(t);
    }
  }, [card.id, isFlipped, settings.autoPlayPhraseAudio]);

  return (
    <div className="w-full max-w-2xl mx-auto select-none">
      {/* Interactive Card Surface */}
      <div
        onClick={!isFlipped ? onFlip : undefined}
        className={`w-full min-h-[420px] rounded-3xl bg-white dark:bg-slate-900 border-2 transition-all duration-300 shadow-xl relative flex flex-col justify-between p-6 sm:p-8 cursor-pointer ${
          isFlipped
            ? 'border-indigo-500/50 shadow-indigo-500/10 cursor-default'
            : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 hover:shadow-2xl'
        }`}
      >
        {/* Card Header: Category Badge & Repetition Meta */}
        <div className="flex items-center justify-between gap-3 w-full border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${categoryStyle.badgeBg} ${categoryStyle.badgeText} ${categoryStyle.badgeBorder}`}
          >
            {card.category}
          </span>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            {card.lastReviewed ? (
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                Interval: {formatInterval(card.interval)} • EF: {card.easeFactor.toFixed(2)}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                NEW CARD
              </span>
            )}
          </div>
        </div>

        {/* Card Body: Front / Back Content */}
        <div className="my-auto py-6 space-y-6 text-center sm:text-left">
          {/* Main Phrase (Front) */}
          <div className="space-y-3 text-center">
            <div className="text-xs uppercase font-mono tracking-widest text-slate-400 font-semibold">
              Software Engineering Phrase
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug">
              "{card.phrase}"
            </h2>

            {/* Audio Button for Phrase */}
            <div className="flex justify-center pt-2">
              <AudioButton
                text={card.phrase}
                textId={`phrase-${card.id}`}
                settings={settings}
                size="md"
                variant="secondary"
                label={settings.ttsProvider === 'openai' ? 'OpenAI Audio' : 'Pronunciation'}
              />
            </div>
          </div>

          {/* Flipped Reveal Section (Meaning + Real Technical Example) */}
          {isFlipped ? (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-5 animate-fade-in">
              {/* Meaning */}
              <div className="bg-slate-50 dark:bg-slate-950/70 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Meaning & Context</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed font-medium">
                  {card.meaning_en}
                </p>
              </div>

              {/* Example Meeting Sentence */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl p-4 sm:p-5 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    <MessageSquareQuote className="w-3.5 h-3.5" />
                    <span>In a Real Tech Meeting</span>
                  </div>
                  <AudioButton
                    text={card.example_sentence}
                    textId={`example-${card.id}`}
                    settings={settings}
                    size="sm"
                    variant="ghost"
                    label="Listen"
                  />
                </div>

                <p className="text-slate-900 dark:text-slate-100 text-sm sm:text-base italic leading-relaxed">
                  "{card.example_sentence}"
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center pt-8">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlip();
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                <Eye className="w-4 h-4 text-indigo-500" />
                <span>Reveal Meaning & Example (Space)</span>
              </button>
            </div>
          )}
        </div>

        {/* Card Footer: Rating Buttons (Visible when flipped) */}
        {isFlipped ? (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 w-full animate-fade-in">
            <div className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
              How well did you recall this expression? (SM-2 Rating)
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {/* 1 = Again */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.stopPropagation();
                  onGrade(1);
                }}
                className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 font-semibold cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                <span className="text-sm">Again</span>
                <span className="text-[11px] font-mono opacity-80 mt-0.5">
                  +{intervalPreviews[1].intervalLabel}
                </span>
                <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-rose-500/70 border border-rose-300 dark:border-rose-800 px-1 rounded">
                  [1]
                </span>
              </button>

              {/* 2 = Hard */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.stopPropagation();
                  onGrade(2);
                }}
                className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 font-semibold cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                <span className="text-sm">Hard</span>
                <span className="text-[11px] font-mono opacity-80 mt-0.5">
                  +{intervalPreviews[2].intervalLabel}
                </span>
                <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-amber-500/70 border border-amber-300 dark:border-amber-800 px-1 rounded">
                  [2]
                </span>
              </button>

              {/* 3 = Good */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.stopPropagation();
                  onGrade(3);
                }}
                className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                <span className="text-sm">Good</span>
                <span className="text-[11px] font-mono opacity-80 mt-0.5">
                  +{intervalPreviews[3].intervalLabel}
                </span>
                <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-emerald-500/70 border border-emerald-300 dark:border-emerald-800 px-1 rounded">
                  [3]
                </span>
              </button>

              {/* 4 = Easy */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => {
                  e.stopPropagation();
                  onGrade(4);
                }}
                className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 font-semibold cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                <span className="text-sm">Easy</span>
                <span className="text-[11px] font-mono opacity-80 mt-0.5">
                  +{intervalPreviews[4].intervalLabel}
                </span>
                <span className="absolute bottom-1 right-1.5 text-[9px] font-mono text-sky-500/70 border border-sky-300 dark:border-sky-800 px-1 rounded">
                  [4]
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-2 text-center text-xs text-slate-400 font-mono">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">Space</kbd> to flip
          </div>
        )}
      </div>
    </div>
  );
};
