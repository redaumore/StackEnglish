import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Mic,
  Square,
  Volume2,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Ban,
  Clock,
  Award,
  AlertTriangle,
  Zap,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { TechCard, EvaluationResult } from '../../types/techCard';
import type { UserSettings, SRSCard } from '../../types/srs';
import { ParaphraseEvaluationService } from '../../services/ParaphraseEvaluationService';
import { OpenAITTSService } from '../../services/OpenAITTSService';
import { SpeechService } from '../../services/SpeechService';
import { convertBlobToWav } from '../../utils/audioConversion';
import { getEnvOpenAIApiKey } from '../../utils/env';

interface ParaphraseViewProps {
  settings: UserSettings;
  techCards: TechCard[];
  dueCards: TechCard[];
  onRecordEvaluation: (cardId: string, result: EvaluationResult) => void;
  onImportFlashcards?: (flashcards: SRSCard[]) => void;
  flashcards?: SRSCard[];
  onResetCard?: (cardId: string) => void;
  onRestoreSeedCards?: () => void;
}

type PracticeState = 'IDLE' | 'RECORDING' | 'PROCESSING' | 'FEEDBACK';

export const ParaphraseView: React.FC<ParaphraseViewProps> = ({
  settings,
  techCards,
  dueCards,
  onRecordEvaluation,
  onImportFlashcards,
  flashcards = [],
  onRestoreSeedCards,
}) => {
  const effectiveApiKey = (settings.openAIApiKey || getEnvOpenAIApiKey())?.trim();

  // Current queue of cards to review: due cards prioritized, or fallback to all tech cards
  const sessionCards = useMemo(() => {
    return dueCards.length > 0 ? dueCards : techCards;
  }, [dueCards, techCards]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // State machine
  const [state, setState] = useState<PracticeState>('IDLE');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Web Speech Fallback Ref
  const speechRecognitionRef = useRef<any>(null);
  const webSpeechTranscriptRef = useRef<string>('');
  const stopRecordingRef = useRef<() => void>(() => {});

  const safeIndex = Math.min(currentIndex, Math.max(0, sessionCards.length - 1));
  const currentCard: TechCard | undefined = sessionCards[safeIndex];

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Format MM:SS timer
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start Recording
  const startRecording = useCallback(async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    webSpeechTranscriptRef.current = '';
    setElapsedSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Start Web Speech API in parallel as real-time fallback transcript
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = false;
          rec.lang = 'en-US';
          rec.onresult = (event: any) => {
            let full = '';
            for (let i = 0; i < event.results.length; i++) {
              full += event.results[i][0].transcript + ' ';
            }
            webSpeechTranscriptRef.current = full.trim();
          };
          rec.start();
          speechRecognitionRef.current = rec;
        } catch {
          // Web speech not available or already running
        }
      }

      // Silence detection setup
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 512;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silenceStart = Date.now();

      const checkSilence = () => {
        if (!analyserRef.current || state === 'PROCESSING') return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const averageVolume = sum / bufferLength;

        // Threshold for human speech volume
        if (averageVolume > 15) {
          silenceStart = Date.now();
        } else {
          // If silent for 3.5 seconds after speaking at least 2 seconds, auto-stop
          if (Date.now() - silenceStart > 3500 && elapsedSeconds > 2) {
            stopRecordingRef.current();
            return;
          }
        }

        silenceTimeoutRef.current = window.setTimeout(checkSilence, 200);
      };

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setState('RECORDING');

      // Live Timer
      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 200);

      // Start silence loop
      silenceTimeoutRef.current = window.setTimeout(checkSilence, 1000);
    } catch (err) {
      console.error('Failed to start microphone:', err);
      setErrorMessage('No se pudo acceder al micrófono. Verificá los permisos de tu navegador.');
      setState('IDLE');
    }
  }, [elapsedSeconds, state]);

  const processAudioResult = async (rawAudioBlob: Blob) => {
    if (!currentCard) return;

    try {
      let transcript = webSpeechTranscriptRef.current.trim();

      // If OpenAI key is present, use Whisper for superior transcription
      if (effectiveApiKey) {
        try {
          const { wavBlob } = await convertBlobToWav(rawAudioBlob);
          const whisperText = await ParaphraseEvaluationService.transcribeAudio(
            wavBlob,
            effectiveApiKey
          );
          if (whisperText && whisperText.trim().length > 0) {
            transcript = whisperText.trim();
          }
        } catch (e) {
          console.warn('Whisper API failed, using Web Speech transcript:', e);
        }
      }

      if (!transcript) {
        transcript = '(No speech detected or audio was unclear)';
      }

      const duration = Math.max(1, elapsedSeconds);

      // Evaluate with LLM Pedagogical Evaluator
      const result = await ParaphraseEvaluationService.evaluateParaphrase(
        {
          cardId: currentCard.id,
          sourcePhrase: currentCard.sourcePhrase,
          modelAnswer: currentCard.modelAnswer,
          forbiddenWords: currentCard.forbiddenWords,
          userTranscript: transcript,
          speechDurationSeconds: duration,
        },
        currentCard,
        effectiveApiKey
      );

      setEvaluationResult(result);
      setState('FEEDBACK');
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      setErrorMessage(err?.message || 'Error al procesar la evaluación.');
      setState('IDLE');
    }
  };

  // Stop Recording and trigger STT + Evaluation
  const stopRecording = async () => {
    if (state !== 'RECORDING') return;

    setState('PROCESSING');

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

    // Stop Web Speech
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      processAudioResult(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
      return;
    }

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      processAudioResult(audioBlob);
    };

    try {
      recorder.stop();
    } catch {
      processAudioResult(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
    }

    // Stop mic stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  });

  // Play audio TTS for polished sentence or model answer
  const handlePlayTTS = (text: string) => {
    if (settings.ttsProvider === 'openai' && effectiveApiKey) {
      OpenAITTSService.playAudio(text, {
        apiKey: effectiveApiKey,
        voice: settings.openAIVoice || 'alloy',
        model: settings.openAIModel || 'tts-1',
        speed: settings.playbackRate || 1.0,
      }).catch(() => {
        SpeechService.speak(text, {
          voiceURI: settings.preferredVoiceURI,
          rate: settings.playbackRate || 1.0,
        });
      });
    } else {
      SpeechService.speak(text, {
        voiceURI: settings.preferredVoiceURI,
        rate: settings.playbackRate || 1.0,
      });
    }
  };

  // Proceed to next exercise
  const handleNextExercise = () => {
    if (evaluationResult && currentCard) {
      onRecordEvaluation(currentCard.id, evaluationResult);
    }

    setEvaluationResult(null);
    setState('IDLE');
    setElapsedSeconds(0);

    if (currentIndex + 1 < sessionCards.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed current queue
      setCurrentIndex(0);
    }
  };

  // Highlight forbidden words inside user transcript
  const renderUserTranscript = (text: string, repeatedForbidden: string[]) => {
    if (!repeatedForbidden || repeatedForbidden.length === 0) {
      return <span>"{text}"</span>;
    }

    const regex = new RegExp(`\\b(${repeatedForbidden.join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return (
      <span>
        "
        {parts.map((part, i) => {
          const isForbidden = repeatedForbidden.some(
            (fw) => fw.toLowerCase() === part.toLowerCase()
          );
          if (isForbidden) {
            return (
              <span
                key={i}
                className="line-through text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/60 px-1 py-0.5 rounded"
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
        "
      </span>
    );
  };

  if (!currentCard) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          ¡Completaste todas las tarjetas pendientes!
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm">
          Has repasado todo tu mazo oral de hoy. Puedes importar tarjetas adicionales desde tus flashcards o reiniciar el mazo semilla.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {onImportFlashcards && flashcards.length > 0 && (
            <button
              onClick={() => onImportFlashcards(flashcards)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
            >
              Importar {flashcards.length} Frases de Flashcards
            </button>
          )}
          {onRestoreSeedCards && (
            <button
              onClick={onRestoreSeedCards}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-all"
            >
              Restaurar Mazo Base (Seed Cards)
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      {/* Top Banner & Context */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Oral Tech Paraphrase
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                SRS SM-2
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Explica el concepto técnico con tus propias palabras evitando los términos prohibidos.
            </p>
          </div>
        </div>

        {/* Progress & Batch Actions */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
            Tarjeta {currentIndex + 1} de {sessionCards.length}
          </span>
          {onImportFlashcards && flashcards.length > 0 && (
            <button
              onClick={() => onImportFlashcards(flashcards)}
              title="Importar frases de las flashcards existentes a tarjetas orales"
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Central Card */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl transition-all">
        {/* Card Header Domain */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
              {currentCard.contextDomain}
            </span>
            <span className="text-xs text-slate-400">
              • Repaso #{currentCard.repetition} (Intervalo: {currentCard.intervalDays}d)
            </span>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            EF: {currentCard.easeFactor.toFixed(2)}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Source Phrase (H2) */}
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">
              Consigna a explicar:
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {currentCard.sourcePhrase}
            </h2>
          </div>

          {/* Forbidden Words Chips */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <Ban className="w-3.5 h-3.5" />
              <span>Forbidden Words (No digas estas palabras ni sus raíces):</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {currentCard.forbiddenWords.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 shadow-xs"
                >
                  <Ban className="w-3 h-3 text-rose-500" />
                  <span>{word}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Interaction Area / State-dependent Controls */}
          {state === 'IDLE' && (
            <div className="pt-6 pb-2 flex flex-col items-center justify-center space-y-4">
              <button
                onClick={startRecording}
                className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Comenzar a grabar tu respuesta en inglés"
              >
                <Mic className="w-8 h-8 transition-transform group-hover:scale-110" />
                <span className="absolute -bottom-7 text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Click para Grabar
                </span>
              </button>
            </div>
          )}

          {state === 'RECORDING' && (
            <div className="pt-6 pb-2 flex flex-col items-center justify-center space-y-5">
              <div className="relative flex items-center justify-center">
                {/* Pulse animations */}
                <div className="absolute w-24 h-24 rounded-full bg-rose-500/20 animate-ping" />
                <div className="absolute w-20 h-20 rounded-full bg-rose-500/30 animate-pulse" />

                <button
                  onClick={stopRecording}
                  className="relative z-10 flex items-center justify-center w-18 h-18 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Detener alocución"
                >
                  <Square className="w-7 h-7 fill-white" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-mono font-bold text-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>

              <p className="text-xs text-slate-500 text-center max-w-xs">
                Habla en inglés explicando la idea. Se detendrá tras 3.5s de silencio o presiona el botón rojo.
              </p>
            </div>
          )}

          {state === 'PROCESSING' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Evaluando tu parafraseo técnico...
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transcribiendo audio y consultando al evaluador pedagógico LLM.
                </p>
              </div>
            </div>
          )}

          {/* Feedback Screen (< 15 seconds reading) */}
          {state === 'FEEDBACK' && evaluationResult && (
            <div className="pt-4 space-y-6 animate-fade-in border-t border-slate-100 dark:border-slate-800">
              {/* Top Header Bar Pills */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {/* Score Pill */}
                <div
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-xs ${
                    evaluationResult.scores.overallScore >= 4.0
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : evaluationResult.scores.overallScore >= 3.0
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>Score: {evaluationResult.scores.overallScore.toFixed(1)} / 5.0</span>
                </div>

                {/* Pace Telemetry Pill */}
                <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    Ritmo: {evaluationResult.telemetry.durationSeconds}s ({evaluationResult.telemetry.paceCategory})
                  </span>
                </div>

                {/* SRS Next Review Pill */}
                <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    Próximo repaso:{' '}
                    {evaluationResult.srsUpdate.newIntervalDays === 0
                      ? 'En 10 minutos (Again)'
                      : `En ${evaluationResult.srsUpdate.newIntervalDays} días (${evaluationResult.srsUpdate.rating.toUpperCase()})`}
                  </span>
                </div>
              </div>

              {/* Comparative Block: You said vs Model answer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>You said:</span>
                    {evaluationResult.insights.repeatedForbiddenWords.length > 0 && (
                      <span className="text-rose-500 text-[10px] font-bold">Palabras prohibidas detectadas</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                    {renderUserTranscript(
                      sessionCards[currentIndex]?.sourcePhrase || '',
                      evaluationResult.insights.repeatedForbiddenWords
                    )}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Model answer (Referencia):
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic leading-relaxed">
                    "{currentCard.modelAnswer}"
                  </p>
                </div>
              </div>

              {/* Quick Insights (3 Atomic Rows) */}
              <div className="space-y-2 p-4 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">Significado:</strong>{' '}
                    <span className="text-slate-600 dark:text-slate-400">
                      {evaluationResult.insights.meaningSummary}
                    </span>
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <Ban className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">Vocabulario:</strong>{' '}
                    <span className="text-slate-600 dark:text-slate-400">
                      {evaluationResult.insights.repeatedForbiddenWords.length === 0
                        ? 'Excelente, no repetiste ningún término prohibido.'
                        : `Violaste la regla con: ${evaluationResult.insights.repeatedForbiddenWords.join(', ')}.`}
                    </span>
                  </p>
                </div>

                {evaluationResult.insights.grammarBullets.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 dark:text-slate-200">Gramática & Sintaxis:</strong>
                      <ul className="list-disc list-inside mt-0.5 text-slate-600 dark:text-slate-400 space-y-0.5">
                        {evaluationResult.insights.grammarBullets.map((bullet, i) => (
                          <li key={i}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Polished Sentence & Audio TTS */}
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Polished Sentence:
                  </span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    "{evaluationResult.insights.polishedSentence}"
                  </p>
                </div>

                <button
                  onClick={() => handlePlayTTS(evaluationResult.insights.polishedSentence)}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Escuchar corrección</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    setState('IDLE');
                    setEvaluationResult(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reintentar tarjeta</span>
                </button>

                <button
                  onClick={handleNextExercise}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  <span>Siguiente ejercicio</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
