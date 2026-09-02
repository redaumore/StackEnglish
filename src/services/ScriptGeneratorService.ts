import type { ConversationScript, GenerateScriptParams, ScriptCharacter } from '../types/script';
import { SEED_SCRIPTS } from '../data/seedScripts';

export class ScriptGeneratorService {
  /**
   * Generates a new script via OpenAI API or falls back to tailored seed templates.
   */
  public static async generateScript(
    params: GenerateScriptParams,
    apiKey?: string
  ): Promise<ConversationScript> {
    if (!apiKey || !apiKey.trim()) {
      // Offline fallback: find matching seed or synthesize tailored template
      const matchingSeed = SEED_SCRIPTS.find((s) => s.category === params.category);
      if (matchingSeed) {
        return {
          ...matchingSeed,
          id: 'script-custom-' + Date.now(),
          title: `${params.topic} (${params.category})`,
          createdAt: new Date().toISOString(),
        };
      }
      return {
        ...SEED_SCRIPTS[0],
        id: 'script-custom-' + Date.now(),
        title: `${params.topic}`,
        category: params.category,
        createdAt: new Date().toISOString(),
      };
    }

    const systemPrompt = `You are a Principal Software Architect and Technical Communication Coach.
Generate a realistic, high-level English dialogue script for a workplace scenario between software engineering professionals (e.g. Architect, Tech Lead, Senior Developer, SRE, Product Manager).
Include rich, authentic idiomatic technical English (e.g., "trade-offs", "push back", "cascading failure", "ballpark estimate", "eventual consistency", "technical debt", "bottleneck", "sanity check").

Respond with STRICT JSON in the following schema:
{
  "title": string,
  "topic": string,
  "category": "Kick-off" | "Standup / Follow-up" | "Scope Negotiation" | "Architecture Review" | "Post-Mortem",
  "contextDescription": string,
  "characters": [
    {
      "id": "char-user",
      "name": "${params.userRole}",
      "role": "${params.userRole}",
      "avatarColor": "bg-indigo-600",
      "voice": "alloy"
    },
    {
      "id": "char-peer",
      "name": "${params.interlocutorRole}",
      "role": "${params.interlocutorRole}",
      "avatarColor": "bg-emerald-600",
      "voice": "nova"
    }
  ],
  "lines": [
    {
      "id": "l-1",
      "characterId": "char-peer" | "char-user",
      "text": "dialogue text in natural professional English",
      "notes": "pronunciation or tone guidance"
    }
  ]
}
Generate between 5 to 8 total dialogue turns.`;

    const userContent = `Scenario Requirements:
- Topic: ${params.topic}
- Category: ${params.category}
- User Role: ${params.userRole}
- Counterpart Role: ${params.interlocutorRole}
- Difficulty: ${params.difficulty || 'advanced'}
- Situation details: ${params.situationDetails || 'A technical discussion involving trade-offs and decision making.'}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      let msg = `OpenAI API error (${response.status})`;
      try {
        const err = await response.json();
        if (err?.error?.message) msg = err.error.message;
      } catch {
        // fallback
      }
      throw new Error(msg);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0]?.message?.content || '{}');

    const characters: ScriptCharacter[] = (parsed.characters || []).map((c: any, index: number) => ({
      id: c.id || `char-${index + 1}`,
      name: c.name || `Speaker ${index + 1}`,
      role: c.role || 'Software Engineer',
      avatarColor: c.avatarColor || (index === 0 ? 'bg-indigo-600' : 'bg-emerald-600'),
      voice: c.voice || (index === 0 ? 'alloy' : 'nova'),
    }));

    const lines = (parsed.lines || []).map((l: any, index: number) => ({
      id: l.id || `line-${index + 1}`,
      characterId: l.characterId || characters[index % characters.length].id,
      text: l.text || '',
      notes: l.notes,
    }));

    return {
      id: 'script-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: parsed.title || params.topic,
      topic: parsed.topic || params.topic,
      category: parsed.category || params.category,
      contextDescription: parsed.contextDescription || 'Engineering dialogue practice.',
      characters,
      lines,
      userRoleCharacterId: characters[0]?.id,
      createdAt: new Date().toISOString(),
    };
  }
}
