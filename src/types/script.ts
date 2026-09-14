import type { Category, OpenAIVoice } from './srs';

export interface ScriptCharacter {
  id: string;
  name: string;
  role: string; // e.g. 'Lead Architect', 'Senior Backend Dev', 'Product Manager', 'Engineering Manager'
  avatarColor: string; // Tailwind color class or hex
  voice?: OpenAIVoice;
  webSpeechVoiceURI?: string;
}

export interface DialogueLine {
  id: string;
  characterId: string;
  text: string;
  notes?: string; // e.g. Pronunciation tips, tone suggestions
}

export interface ConversationScript {
  id: string;
  title: string;
  topic: string;
  category: Category;
  contextDescription: string;
  characters: ScriptCharacter[];
  lines: DialogueLine[];
  userRoleCharacterId?: string; // Optional character assigned to the user to read aloud
  lastScore?: number; // Latest overall pronunciation score obtained (0.0 - 10.0)
  createdAt: string;
}

export interface TurnEvaluationRecord {
  turnId: string | number;
  score: number | null;
  isEvaluated: boolean;
  annotations: import('./speech-evaluator').AnnotationItem[];
}

export interface ScriptProgress {
  selectedRole?: string;
  completedLines: Record<string, boolean>;
  evaluations: Record<string | number, TurnEvaluationRecord>;
  lastScore?: number;
  lastPracticedAt?: string;
}

export type ScriptProgressMap = Record<string, ScriptProgress>;

export interface WordDefinition {
  term: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
  exampleSentence?: string;
  suggestedCategory?: Category;
}

export interface GenerateScriptParams {
  topic: string;
  category: Category;
  userRole: string;
  interlocutorRole: string;
  difficulty?: 'intermediate' | 'advanced';
  situationDetails?: string;
}

export interface ScriptImportExportResult {
  importedCount: number;
  duplicatesSkipped: number;
  progressImportedCount: number;
}

