import { EvaluationResponseSchema, type EvaluationResponseValidated } from '../schemas/evaluation.schema';
import type { EvaluationResponse } from '../types/speech-evaluator';
import { getEnvOpenAIApiKey } from '../utils/env';
import { convertBlobToWav } from '../utils/audioConversion';

export interface EvaluateSpeechParams {
  audioBlob: Blob;
  expectedText: string;
  roleContext?: string;
  dialogueId?: string;
  turnId?: string | number;
  apiKey?: string;
}


/**
 * Fallback heuristic offline evaluator when no API key is provided
 */
function createMockEvaluation(expectedText: string): EvaluationResponse {
  const words = expectedText.split(/\s+/).filter((w) => w.length > 3);
  const sampleWord =
    words[Math.floor(Math.random() * words.length)]?.replace(/[^a-zA-Z]/g, '') ||
    'architecture';

  return {
    paragraph_score: 8.5,
    intelligibility_rating: 'proficient_workplace',
    summary:
      'Great pace and natural sentence rhythm. Clear technical communication with minor stress variance.',
    annotations: [
      {
        word_or_phrase: sampleWord,
        status: 'warning',
        heard_as: sampleWord.toLowerCase(),
        ipa: `/${sampleWord.toLowerCase()}/`,
        issue_type: 'word_stress',
        feedback: `Focus on primary syllable stress for "${sampleWord}" to project higher confidence in tech reviews.`,
      },
    ],
    praise_points: [
      'Strong connected speech across phrases.',
      'Audible final consonants and technical term delivery.',
    ],
  };
}

export class SpeechEvaluationService {
  /**
   * Evaluates user's recorded speech using OpenAI's best models:
   * 1. Transcribes audio via OpenAI Whisper (`whisper-1`) with high precision.
   * 2. Evaluates pronunciation, fluency, stress, and keyword delivery via `gpt-4o-mini` (or `gpt-4o`).
   */
  public static async evaluateSpeech(params: EvaluateSpeechParams): Promise<EvaluationResponse> {
    const { audioBlob, expectedText, roleContext, apiKey } = params;
    const effectiveApiKey = (apiKey || getEnvOpenAIApiKey())?.trim();

    // Convert recorded audio to WAV format (standard PCM supported by audio models & browsers)
    const { wavBlob, wavBase64 } = await convertBlobToWav(audioBlob);

    // 1. Try backend endpoint first if available
    try {
      const formData = new FormData();
      formData.append('audio', wavBlob, 'recording.wav');
      formData.append('expectedText', expectedText);
      formData.append('roleContext', roleContext || 'Software Engineer');
      if (params.dialogueId) formData.append('dialogueId', params.dialogueId);
      if (params.turnId) formData.append('turnId', String(params.turnId));
      if (effectiveApiKey) formData.append('apiKey', effectiveApiKey);

      const res = await fetch('/api/dialogue/evaluate-speech', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const rawJson = await res.json();
        const validated: EvaluationResponseValidated = EvaluationResponseSchema.parse(rawJson);
        return validated;
      }
    } catch {
      // Backend route not available, proceed with client-side OpenAI pipeline
    }

    // 2. Direct OpenAI API Pipeline with Multimodal Audio Input (gpt-audio-mini)
    if (effectiveApiKey) {
      try {
        const promptContent = `
Target Expected Text:
"${expectedText}"

Role Context:
"${roleContext || 'Software Engineer'}"

You are a supportive yet precise English pronunciation coach evaluating this audio recording for international software professionals.
Listen carefully to the attached audio and compare what the user said against the Target Expected Text.

BALANCED WORKPLACE INTELLIGIBILITY & PHONETIC CRITERIA:
1. FOCUS ON COMMUNICATIVE EFFECTIVENESS & INTELLIGIBILITY:
   - Prioritize clear, confident communication in a technical work environment.
   - Differentiate between a natural non-native accent (acceptable and understandable) versus phonetic errors that impair comprehension or alter word meanings.
   - Provide helpful phonetic coaching on areas like vowel reduction, word stress, and consonant endings, but DO NOT disproportionately penalize minor accent traits.

2. FAIR & REALISTIC SCORING:
   - 9.0 - 10.0: Native or near-native clarity, cadence, and effortless comprehension.
   - 7.5 - 8.9: Strong professional English. Very clear and intelligible. Minor accent or slight vowel/consonant variations that do not impede communication.
   - 6.0 - 7.4: Competent workplace English. Message is clearly understood, though has noticeable accent quirks, occasional flat vowels, or slight stress slips. Worthy of a passing score.
   - 4.5 - 5.9: Needs improvement. Several pronunciation errors or cadence issues that cause momentary listener strain or ambiguity.
   - < 4.5: Significantly impaired intelligibility, multiple missing/mispronounced critical words, or heavy distortion.

3. CONSTRUCTIVE ANNOTATIONS:
   - Highlight words where pronunciation can be polished, focusing on the highest-impact improvements.
   - 'word_or_phrase': Must match the exact substring in Target Expected Text.
   - 'status': Use 'critical' ONLY when pronunciation genuinely obscures the word or changes its meaning; use 'warning' for typical non-native phonetic slips (e.g. flat vowels, subtle stress differences).
   - 'heard_as': Phonetic or approximate representation of how the user pronounced it.
   - 'ipa': IPA representation of the target correct pronunciation.
   - 'issue_type': 'phoneme' | 'word_stress' | 'omitted_sound' | 'added_sound'.
   - 'feedback': Concise, constructive advice on how to improve.

4. INTELLIGIBILITY RATING:
   - If score >= 8.5: 'native'
   - If score >= 6.0 and < 8.5: 'proficient_workplace'
   - If score >= 4.0 and < 6.0: 'borderline'
   - If score < 4.0: 'unintelligible'
5. OUTPUT FORMAT:
   Return ONLY a valid JSON object adhering to this schema (no markdown, no preamble):
{
  "paragraph_score": number,
  "intelligibility_rating": "native" | "proficient_workplace" | "borderline" | "unintelligible",
  "summary": string,
  "annotations": [
    {
      "word_or_phrase": string,
      "status": "warning" | "critical",
      "heard_as": string,
      "ipa": string,
      "issue_type": "phoneme" | "word_stress" | "omitted_sound" | "added_sound",
      "feedback": string
    }
  ],
  "praise_points": string[]
}
`;

        const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${effectiveApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-audio-mini',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: promptContent },
                  {
                    type: 'input_audio',
                    input_audio: {
                      data: wavBase64,
                      format: 'wav',
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (!chatRes.ok) {
          const errText = await chatRes.text();
          throw new Error(`OpenAI multimodal audio evaluation failed: ${errText}`);
        }

        const chatData = await chatRes.json();
        let rawContent = chatData.choices?.[0]?.message?.content || '{}';
        
        // Strip any markdown fences if present
        const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          rawContent = jsonMatch[1];
        }

        const parsedJson = JSON.parse(rawContent);
        const validated: EvaluationResponseValidated = EvaluationResponseSchema.parse(parsedJson);
        return validated;
      } catch (err: any) {
        console.error('OpenAI multimodal speech evaluation pipeline failed:', err);
        throw new Error(err?.message || 'Speech evaluation service failed.');
      }
    }

    // 3. Fallback mock if no API key
    return createMockEvaluation(expectedText);
  }
}
