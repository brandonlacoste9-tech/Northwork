"use client";

import { useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const STR = {
  en: {
    title: "Ask Northernwork",
    subtitle: "Questions about pitches, pricing, escrow…",
    placeholder: "Ask a question…",
    welcome:
      "Hi! I can answer questions about how Northernwork works — pitches, Pro, escrow, hiring. What would you like to know?",
    suggestions: [
      "How do pitches work?",
      "What does Pro cost?",
      "How does escrow work?",
    ],
    error: "Something went wrong — please try again.",
  },
  fr: {
    title: "Questions sur Northernwork",
    subtitle: "Offres, prix, séquestre…",
    placeholder: "Posez votre question…",
    welcome:
      "Bonjour! Je peux répondre à vos questions sur Northernwork — offres, Pro, séquestre, embauche. Que voulez-vous savoir?",
    suggestions: [
      "Comment fonctionnent les offres?",
      "Combien coûte Pro?",
      "Comment fonctionne le séquestre?",
    ],
    error: "Un problème est survenu — réessayez.",
  },
} as const;

export function AiAssistant({ locale }: { locale: "en" | "fr" }) {
  const t = STR[locale] ?? STR.en;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: t.welcome },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    scrollDown();
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-10), locale }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        { role: "assistant", content: String(data.reply ?? t.error) },
      ]);
    } catch {
      setMessages([...next, { role: "assistant", content: t.error }]);
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div className="flex h-[480px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {t.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <p
                  className={
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 " +
                    (m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted")
                  }
                >
                  {m.content}
                </p>
              </div>
            ))}
            {busy ? (
              <div className="flex justify-start">
                <p className="rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                  …
                </p>
              </div>
            ) : null}
          </div>
          <div className="border-t px-3 pb-2 pt-2">
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {t.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={busy}
                  className="shrink-0 rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.placeholder}
                maxLength={500}
                className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid h-13 w-13 place-items-center rounded-full bg-primary p-3.5 text-primary-foreground shadow-xl hover:opacity-90"
        aria-label={t.title}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
