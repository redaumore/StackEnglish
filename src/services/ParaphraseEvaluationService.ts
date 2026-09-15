import type {
  EvaluationRequest,
  EvaluationResult,
  TechCard,
} from '../types/techCard';
import { computeSM2 } from '../utils/sm2Paraphrase';
import { getEnvOpenAIApiKey } from '../utils/env';

const EVALUATOR_SYSTEM_PROMPT = `Eres un evaluador pedagógico experto en inglés técnico para ingenieros de software en transición del nivel B1 al B2.

Tu misión es calificar la transcripción de una respuesta oral brindada por el usuario al intentar parafrasear un modismo o consigna de desarrollo de software.  
No evalúes con severidad de hablante nativo; prioriza que la intención técnica sea comprensible y funcional. Sé tolerante con errores menores introducidos por el Speech-to-Text (STT).

PARAMETROS DE ENTRADA:  
- source_phrase: Consigna base que el usuario debía explicar.  
- model_answer: Respuesta modelo esperada.  
- forbidden_words: Array de términos o raíces prohibidas que el usuario no debía pronunciar.  
- user_transcript: Transcripción del audio del usuario.  
- speech_duration_seconds: Duración de la alocución en segundos.

DIMENSIONES DE EVALUACION (Escala 1.0 a 5.0):  
1. semanticEquivalence (Peso 40%): ¿Comunica con claridad la acción, el alcance y el objetivo técnico de la frase modelo?  
2. lexicalCompliance (Peso 20%): Asigna 5.0 si NO empleó ninguna de las palabras en forbidden_words (ni sus variantes directas). Si empleó una o más, califica severamente (1.0 a 2.5) y regístralas en repeatedForbiddenWords.  
3. grammarAndSyntax (Peso 25%): Evalúa concordancia, tiempos verbales, preposiciones de interfaz ("on the screen", no "in"), régimen verbal ("respond to") y falsos cognados de ortografía ("strange", no "extrange").  
4. vocabularyRange (Peso 15%): Empleo de vocabulario técnico contextual adecuado (peers, review, patch, issue) en lugar de muletillas simplistas.

REGLAS PARA LOS CAMPOS DE SALIDA:  
- overallScore: Cálculo ponderado: (semanticEquivalence * 0.40) + (lexicalCompliance * 0.20) + (grammarAndSyntax * 0.25) + (vocabularyRange * 0.15).  
- polishedSentence: Corrige la frase expresada por el usuario manteniendo sus propias palabras y estructura original en la medida de lo posible, resolviendo únicamente sus fallas gramaticales y preposicionales.  
- grammarBullets: Retorna máximo 2 observaciones atómicas, concisas y directas (ej: "Usá 'on the screen' (no 'in')", "Decí 'a strange' sin 'e' inicial").  
- paceCategory: "fast" si speech_duration_seconds < 8, "thoughtful" si está entre 8 y 18, "extended" si supera 18.

FORMATO DE RESPUESTA:  
Debes responder ESTRICTAMENTE en formato JSON válido, sin bloques de markdown adicionales ni texto fuera del esquema definido.
El esquema JSON requerido es:
{
  "scores": {
    "semanticEquivalence": number,
    "lexicalCompliance": number,
    "grammarAndSyntax": number,
    "vocabularyRange": number,
    "overallScore": number
  },
  "telemetry": {
    "durationSeconds": number,
    "paceCategory": "fast" | "thoughtful" | "extended"
  },
  "insights": {
    "meaningSummary": string,
    "repeatedForbiddenWords": string[],
    "grammarBullets": string[],
    "polishedSentence": string
  }
}`;

