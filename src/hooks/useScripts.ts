import { useState, useEffect, useCallback } from 'react';
import type { ConversationScript, GenerateScriptParams, ScriptProgress, ScriptProgressMap } from '../types/script';
import { SEED_SCRIPTS } from '../data/seedScripts';
import { ScriptGeneratorService } from '../services/ScriptGeneratorService';

const STORAGE_KEYS = {
  SCRIPTS: 'stackenglish_scripts_v1',
  ACTIVE_SCRIPT: 'stackenglish_active_script_v1',
  PROGRESS: 'stackenglish_script_progress_v1',
};

const LEGACY_STORAGE_KEYS = {
  SCRIPTS: 'anki4devs_scripts_v1',
  ACTIVE_SCRIPT: 'anki4devs_active_script_v1',
  PROGRESS: 'anki4devs_script_progress_v1',
};

export function useScripts(openAIApiKey?: string) {
  const [scripts, setScripts] = useState<ConversationScript[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SCRIPTS) || localStorage.getItem(LEGACY_STORAGE_KEYS.SCRIPTS);
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
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_SCRIPT) || localStorage.getItem(LEGACY_STORAGE_KEYS.ACTIVE_SCRIPT);
      if (stored && scripts.some((s) => s.id === stored)) {
        return stored;
      }
    } catch (e) {
      console.error('Failed to load activeScriptId from localStorage', e);
    }
    return scripts[0]?.id || SEED_SCRIPTS[0].id;
  });

  const [progressMap, setProgressMap] = useState<ScriptProgressMap>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS) || localStorage.getItem(LEGACY_STORAGE_KEYS.PROGRESS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load script progress from localStorage', e);
    }
    return {};
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Sync scripts with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCRIPTS, JSON.stringify(scripts));
    } catch (e) {
      console.error('Failed to persist scripts', e);
    }
  }, [scripts]);

  // Sync activeScriptId with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SCRIPT, activeScriptId);
    } catch (e) {
      console.error('Failed to persist activeScriptId', e);
    }
  }, [activeScriptId]);

  // Sync progressMap with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressMap));
    } catch (e) {
      console.error('Failed to persist script progress', e);
    }
  }, [progressMap]);

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0] || null;
  const activeScriptProgress = activeScript ? progressMap[activeScript.id] : undefined;

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

  const updateScriptProgress = useCallback((scriptId: string, partialProgress: Partial<ScriptProgress>) => {
    setProgressMap((prev) => {
      const current = prev[scriptId] || {
        completedLines: {},
        evaluations: {},
      };
      const updated: ScriptProgress = {
        ...current,
        ...partialProgress,
        completedLines: partialProgress.completedLines
          ? { ...current.completedLines, ...partialProgress.completedLines }
          : current.completedLines,
        evaluations: partialProgress.evaluations
          ? { ...current.evaluations, ...partialProgress.evaluations }
          : current.evaluations,
        lastPracticedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [scriptId]: updated,
      };
    });
  }, []);

  const resetScriptProgress = useCallback((scriptId: string) => {
    setProgressMap((prev) => {
      const next = { ...prev };
      delete next[scriptId];
      return next;
    });
    setScripts((prev) =>
      prev.map((s) => (s.id === scriptId ? { ...s, lastScore: undefined } : s))
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
    setProgressMap({});
    try {
      localStorage.removeItem(STORAGE_KEYS.PROGRESS);
    } catch (e) {
      console.error('Failed to clear script progress', e);
    }
  }, []);

  const exportScriptsData = useCallback(() => {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      totalScripts: scripts.length,
      scripts,
      scriptProgress: progressMap,
    };
  }, [scripts, progressMap]);

  const importScriptsData = useCallback(
    (
      rawScripts: unknown,
      rawProgress?: unknown,
      mode: 'merge' | 'replace' = 'merge'
    ): { importedCount: number; duplicatesSkipped: number; progressImportedCount: number } => {
      if (!Array.isArray(rawScripts)) {
        return { importedCount: 0, duplicatesSkipped: 0, progressImportedCount: 0 };
      }

      const validScripts: ConversationScript[] = rawScripts.filter(
        (s: any): s is ConversationScript =>
          s &&
          typeof s.title === 'string' &&
          typeof s.topic === 'string' &&
          Array.isArray(s.characters) &&
          Array.isArray(s.lines)
      );

      if (validScripts.length === 0) {
        return { importedCount: 0, duplicatesSkipped: 0, progressImportedCount: 0 };
      }

      const incomingProgress: ScriptProgressMap =
        rawProgress && typeof rawProgress === 'object' && !Array.isArray(rawProgress)
          ? (rawProgress as ScriptProgressMap)
          : {};

      if (mode === 'replace') {
        setScripts(validScripts);
        if (validScripts.length > 0) {
          setActiveScriptId(validScripts[0].id);
        }
        setProgressMap(incomingProgress);
        return {
          importedCount: validScripts.length,
          duplicatesSkipped: 0,
          progressImportedCount: Object.keys(incomingProgress).length,
        };
      }

      // Merge mode
      let duplicatesSkipped = 0;
      const existingTitles = new Set(scripts.map((s) => s.title.trim().toLowerCase()));
      const existingIds = new Set(scripts.map((s) => s.id));
      const toAdd: ConversationScript[] = [];
      const mergedProgress = { ...progressMap };
      let progressImportedCount = 0;

      for (const script of validScripts) {
        const titleKey = script.title.trim().toLowerCase();
        if (existingTitles.has(titleKey)) {
          duplicatesSkipped++;
          // If progress exists in incoming for this existing id and not currently tracked, bring it in
          if (incomingProgress[script.id] && !mergedProgress[script.id]) {
            mergedProgress[script.id] = incomingProgress[script.id];
            progressImportedCount++;
          }
          continue;
        }

        const newId = existingIds.has(script.id)
          ? `script-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          : script.id || `script-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        toAdd.push({
          ...script,
          id: newId,
          createdAt: script.createdAt || new Date().toISOString(),
        });
        existingTitles.add(titleKey);
        existingIds.add(newId);

        if (incomingProgress[script.id]) {
          mergedProgress[newId] = incomingProgress[script.id];
          progressImportedCount++;
        }
      }

      if (toAdd.length > 0) {
        setScripts((prev) => [...prev, ...toAdd]);
      }
      setProgressMap(mergedProgress);

      return {
        importedCount: toAdd.length,
        duplicatesSkipped,
        progressImportedCount,
      };
    },
    [scripts, progressMap]
  );

  return {
    scripts,
    activeScript,
    activeScriptId,
    progressMap,
    activeScriptProgress,
    isGenerating,
    generationError,
    saveScript,
    deleteScript,
    selectScript,
    updateScriptScore,
    updateScriptProgress,
    resetScriptProgress,
    generateNewScript,
    restoreSeedScripts,
    exportScriptsData,
    importScriptsData,
  };
}
