import { env } from '../config.js';
import { prisma } from './prisma.js';

interface OllamaEmbedResponse {
    embedding: number[];
}

interface OllamaGenerateResponse {
    response: string;
}

export interface ChunkIntent {
    label: string;
    description: string;
    confidence: number;
}

const INTENT_PROMPT_FALLBACK = `
You are a document analysis assistant.
Identify the intent(s) of the following text excerpt from a PDF document.
Return ONLY a valid JSON array. Each element must have:
- "label": short intent name, one of: definition, instruction, summary, question, example, warning, fact, conclusion, reference, other
- "description": one sentence describing what the chunk is about
- "confidence": number between 0 and 1

Text:
"""
{{text}}
"""
`.trim();

// Process-lifetime cache — prompts change rarely, no need to hit DB every chunk.
const promptCache = new Map<string, string>();

async function getPrompt(name: string, fallback: string): Promise<string> {
    if (promptCache.has(name)) return promptCache.get(name)!;

    const record = await prisma.prompt.findUnique({ where: { name } });
    const content = record?.content ?? fallback;
    promptCache.set(name, content);
    return content;
}

export async function embed(text: string): Promise<number[]> {
    const res = await fetch(`${env.OLLAMA_HOST}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: env.OLLAMA_MODEL, prompt: text }),
    });

    if (!res.ok) {
        throw new Error(`Ollama embed failed: ${res.status} ${await res.text()}`);
    }

    const { embedding } = await res.json() as OllamaEmbedResponse;
    return embedding;
}

export async function intentify(text: string): Promise<ChunkIntent[]> {
    const template = await getPrompt('intent-chunk', INTENT_PROMPT_FALLBACK);
    const prompt = template.replace('{{text}}', text);

    const res = await fetch(`${env.OLLAMA_HOST}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: env.OLLAMA_CHAT_MODEL,
            prompt,
            format: 'json',
            stream: false,
        }),
    });

    if (!res.ok) {
        throw new Error(`Ollama intentify failed: ${res.status} ${await res.text()}`);
    }

    const { response } = await res.json() as OllamaGenerateResponse;

    try {
        const parsed = JSON.parse(response);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}
