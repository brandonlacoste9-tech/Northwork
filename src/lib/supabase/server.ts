import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey } from "@/lib/backend";

function supabaseUrl(): string {
  // Static access (not process.env[name]) so Next.js inlines the value
  // into client bundles at build time.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local and fill in your Supabase project values."
    );
  }
  return url;
}

/** Supabase client for Server Components, Server Actions, and Route Handlers. */
export async function createClient() {
  const cookieStore = await cookies();
  const key = supabasePublishableKey();
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill in your Supabase project values."
    );
  }
  return createServerClient(
    supabaseUrl(),
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookies are read-only there.
            // Session refresh is handled by src/proxy.ts instead.
          }
        },
      },
    }
  );
}
