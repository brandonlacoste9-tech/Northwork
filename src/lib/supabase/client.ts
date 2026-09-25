import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey } from "@/lib/backend";

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your Supabase project values.`
    );
  }
  return value;
}

/** Supabase client for Client Components (browser). */
export function createClient() {
  const key = supabasePublishableKey();
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill in your Supabase project values."
    );
  }
  return createBrowserClient(env("NEXT_PUBLIC_SUPABASE_URL"), key);
}
