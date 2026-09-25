"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReview } from "@/lib/actions";
import { cn } from "cn";

export function ReviewForm({ jobId }: { jobId: string }) {
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("rating", String(rating));
    setPending(true);
    setError(null);
    const result = await createReview(jobId, formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4 border-t pt-8">
      <h2 className="font-heading text-2xl">Leave a review</h2>
      <p className="text-sm text-muted-foreground">
        The project is closed. You can leave one review.
      </p>
      <div className="grid gap-2">
        <Label id="rating-label">Rating</Label>
        <div className="flex gap-1" role="radiogroup" aria-labelledby="rating-label">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              onClick={() => setRating(value)}
              className="rounded-md p-1 hover:bg-muted"
            >
              <Star
                className={cn(
                  "size-6",
                  value <= rating ? "fill-primary text-primary" : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="comment">Comment</Label>
        <Textarea id="comment" name="comment" rows={4} placeholder="What was the work like?" />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="h-11 px-5 sm:w-fit">
        {pending ? "Saving…" : "Publish review"}
      </Button>
    </form>
  );
}

export function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn(
            "size-4",
            value <= Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground"
          )}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
