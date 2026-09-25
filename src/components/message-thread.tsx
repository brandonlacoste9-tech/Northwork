"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage, type ThreadMessage } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "cn";

export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: ThreadMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as ThreadMessage;
          if (!row?.id) return;
          setMessages((current) =>
            current.some((message) => message.id === row.id)
              ? current
              : [...current, row]
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setPending(true);
    const result = await sendMessage(conversationId, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.message) {
      setMessages((current) =>
        current.some((message) => message.id === result.message.id)
          ? current
          : [...current, result.message]
      );
    }
    form.reset();
  }

  return (
    <div className="flex min-h-[60vh] flex-col">
      <ol className="flex flex-1 flex-col gap-3" aria-live="polite">
        {messages.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            No messages yet. Say hello and agree the work in writing.
          </li>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === currentUserId;
            return (
              <li
                key={message.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-6 break-words sm:max-w-[70%]",
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      mine ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {new Date(message.created_at).toLocaleString("en-CA", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ol>
      <div ref={bottom} />
      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <label htmlFor="body" className="text-sm font-medium">
          Message
        </label>
        <Textarea
          id="body"
          name="body"
          required
          maxLength={5000}
          rows={3}
          placeholder="Write in plain language. Keep it about the work in Canada."
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="h-11 w-full px-5 sm:w-fit">
          {pending ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
