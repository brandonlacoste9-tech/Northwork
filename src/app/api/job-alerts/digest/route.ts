import { NextResponse } from "next/server";
import { runDailyDigest } from "@/lib/job-alerts";

export const dynamic = "force-dynamic";

async function digest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, reason: "not configured" }, { status: 503 });
  }
  try {
    const result = await runDailyDigest();
    return NextResponse.json({ ok: true, users: result?.users ?? 0 });
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
