import { getDb } from "@/lib/db";

export type PitchState = {
  pro: boolean;
  balance: number;
};

/** Balance and Pro flag for a signed-in user. Null when the pooler is unset. */
export async function getPitchState(userId: string): Promise<PitchState | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const rows = await getDb()<PitchState[]>`
      select pro, balance from private.pitch_state(${userId}::uuid)
    `;
    const row = rows[0];
    if (!row) return { pro: false, balance: 0 };
    return { pro: Boolean(row.pro), balance: Number(row.balance) || 0 };
  } catch {
    return null;
  }
}

/** Tell active Pro freelancers about a featured project. Best-effort. */
export async function featureJob(jobId: string) {
  if (!process.env.DATABASE_URL) return;
  await getDb()`select private.feature_job_and_alert(${jobId}::uuid)`;
}
