import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Volume2,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Info,
  UserCheck,
  Loader2,
  Mic,
  Square,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { ConversationScript, DialogueLine, ScriptCharacter, WordDefinition, ScriptProgress } from '../../types/script';
import type { UserSettings, SRSCard } from '../../types/srs';
import type { TurnEvaluationState } from '../../types/speech-evaluator';
import { useTTS } from '../../hooks/useTTS';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { SpeechEvaluationService } from '../../services/SpeechEvaluationService';
import { parseAnnotatedText } from '../../utils/parseAnnotatedText';
import { SpeechAnnotationTooltip } from './SpeechAnnotationTooltip';

interface ScriptPlayerProps {
  script: ConversationScript;
  settings: UserSettings;
  progress?: ScriptProgress;
  onProgressChange?: (partial: Partial<ScriptProgress>) => void;
  onResetProgress?: () => void;
  onOpenDefinition: (def: WordDefinition) => void;
  onRequestDefinitionLookup: (term: string, contextSentence: string) => Promise<void>;
  onAddCardToSRS?: (cardData: Omit<SRSCard, 'id' | 'repetition' | 'interval' | 'easeFactor' | 'dueDate' | 'lastReviewed' | 'createdAt'>) => void;
  onScoreUpdate?: (scriptId: string, score: number) => void;
}