export class ParaphraseEvaluationService {
  /**
   * Transcribes speech audio using OpenAI Whisper API
   */
  public static async transcribeAudio(
    audioBlob: Blob,
    apiKey?: string
  ): Promise<string> {
    const effectiveKey = (apiKey || getEnvOpenAIApiKey())?.trim();
    if (!effectiveKey) {
      throw new Error('API Key is required for OpenAI Whisper transcription.');
    }

    const formData = new FormData();
    const file = new File([audioBlob], 'speech.wav', { type: 'audio/wav' });
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('prompt', 'Technical software development conversation, git, architecture, coding.');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${effectiveKey}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Whisper transcription failed: ${errText}`);
    }

    const data = await res.json();
    return data.text || '';
  }

  /**
   * Evaluates user paraphrase using the specified System Prompt and computes SM-2 update
   */
  public static async evaluateParaphrase(
    req: EvaluationRequest,
    card: TechCard,
    apiKey?: string
  ): Promise<EvaluationResult> {
    const effectiveKey = (apiKey || getEnvOpenAIApiKey())?.trim();

    if (!effectiveKey) {
      // Offline heuristic fallback evaluator
      return this.mockEvaluation(req, card);
    }

    const userPayload = {
      source_phrase: req.sourcePhrase,
      model_answer: req.modelAnswer,
      forbidden_words: req.forbiddenWords,
      user_transcript: req.userTranscript,
      speech_duration_seconds: req.speechDurationSeconds,
    };

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${effectiveKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: EVALUATOR_SYSTEM_PROMPT },
            {
              role: 'user',
              content: JSON.stringify(userPayload),
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });

      if (!res.ok) {
        const errorMsg = await res.text();
        console.warn('OpenAI evaluator API error, falling back to heuristic evaluation:', errorMsg);
        return this.mockEvaluation(req, card);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      // Verify and clamp scores
      const sem = Math.min(5, Math.max(1, Number(parsed.scores?.semanticEquivalence || 4.0)));
      const lex = Math.min(5, Math.max(1, Number(parsed.scores?.lexicalCompliance || 5.0)));
      const gram = Math.min(5, Math.max(1, Number(parsed.scores?.grammarAndSyntax || 4.0)));
      const voc = Math.min(5, Math.max(1, Number(parsed.scores?.vocabularyRange || 4.0)));
      const calculatedOverall = Number((sem * 0.4 + lex * 0.2 + gram * 0.25 + voc * 0.15).toFixed(2));

      const overall = Number(parsed.scores?.overallScore) || calculatedOverall;

      // Calculate SM-2 update
      const sm2Output = computeSM2(overall, {
        intervalDays: card.intervalDays,
        easeFactor: card.easeFactor,
        repetition: card.repetition,
      });

      return {
        cardId: req.cardId,
        scores: {
          semanticEquivalence: sem,
          lexicalCompliance: lex,
          grammarAndSyntax: gram,
          vocabularyRange: voc,
          overallScore: overall,
        },
        telemetry: {
          durationSeconds: req.speechDurationSeconds,
          paceCategory:
            req.speechDurationSeconds < 8
              ? 'fast'
              : req.speechDurationSeconds <= 18
              ? 'thoughtful'
              : 'extended',
        },
        insights: {
          meaningSummary:
            parsed.insights?.meaningSummary ||
            'You successfully explained the main technical intent of the prompt.',
          repeatedForbiddenWords: Array.isArray(parsed.insights?.repeatedForbiddenWords)
            ? parsed.insights.repeatedForbiddenWords
            : [],
          grammarBullets: Array.isArray(parsed.insights?.grammarBullets)
            ? parsed.insights.grammarBullets.slice(0, 2)
            : [],
          polishedSentence:
            parsed.insights?.polishedSentence ||
            req.userTranscript ||
            req.modelAnswer,
        },
        srsUpdate: sm2Output,
      };
    } catch (err) {
      console.error('ParaphraseEvaluationService failed, using heuristic evaluation:', err);
      return this.mockEvaluation(req, card);
    }
  }

  /**
   * Offline heuristic fallback evaluator
   */
  private static mockEvaluation(req: EvaluationRequest, card: TechCard): EvaluationResult {
    const transcript = req.userTranscript.toLowerCase();
    const repeated = req.forbiddenWords.filter((w) =>
      new RegExp(`\\b${w.toLowerCase()}\\b`, 'i').test(transcript)
    );

    const lexicalCompliance = repeated.length === 0 ? 5.0 : Math.max(1.0, 3.0 - repeated.length * 0.8);
    const wordsCount = transcript.split(/\s+/).filter(Boolean).length;
    const semanticEquivalence = wordsCount >= 5 ? 4.2 : 3.0;
    const grammarAndSyntax = 4.0;
    const vocabularyRange = 3.8;

    const overallScore = Number(
      (
        semanticEquivalence * 0.4 +
        lexicalCompliance * 0.2 +
        grammarAndSyntax * 0.25 +
        vocabularyRange * 0.15
      ).toFixed(2)
    );

    const sm2Output = computeSM2(overallScore, {
      intervalDays: card.intervalDays,
      easeFactor: card.easeFactor,
      repetition: card.repetition,
    });

    return {
      cardId: req.cardId,
      scores: {
        semanticEquivalence,
        lexicalCompliance,
        grammarAndSyntax,
        vocabularyRange,
        overallScore,
      },
      telemetry: {
        durationSeconds: req.speechDurationSeconds,
        paceCategory:
          req.speechDurationSeconds < 8
            ? 'fast'
            : req.speechDurationSeconds <= 18
            ? 'thoughtful'
            : 'extended',
      },
      insights: {
        meaningSummary:
          repeated.length === 0
            ? 'You conveyed the technical concept without using forbidden terms.'
            : `Restricted terms detected: ${repeated.join(', ')}. Try using descriptive synonyms next time.`,
        repeatedForbiddenWords: repeated,
        grammarBullets:
          repeated.length === 0
            ? ['Good pace and functional vocabulary selection.']
            : [`Avoid restricted words (${repeated.join(', ')}) by using descriptive phrasing.`],
        polishedSentence:
          req.userTranscript.length > 5
            ? req.userTranscript
            : req.modelAnswer,
      },
      srsUpdate: sm2Output,
    };
  }
}
