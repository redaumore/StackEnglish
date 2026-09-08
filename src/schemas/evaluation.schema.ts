import { z } from 'zod';

export const AnnotationItemSchema = z.object({
  word_or_phrase: z.string().describe("Exact substring from expected_text to highlight"),
  status: z.enum(['warning', 'critical']),
  heard_as: z.string().describe("Phonetic representation of how the user pronounced it"),
  ipa: z.string().describe("Standard IPA notation"),
  issue_type: z.enum(['phoneme', 'word_stress', 'omitted_sound', 'added_sound']),
  feedback: z.string().describe("1-2 tactical sentences explaining how to adjust pronunciation")
});

export const EvaluationResponseSchema = z.object({
  paragraph_score: z.number().min(0.0).max(10.0),
  intelligibility_rating: z.enum(['native', 'proficient_workplace', 'borderline', 'unintelligible']),
  summary: z.string(),
  annotations: z.array(AnnotationItemSchema).default([]),
  praise_points: z.array(z.string()).default([])
});

export type EvaluationResponseValidated = z.infer<typeof EvaluationResponseSchema>;
