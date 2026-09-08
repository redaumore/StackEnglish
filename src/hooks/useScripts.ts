import { useState, useEffect, useCallback } from 'react';
import type { ConversationScript, GenerateScriptParams } from '../types/script';
import { SEED_SCRIPTS } from '../data/seedScripts';
import { ScriptGeneratorService } from '../services/ScriptGeneratorService';

const STORAGE_KEY = 'anki4devs_scripts_v1';

export function useScripts(openAIApiKey?: string) {
  const [scripts, setScripts] = useState<ConversationScript[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load scripts from localStorage', e);
    }
    return SEED_SCRIPTS;
  });

  const [activeScriptId, setActiveScriptId] = useState<string>(() => {
    return scripts[0]?.id || SEED_SCRIPTS[0].id;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
    } catch (e) {
      console.error('Failed to persist scripts', e);
    }
  }, [scripts]);

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0] || null;

  const saveScript = useCallback((script: ConversationScript) => {
    setScripts((prev) => {
      const exists = prev.some((s) => s.id === script.id);
      if (exists) {
        return prev.map((s) => (s.id === script.id ? script : s));
      }
      return [script, ...prev];
    });
    setActiveScriptId(script.id);
  }, []);

  const deleteScript = useCallback((scriptId: string) => {
    setScripts((prev) => {
      const filtered = prev.filter((s) => s.id !== scriptId);
      if (filtered.length === 0) {
        return SEED_SCRIPTS;
      }
      return filtered;
    });
  }, []);

  const selectScript = useCallback((scriptId: string) => {
    setActiveScriptId(scriptId);
  }, []);

  const updateScriptScore = useCallback((scriptId: string, score: number) => {
    setScripts((prev) =>
      prev.map((s) => (s.id === scriptId ? { ...s, lastScore: score } : s))
    );
  }, []);

  const generateNewScript = useCallback(
    async (params: GenerateScriptParams) => {
      setIsGenerating(true);
      setGenerationError(null);
      try {
        const newScript = await ScriptGeneratorService.generateScript(params, openAIApiKey);
        setScripts((prev) => [newScript, ...prev]);
        setActiveScriptId(newScript.id);
        setIsGenerating(false);
        return newScript;
      } catch (err: any) {
        const msg = err?.message || 'Failed to generate script.';
        setGenerationError(msg);
        setIsGenerating(false);
        throw err;
      }
    },
    [openAIApiKey]
  );

  const restoreSeedScripts = useCallback(() => {
    setScripts(SEED_SCRIPTS);
    setActiveScriptId(SEED_SCRIPTS[0].id);
  }, []);

  return {
    scripts,
    activeScript,
    activeScriptId,
    isGenerating,
    generationError,
    saveScript,
    deleteScript,
    selectScript,
    updateScriptScore,
    generateNewScript,
    restoreSeedScripts,
  };
}
