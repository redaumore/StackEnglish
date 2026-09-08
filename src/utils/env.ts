/**
 * Utility to retrieve environment variables with fallback support
 * Supports:
 * - import.meta.env.OPENAI_API_KEY / import.meta.env.VITE_OPENAI_API_KEY
 * - import.meta.env.GEMINI_API_KEY / import.meta.env.VITE_GEMINI_API_KEY
 */

export function getEnvOpenAIApiKey(): string {
  try {
    const key =
      import.meta.env.OPENAI_API_KEY ||
      import.meta.env.VITE_OPENAI_API_KEY ||
      '';
    return typeof key === 'string' ? key.trim() : '';
  } catch {
    return '';
  }
}

export function getEnvGeminiApiKey(): string {
  try {
    const key =
      import.meta.env.GEMINI_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      '';
    return typeof key === 'string' ? key.trim() : '';
  } catch {
    return '';
  }
}

export function hasEnvOpenAIApiKey(): boolean {
  return Boolean(getEnvOpenAIApiKey());
}

export function hasEnvGeminiApiKey(): boolean {
  return Boolean(getEnvGeminiApiKey());
}
