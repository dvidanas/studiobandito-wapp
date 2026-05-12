import { SYSTEM_PROMPT } from "./system-prompt";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function getChatCompletion(
  history: ChatMessage[]
): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const apiKey = process.env.GEMINI_API_KEY!;
  console.log("[llm] usando modelo:", model);

  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: "INSTRUCCIONES DEL SISTEMA:\n" + SYSTEM_PROMPT }] },
          { role: "model", parts: [{ text: "Entendido." }] },
          ...history.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        ],
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body}`);
  }

  const json = await res.json();
  console.log(`[llm] Gemini respondió en ${Date.now() - start}ms`);
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
