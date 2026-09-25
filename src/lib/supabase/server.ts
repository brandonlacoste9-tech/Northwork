import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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
    env("NEXT_PUBLIC_SUPABASE_URL"),
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
