import type { Category } from '../types/srs';
import type { WordDefinition } from '../types/script';

export class DictionaryService {
  /**
   * Look up definition for a single word or expression.
   * 1. If single word, try free dictionary API.
   * 2. If phrase or not found, fallback to OpenAI if API key available or fallback heuristic.
   */
  public static async lookup(
    term: string,
    contextSentence?: string,
    openAIApiKey?: string,
    categoryHint?: Category
  ): Promise<WordDefinition> {
    const cleanedTerm = term.trim();
    if (!cleanedTerm) {
      throw new Error('Please provide a word or phrase to look up.');
    }

    const isSingleWord = !cleanedTerm.includes(' ') && /^[a-zA-Z-]+$/.test(cleanedTerm);

    if (isSingleWord) {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanedTerm.toLowerCase())}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const entry = data[0];
            const meaning = entry.meanings?.[0];
            const definitionObj = meaning?.definitions?.[0];
            
            return {
              term: cleanedTerm,
              phonetic: entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || '',
              partOfSpeech: meaning?.partOfSpeech || 'noun',
              definition: definitionObj?.definition || 'Definition not found.',
              exampleSentence: contextSentence || definitionObj?.example || `We need to consider ${cleanedTerm} in our architecture.`,
              suggestedCategory: categoryHint || 'Architecture Review',
            };
          }
        }
      } catch (err) {
        console.warn('Free dictionary lookup failed, falling back...', err);
      }
    }

    // If phrase or dictionary API failed, try OpenAI if API key is provided
    if (openAIApiKey && openAIApiKey.trim()) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAIApiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You are a software engineering English vocabulary assistant. Provide a concise, clear definition in professional English for the selected term or idiom in the given software engineering context. Return JSON only in this format: {"term": string, "definition": string, "partOfSpeech": string, "phonetic": string, "exampleSentence": string}',
              },
              {
                role: 'user',
                content: `Term: "${cleanedTerm}"\nContext Sentence: "${contextSentence || ''}"`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const parsed = JSON.parse(json.choices[0]?.message?.content || '{}');
          return {
            term: parsed.term || cleanedTerm,
            phonetic: parsed.phonetic || '',
            partOfSpeech: parsed.partOfSpeech || 'idiom / phrase',
            definition: parsed.definition || 'Technical phrase used in software engineering communication.',
            exampleSentence: contextSentence || parsed.exampleSentence || `Example using ${cleanedTerm}.`,
            suggestedCategory: categoryHint || 'Architecture Review',
          };
        }
      } catch (e) {
        console.warn('OpenAI definition lookup failed:', e);
      }
    }

    // Default Fallback
    return {
      term: cleanedTerm,
      phonetic: '',
      partOfSpeech: isSingleWord ? 'term' : 'phrase',
      definition: `Contextual meaning of "${cleanedTerm}" in engineering discourse.`,
      exampleSentence: contextSentence || `Let's discuss how "${cleanedTerm}" impacts our roadmap.`,
      suggestedCategory: categoryHint || 'Standup / Follow-up',
    };
  }
}
