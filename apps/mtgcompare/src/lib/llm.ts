// Generic short-text LLM generation, provider-agnostic. Claude (Anthropic) if a
// key is set, else Google Gemini's free tier, else null — callers always have a
// rule-based fallback so nothing user-facing depends on a key being present.
// Used by the trade-roast endpoint.
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
// Override to a cheaper model via env if cost ever matters more than quality.
const ANTHROPIC_MODEL = process.env.LLM_MODEL ?? "claude-opus-4-8";

// Google Gemini — free tier, no credit card (aistudio.google.com).
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export function llmEnabled(): boolean {
  return Boolean(ANTHROPIC_KEY || GEMINI_KEY);
}

async function callClaude(system: string, user: string): Promise<string | null> {
  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const res = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 220,
      // Adaptive thinking + low effort: the outputs here are one-liners, so spend
      // as little as possible while letting the model think when it helps.
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}

async function callGemini(system: string, user: string): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 220, temperature: 1.0 },
      }),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("").trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function llmText(system: string, user: string): Promise<string | null> {
  if (ANTHROPIC_KEY) return callClaude(system, user);
  if (GEMINI_KEY) return callGemini(system, user);
  return null;
}
