import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/job-alerts";

export const dynamic = "force-dynamic";

async function digest(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const result = await runDailyDigest();
    if (!result.configured) {
      return NextResponse.json({ ok: false, reason: "not configured" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, users: result.users });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export function GET(request: Request) {
  return digest(request);
}

export function POST(request: Request) {
  return digest(request);
}