export const ScriptPlayer: React.FC<ScriptPlayerProps> = ({
  script,
  settings,
  progress,
  onProgressChange,
  onResetProgress,
  onRequestDefinitionLookup,
  onAddCardToSRS,
  onScoreUpdate,
}) => {
  const { speak, isSpeaking, activeTextId, isLoading } = useTTS(settings);
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();

  const [selectedRole, setSelectedRole] = useState<string>(
    progress?.selectedRole || script.userRoleCharacterId || script.characters[0]?.id || ''
  );
  const [completedLines, setCompletedLines] = useState<Record<string, boolean>>(
    progress?.completedLines || {}
  );
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [showLookupButton, setShowLookupButton] = useState(false);
  const [lookupButtonPos, setLookupButtonPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Evaluations state: Record<string | number, TurnEvaluationState>
  const [evaluations, setEvaluations] = useState<Record<string | number, TurnEvaluationState>>(() => {
    if (!progress?.evaluations) return {};
    const initial: Record<string | number, TurnEvaluationState> = {};
    for (const [key, val] of Object.entries(progress.evaluations)) {
      initial[key] = {
        turnId: val.turnId,
        audioBlobUrl: null,
        score: val.score,
        isEvaluated: val.isEvaluated,
        isRecording: false,
        isLoading: false,
        annotations: val.annotations || [],
        error: null,
      };
    }
    return initial;
  });
  const [activeRecordingLineId, setActiveRecordingLineId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const confettiFiredRef = useRef<boolean>(false);

  // Handle text selection in dialogue container for dictionary lookup
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setShowLookupButton(false);
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 0 && text.length < 80) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Find parent line text for context
        let currentElement: HTMLElement | null = range.startContainer.parentElement;
        let lineContext = '';
        while (currentElement && !currentElement.dataset.lineText) {
          currentElement = currentElement.parentElement;
        }
        if (currentElement && currentElement.dataset.lineText) {
          lineContext = currentElement.dataset.lineText;
        }

        setSelectedText(text);
        setSelectedContext(lineContext);
        setLookupButtonPos({
          x: Math.max(10, rect.left + rect.width / 2),
          y: Math.max(10, rect.top - 10),
        });
        setShowLookupButton(true);
      } else {
        setShowLookupButton(false);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const handleLookupSelected = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowLookupButton(false);
    if (selectedText) {
      onRequestDefinitionLookup(selectedText, selectedContext);
    }
  };

  const getCharacter = (charId: string): ScriptCharacter => {
    return (
      script.characters.find((c) => c.id === charId) || {
        id: charId,
        name: 'Speaker',
        role: 'Engineer',
        avatarColor: 'bg-indigo-600',
        voice: 'alloy',
      }
    );
  };

  const handlePlayLine = (line: DialogueLine) => {
    const char = getCharacter(line.characterId);
    const actorSettings: Partial<UserSettings> = {
      ...settings,
      openAIVoice: char.voice || settings.openAIVoice || 'alloy',
    };
    speak(line.text, `script-line-${line.id}`, actorSettings);
  };

  const handleRoleSelect = (charId: string) => {
    setSelectedRole(charId);
    if (onProgressChange) {
      onProgressChange({ selectedRole: charId });
    }
  };

  const handleToggleLineDone = (lineId: string) => {
    setCompletedLines((prev) => {
      const next = {
        ...prev,
        [lineId]: !prev[lineId],
      };
      if (onProgressChange) {
        onProgressChange({ completedLines: next });
      }
      return next;
    });
  };

  // Required user turns calculation
  const userLines = useMemo(() => {
    return script.lines.filter((l) => l.characterId === selectedRole);
  }, [script.lines, selectedRole]);

  const totalRequiredUserTurns = userLines.length;

  // Track completion and overall score
  const userTurns = Object.values(evaluations);
  const completedTurns = userTurns.filter((t) => t.isEvaluated && t.score !== null);
  const overallScore =
    completedTurns.length > 0
      ? completedTurns.reduce((acc, curr) => acc + (curr.score ?? 0), 0) / completedTurns.length
      : 0;

  const isPassing =
    totalRequiredUserTurns > 0 &&
    completedTurns.length === totalRequiredUserTurns &&
    overallScore >= 7.0;

  const needsReview =
    totalRequiredUserTurns > 0 &&
    completedTurns.length === totalRequiredUserTurns &&
    overallScore < 7.0;

  // Trigger confetti celebration once when passing
  useEffect(() => {
    if (isPassing && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    } else if (!isPassing) {
      confettiFiredRef.current = false;
    }
  }, [isPassing]);

  // Audio Recording & Evaluation Handlers
  const handleToggleRecord = async (line: DialogueLine) => {
    const currentEvaluation = evaluations[line.id];
    if (currentEvaluation?.isLoading) {
      return; // prevent concurrent operations
    }

    if (isRecording && activeRecordingLineId === line.id) {
      // Stop recording and trigger evaluation
      try {
        setEvaluations((prev) => ({
          ...prev,
          [line.id]: {
            turnId: line.id,
            audioBlobUrl: prev[line.id]?.audioBlobUrl ?? null,
            score: prev[line.id]?.score ?? null,
            isEvaluated: prev[line.id]?.isEvaluated ?? false,
            isRecording: false,
            isLoading: true,
            annotations: prev[line.id]?.annotations ?? [],
            error: null,
          },
        }));

        setActiveRecordingLineId(null);
        const audioBlob = await stopRecording();
        const blobUrl = URL.createObjectURL(audioBlob);

        const evaluationResult = await SpeechEvaluationService.evaluateSpeech({
          audioBlob,
          expectedText: line.text,
          roleContext: getCharacter(line.characterId).role,
          dialogueId: script.id,
          turnId: line.id,
          apiKey: settings.openAIApiKey,
        });

        const updatedScore = evaluationResult.paragraph_score;

        setEvaluations((prev) => {
          const next = {
            ...prev,
            [line.id]: {
              turnId: line.id,
              audioBlobUrl: blobUrl,
              score: updatedScore,
              isEvaluated: true,
              isRecording: false,
              isLoading: false,
              annotations: evaluationResult.annotations || [],
              error: null,
            },
          };

          if (onScoreUpdate) {
            const turns = Object.values(next).filter((t) => t.isEvaluated && t.score !== null);
            if (turns.length > 0) {
              const currentOverall = turns.reduce((acc, curr) => acc + (curr.score ?? 0), 0) / turns.length;
              onScoreUpdate(script.id, currentOverall);
            }
          }

          if (onProgressChange) {
            onProgressChange({
              evaluations: {
                [line.id]: {
                  turnId: line.id,
                  score: updatedScore,
                  isEvaluated: true,
                  annotations: evaluationResult.annotations || [],
                },
              },
            });
          }

          return next;
        });

        // Automatically mark line as completed/practiced if score >= 6.0
        if (updatedScore >= 6.0) {
          setCompletedLines((prev) => {
            const next = { ...prev, [line.id]: true };
            if (onProgressChange) {
              onProgressChange({ completedLines: next });
            }
            return next;
          });
        }
      } catch (err: any) {
        console.error('Speech evaluation failed:', err);
        setEvaluations((prev) => ({
          ...prev,
          [line.id]: {
            turnId: line.id,
            audioBlobUrl: prev[line.id]?.audioBlobUrl ?? null,
            score: prev[line.id]?.score ?? null,
            isEvaluated: prev[line.id]?.isEvaluated ?? false,
            isRecording: false,
            isLoading: false,
            annotations: prev[line.id]?.annotations ?? [],
            error: err?.message || 'Speech evaluation failed.',
          },
        }));
      }
    } else {
      // Start recording for this line
      if (isRecording) {
        // If recording another line, stop that first
        await stopRecording();
      }

      setActiveRecordingLineId(line.id);
      setEvaluations((prev) => ({
        ...prev,
        [line.id]: {
          turnId: line.id,
          audioBlobUrl: prev[line.id]?.audioBlobUrl ?? null,
          score: prev[line.id]?.score ?? null,
          isEvaluated: prev[line.id]?.isEvaluated ?? false,
          isRecording: true,
          isLoading: false,
          annotations: prev[line.id]?.annotations ?? [],
          error: null,
        },
      }));

      await startRecording();
    }
  };

  const getScoreBadgeClass = (score: number | null): string => {
    if (score === null) return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    if (score >= 8.5) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 6.0) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
    if (score >= 5.0) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  };

  const totalLines = script.lines.length;
  const completedCount = Object.values(completedLines).filter(Boolean).length;
  const progressPercent = totalLines > 0 ? Math.round((completedCount / totalLines) * 100) : 0;

  return (
    <div ref={containerRef} className="space-y-6 relative">
      {/* Floating Definition Lookup Trigger Tooltip */}
      {showLookupButton && (
        <div
          style={{
            position: 'fixed',
            top: `${lookupButtonPos.y}px`,
            left: `${lookupButtonPos.x}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 60,
          }}
          className="animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleLookupSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 border border-indigo-400/30 transition-all active:scale-95 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              Define & Add to SRS: "{selectedText.slice(0, 18)}
              {selectedText.length > 18 ? '...' : ''}"
            </span>
          </button>
        </div>
      )}

      {/* Script Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                {script.category}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">• {script.topic}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {script.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
              {script.contextDescription}
            </p>
          </div>

          {/* Progress / Practice Score & Pronunciation Rating */}
          <div className="flex flex-col items-end gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between gap-4 w-full">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Speaking Progress
                </span>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {completedCount} / {totalLines}{' '}
                  <span className="text-xs font-normal text-slate-400">({progressPercent}%)</span>
                </div>
              </div>

              {completedTurns.length > 0 && (
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Pronunciation Score
                  </span>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono border ${getScoreBadgeClass(
                        overallScore
                      )}`}
                    >
                      {overallScore.toFixed(1)} / 10.0
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Overall Status Badge */}
            {isPassing && (
              <div className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Passed & Cleared (≥ 7.0)</span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isPassing ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Needs Review Notice Banner */}
        {needsReview && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Needs Review:</strong> Your overall pronunciation score ({overallScore.toFixed(1)}/10.0) is below the 7.0 passing threshold. Retry turns scoring under 7.0 to clear this dialogue.
              </span>
            </div>
          </div>
        )}

        {/* Roleplay Assignment Selector & Hint */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-500" />
              <span>Practice speaking as:</span>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {script.characters.map((char) => {
                const isSelected = selectedRole === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleRoleSelect(char.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs scale-102'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${char.avatarColor || 'bg-indigo-500'}`} />
                    <span>{char.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {onResetProgress && (completedCount > 0 || completedTurns.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset speaking progress and scores for this script?')) {
                    setCompletedLines({});
                    setEvaluations({});
                    onResetProgress();
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                title="Reset progress for this dialogue"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Progress</span>
              </button>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              <span>Click the mic on your turns to evaluate pronunciation with AI.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogue Turns Script Timeline */}
      <div className="space-y-4">
        {script.lines.map((line) => {
          const char = getCharacter(line.characterId);
          const isUserRole = char.id === selectedRole;
          const isDone = Boolean(completedLines[line.id]);
          const isPlaying = activeTextId === `script-line-${line.id}` && isSpeaking;
          const isLineLoading = activeTextId === `script-line-${line.id}` && isLoading;

          const turnEval = evaluations[line.id];
          const isTurnRecording = isRecording && activeRecordingLineId === line.id;
          const isTurnEvaluating = Boolean(turnEval?.isLoading);
          const turnScore = turnEval?.score ?? null;

          // Inline annotation rendering
          const renderedSegments =
            turnEval?.annotations && turnEval.annotations.length > 0
              ? parseAnnotatedText(line.text, turnEval.annotations)
              : null;

          return (
            <div
              key={line.id}
              data-line-text={line.text}
              className={`rounded-3xl p-5 border transition-all relative ${
                isUserRole
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              } ${isDone ? 'opacity-95' : ''}`}
            >
              <div className="flex items-start gap-4">
                {/* Character Avatar */}
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm ${
                    char.avatarColor || 'bg-indigo-600'
                  }`}
                >
                  {char.name.charAt(0)}
                </div>

                {/* Line Body */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {char.name}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        ({char.role})
                      </span>
                      {isUserRole && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
                          You (Read aloud)
                        </span>
                      )}

                      {/* Score Badge */}
                      {turnScore !== null && (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono border ${getScoreBadgeClass(
                            turnScore
                          )}`}
                        >
                          {turnScore.toFixed(1)} / 10.0
                        </span>
                      )}
                    </div>

                    {/* Turn Controls */}
                    <div className="flex items-center gap-2">
                      {/* Audio Recording Button for User Role */}
                      {isUserRole && (
                        <button
                          type="button"
                          disabled={isTurnEvaluating || (isRecording && !isTurnRecording)}
                          onClick={() => handleToggleRecord(line)}
                          className={`px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                            isTurnRecording
                              ? 'bg-rose-600 text-white border-rose-500 animate-pulse ring-2 ring-rose-500/30'
                              : isTurnEvaluating
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-400 border-indigo-300'
                              : turnScore !== null && turnScore < 6.0
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 hover:bg-amber-100'
                              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                          }`}
                          title={
                            isTurnRecording
                              ? 'Click to stop and evaluate pronunciation'
                              : 'Record and evaluate speech'
                          }
                        >
                          {isTurnEvaluating ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Evaluating...</span>
                            </>
                          ) : isTurnRecording ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Stop & Score</span>
                            </>
                          ) : turnScore !== null && turnScore < 6.0 ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Retry Turn</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5" />
                              <span>{turnScore !== null ? 'Record Again' : 'Record'}</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Practiced check toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleLineDone(line.id)}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                          isDone
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={isDone ? 'Mark as unpracticed' : 'Mark practiced'}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-emerald-500' : ''}`} />
                        <span className="hidden sm:inline">{isDone ? 'Practiced' : 'Mark done'}</span>
                      </button>

                      {/* Native TTS play */}
                      <button
                        type="button"
                        onClick={() => handlePlayLine(line)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                          isPlaying
                            ? 'bg-indigo-600 text-white border-indigo-600 animate-pulse'
                            : isLineLoading
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600'
                        }`}
                        title={`Listen to ${char.name}'s voice`}
                      >
                        {isLineLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        ) : isPlaying ? (
                          <Volume2 className="w-4 h-4 text-white animate-bounce" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Dialogue Text with Inline Annotations */}
                  <div className="text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-relaxed font-normal selection:bg-indigo-500 selection:text-white">
                    {renderedSegments ? (
                      renderedSegments.map((segment, idx) => {
                        if (segment.isAnnotation && segment.annotationData) {
                          return (
                            <SpeechAnnotationTooltip
                              key={`ann-${idx}`}
                              annotation={segment.annotationData}
                              category={script.category}
                              contextSentence={line.text}
                              onAddToDeck={onAddCardToSRS}
                            >
                              {segment.text}
                            </SpeechAnnotationTooltip>
                          );
                        }
                        return <span key={`seg-${idx}`}>{segment.text}</span>;
                      })
                    ) : (
                      <p>{line.text}</p>
                    )}
                  </div>

                  {/* Audio Playback for User's recorded Turn */}
                  {turnEval?.audioBlobUrl && (
                    <div className="pt-1 flex items-center gap-2">
                      <audio
                        controls
                        src={turnEval.audioBlobUrl}
                        className="h-7 w-56 rounded-lg opacity-80"
                      />
                      <span className="text-[10px] text-slate-400">Your recording</span>
                    </div>
                  )}

                  {/* Evaluation Error Message */}
                  {turnEval?.error && (
                    <div className="text-xs text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
                      {turnEval.error}
                    </div>
                  )}

                  {/* Pronunciation & Context Coaching Note */}
                  {line.notes && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300/90 italic bg-indigo-50/50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Coach note: {line.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
