import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Info,
  UserCheck,
  Loader2,
} from 'lucide-react';
import type { ConversationScript, DialogueLine, ScriptCharacter, WordDefinition } from '../../types/script';
import type { UserSettings } from '../../types/srs';
import { useTTS } from '../../hooks/useTTS';

interface ScriptPlayerProps {
  script: ConversationScript;
  settings: UserSettings;
  onOpenDefinition: (def: WordDefinition) => void;
  onRequestDefinitionLookup: (term: string, contextSentence: string) => Promise<void>;
}

export const ScriptPlayer: React.FC<ScriptPlayerProps> = ({
  script,
  settings,
  onRequestDefinitionLookup,
}) => {
  const { speak, isSpeaking, activeTextId, isLoading } = useTTS(settings);

  const [selectedRole, setSelectedRole] = useState<string>(
    script.userRoleCharacterId || script.characters[0]?.id || ''
  );
  const [completedLines, setCompletedLines] = useState<Record<string, boolean>>({});
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [showLookupButton, setShowLookupButton] = useState(false);
  const [lookupButtonPos, setLookupButtonPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Handle text selection in dialogue container
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

    // Override voice for this specific actor
    const actorSettings: Partial<UserSettings> = {
      ...settings,
      openAIVoice: char.voice || settings.openAIVoice || 'alloy',
    };

    speak(line.text, `script-line-${line.id}`, actorSettings);
  };

  const handleToggleLineDone = (lineId: string) => {
    setCompletedLines((prev) => ({
      ...prev,
      [lineId]: !prev[lineId],
    }));
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
            <span>Define & Add to SRS: "{selectedText.slice(0, 18)}{selectedText.length > 18 ? '...' : ''}"</span>
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

          {/* Progress / Practice Score */}
          <div className="flex sm:flex-col items-end justify-between gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Speaking Progress
                </span>
                <div className="text-base font-bold text-slate-900 dark:text-white">
                  {completedCount} / {totalLines}{' '}
                  <span className="text-xs font-normal text-slate-400">({progressPercent}%)</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-32 sm:w-36 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

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
                    onClick={() => setSelectedRole(char.id)}
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

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            <span>Select any word/phrase with your cursor to look up definition and save to Anki.</span>
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

          return (
            <div
              key={line.id}
              data-line-text={line.text}
              className={`rounded-3xl p-5 border transition-all relative ${
                isUserRole
                  ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              } ${isDone ? 'opacity-85' : ''}`}
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
                    <div className="flex items-center gap-2">
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
                    </div>

                    {/* Turn Controls */}
                    <div className="flex items-center gap-2">
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

                  {/* Dialogue Text (Selectable) */}
                  <p className="text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-relaxed font-normal selection:bg-indigo-500 selection:text-white">
                    {line.text}
                  </p>

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
