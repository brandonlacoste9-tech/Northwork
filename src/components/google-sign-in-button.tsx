"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Starts Google sign-in. Email and password stay on the same page. */
export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={pending}
        onClick={onClick}
      >
        {pending ? "Redirecting to Google…" : "Continue with Google"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
