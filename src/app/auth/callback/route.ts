import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/backend";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function publicOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return `https://${forwardedHost}`;
  }
  const host = request.headers.get("host");
  if (host && !host.startsWith("0.0.0.0")) {
    return `${url.protocol}//${host}`;
  }
  if (url.hostname === "0.0.0.0") {
    return `${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ""}`;
  }
  return url.origin;
}

/** PKCE return path for Supabase OAuth. Email confirmation is unchanged. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
  const next = safeNext(searchParams.get("next"));

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=google`);
}
