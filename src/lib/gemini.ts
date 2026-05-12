import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./system-prompt";

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY ?? "",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function getChatCompletion(
  history: ChatMessage[]
): Promise<string> {
  const start = Date.now();
  const response = await client.chat.completions.create({
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    max_tokens: 1000,
  });
  console.log(`[llm] Gemini respondió en ${Date.now() - start}ms`);
  return response.choices[0]?.message?.content ?? "";
}
