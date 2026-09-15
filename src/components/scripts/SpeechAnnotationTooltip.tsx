import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Plus, Check, Volume2, Loader2 } from 'lucide-react';
import type { AnnotationItem } from '../../types/speech-evaluator';
import type { SRSCard, Category } from '../../types/srs';
import { SpeechService } from '../../services/SpeechService';

interface SpeechAnnotationTooltipProps {
  annotation: AnnotationItem;
  children: React.ReactNode;
  category?: Category;
  contextSentence?: string;
  onAddToDeck?: (cardData: Omit<SRSCard, 'id' | 'repetition' | 'interval' | 'easeFactor' | 'dueDate' | 'lastReviewed' | 'createdAt'>) => void;
}

export const SpeechAnnotationTooltip: React.FC<SpeechAnnotationTooltipProps> = ({
  annotation,
  children,
  category = 'Architecture Review',
  contextSentence = '',
  onAddToDeck,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isPlayingWord, setIsPlayingWord] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isWarning = annotation.status === 'warning';
  const underlineStyle = isWarning
    ? 'border-b-2 border-dotted border-amber-400/80 cursor-pointer text-amber-300 bg-amber-500/10 rounded-xs px-1'
    : 'border-b-2 border-dotted border-rose-400/80 cursor-pointer text-rose-300 bg-rose-500/10 rounded-xs px-1';

  const handlePlayPronunciation = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPlayingWord) return;

    setIsPlayingWord(true);
    SpeechService.speak(annotation.word_or_phrase, {
      rate: 0.85, // slightly slower for instructional pronunciation clarity
      onEnd: () => setIsPlayingWord(false),
      onError: () => setIsPlayingWord(false),
    });
  };

  const handleAddToAnki = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onAddToDeck || isAdded) return;

    onAddToDeck({
      phrase: annotation.word_or_phrase,
      category,
      meaning_en: `Pronunciation [${annotation.ipa}] - Heard as "${annotation.heard_as}": ${annotation.feedback}`,
      example_sentence: contextSentence || `Pay attention to pronunciation: ${annotation.word_or_phrase}.`,
      tags: ['pronunciation', annotation.issue_type],
    });

    setIsAdded(true);
  };

  // Close tooltip if clicked outside or on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span
      className="relative inline-block"
      ref={triggerRef}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setIsOpen(true)}
        onFocus={() => setIsOpen(true)}
        onBlur={(e) => {
          // Close if focus moved outside the entire container
          if (!triggerRef.current?.contains(e.relatedTarget as Node)) {
            setIsOpen(false);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`${underlineStyle} transition-all`}
        role="button"
        tabIndex={0}
        aria-label={`Pronunciation issue for ${annotation.word_or_phrase}`}
      >
        {children}
      </span>

      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-150 text-left cursor-default"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isWarning ? 'bg-amber-400' : 'bg-rose-500'
                }`}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                {annotation.issue_type.replace('_', ' ')}
              </span>
            </div>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                isWarning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {annotation.status}
            </span>
          </div>

          {/* Details */}
          <div className="py-2 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Heard as:</span>
              <span className="font-mono text-rose-300 font-semibold">"{annotation.heard_as}"</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Target IPA:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-cyan-300 font-bold">{annotation.ipa}</span>
                <button
                  type="button"
                  onClick={handlePlayPronunciation}
                  disabled={isPlayingWord}
                  className={`p-1 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                    isPlayingWord
                      ? 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                      : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
                  }`}
                  title={`Listen to pronunciation of "${annotation.word_or_phrase}"`}
                  aria-label={`Listen to pronunciation of "${annotation.word_or_phrase}"`}
                >
                  {isPlayingWord ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed pt-1 bg-slate-800/60 p-2 rounded-xl">
              {annotation.feedback}
            </p>
          </div>

          {/* Quick Action: Add to Deck */}
          {onAddToDeck && (
            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleAddToAnki}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-200" />
                    <span>Added to Deck</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    <Sparkles className="w-3 h-3 text-indigo-200" />
                    <span>Add to Deck</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </span>
  );
};
