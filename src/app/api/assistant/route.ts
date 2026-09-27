import { NextResponse } from "next/server";
import {
  ASSISTANT_KNOWLEDGE_EN,
  ASSISTANT_KNOWLEDGE_FR,
} from "@/lib/assistant-knowledge";

export const dynamic = "force-dynamic";

const MODEL_URL = "https://api.x.ai/v1/chat/completions";
const MODEL = "grok-4.20-non-reasoning";

// Simple in-memory throttle: 30 questions per IP per hour.
const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const list = (hits.get(ip) ?? []).filter((t) => t > windowStart);
  list.push(now);
  hits.set(ip, list);
  return list.length > 30;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        reply:
          "The assistant is not connected yet — please check back soon. / L'assistant n'est pas encore connecté — revenez bientôt.",
      },
      { status: 503 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (throttled(ip)) {
    return NextResponse.json(
      { reply: "Too many questions at once — please try again in a bit. / Trop de questions à la fois — réessayez dans un moment." },
      { status: 429 },
    );
  }

  let body: { messages?: ChatMessage[]; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const history = (body.messages ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
    .slice(-10);
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const knowledge =
    body.locale === "fr" ? ASSISTANT_KNOWLEDGE_FR : ASSISTANT_KNOWLEDGE_EN;

  try {
    const res = await fetch(MODEL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        temperature: 0.4,
        messages: [{ role: "system", content: knowledge }, ...history],
      }),
    });
    if (!res.ok) {
      throw new Error(`assistant upstream ${res.status}`);
    }
    const data = await res.json();
    const reply: string =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I could not answer that. / Désolé, je n'ai pas pu répondre.";
    return NextResponse.json({ reply: reply.slice(0, 2000) });
  } catch {
    return NextResponse.json(
      {
        reply:
          "Something went wrong on my side — please try again. / Un problème est survenu — réessayez.",
      },
      { status: 502 },
    );
  }
}
