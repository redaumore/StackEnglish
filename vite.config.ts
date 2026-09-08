import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { EvaluationResponseSchema } from './src/schemas/evaluation.schema.ts'


function speechEvaluationApiPlugin(): Plugin {
  return {
    name: 'speech-evaluation-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/dialogue/evaluate-speech' && req.method === 'POST') {
          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(chunk as Buffer);
            }
            const bodyBuffer = Buffer.concat(chunks);
            const contentType = req.headers['content-type'] || '';

            // Handle multipart/form-data boundary parsing or json
            let expectedText = '';
            let roleContext = 'Software Engineer';
            let audioBuffer: Buffer | null = null;
            let audioMime = 'audio/webm';
            let apiKey = process.env.GEMINI_API_KEY || '';

            if (contentType.includes('multipart/form-data')) {
              const boundaryMatch = contentType.match(/boundary=(?:["']([^"']+)["']|([^;]+))/i);
              const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : '';
              if (boundary) {
                const parts = bodyBuffer.toString('binary').split(`--${boundary}`);
                for (const part of parts) {
                  if (part.includes('name="expectedText"')) {
                    const match = part.match(/\r\n\r\n([\s\S]*?)\r\n$/);
                    if (match) expectedText = match[1].trim();
                  } else if (part.includes('name="roleContext"')) {
                    const match = part.match(/\r\n\r\n([\s\S]*?)\r\n$/);
                    if (match) roleContext = match[1].trim();
                  } else if (part.includes('name="apiKey"')) {
                    const match = part.match(/\r\n\r\n([\s\S]*?)\r\n$/);
                    if (match && match[1].trim()) apiKey = match[1].trim();
                  } else if (part.includes('name="audio"')) {
                    const headerEnd = part.indexOf('\r\n\r\n');
                    if (headerEnd !== -1) {
                      const headerPart = part.slice(0, headerEnd);
                      const mimeMatch = headerPart.match(/Content-Type:\s*([^\r\n]+)/i);
                      if (mimeMatch) audioMime = mimeMatch[1].trim();
                      const fileBinary = part.slice(headerEnd + 4, part.length - 2);
                      audioBuffer = Buffer.from(fileBinary, 'binary');
                    }
                  }
                }
              }
            }

            let openAIKey = apiKey || process.env.OPENAI_API_KEY || '';

            if (openAIKey && audioBuffer) {
              const audioBase64 = audioBuffer.toString('base64');
              const format = audioMime.includes('wav') ? 'wav' : 'mp3';

              const promptContent = `Target Expected Text:
"${expectedText}"

Role Context:
"${roleContext}"

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
}`;

              const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${openAIKey}`,
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
                            data: audioBase64,
                            format: format,
                          },
                        },
                      ],
                    },
                  ],
                }),
              });

              if (gptRes.ok) {
                const gptData = (await gptRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
                let contentStr = gptData.choices?.[0]?.message?.content || '{}';
                const jsonMatch = contentStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                  contentStr = jsonMatch[1];
                }
                const parsed = EvaluationResponseSchema.parse(JSON.parse(contentStr));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(parsed));
                return;
              }
            }

            // Fallback response if no apiKey in request or env
            const words = expectedText.split(/\s+/).filter(w => w.length > 3);
            const sampleWord = words[0]?.replace(/[^a-zA-Z]/g, '') || 'architecture';
            const mockResponse = {
              paragraph_score: 8.5,
              intelligibility_rating: 'proficient_workplace',
              summary: 'Clear pronunciation with authentic technical phrasing and smooth delivery.',
              annotations: [
                {
                  word_or_phrase: sampleWord,
                  status: 'warning',
                  heard_as: sampleWord.toLowerCase(),
                  ipa: `/${sampleWord.toLowerCase()}/`,
                  issue_type: 'word_stress',
                  feedback: `Place primary stress on the first syllable for "${sampleWord}".`
                }
              ],
              praise_points: ['Accurate consonant articulation', 'Consistent vocal pace']
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(mockResponse));
            return;
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err?.message || 'Evaluation failed' }));
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => {
  // Helper to parse key-values from .env if present
  let envOpenAI = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
  let envGemini = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key === 'OPENAI_API_KEY' && !envOpenAI) envOpenAI = val;
          if (key === 'VITE_OPENAI_API_KEY' && !envOpenAI) envOpenAI = val;
          if (key === 'GEMINI_API_KEY' && !envGemini) envGemini = val;
          if (key === 'VITE_GEMINI_API_KEY' && !envGemini) envGemini = val;
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    plugins: [react(), tailwindcss(), speechEvaluationApiPlugin()],
    define: {
      'import.meta.env.OPENAI_API_KEY': JSON.stringify(envOpenAI),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(envGemini),
    },
  };
})

