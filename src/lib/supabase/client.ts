import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey } from "@/lib/backend";

function supabaseUrl(): string {
  // Static access (not process.env[name]): Next.js inlines NEXT_PUBLIC_*
  // into the client bundle at build time; a dynamic key would read undefined.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local and fill in your Supabase project values."
    );
  }
  return url;
}

/** Supabase client for Client Components (browser). */
export function createClient() {
  const key = supabasePublishableKey();
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill in your Supabase project values."
    );
  }
  return createBrowserClient(supabaseUrl(), key);
}
