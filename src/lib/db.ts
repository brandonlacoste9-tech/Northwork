import postgres from "postgres";

let sql: ReturnType<typeof postgres> | undefined;

/**
 * Session-pooler connection for writes the signed-in user cannot make,
 * such as webhook status updates. Never import this from a Client Component.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set, so escrow status cannot be saved."
    );
  }
  if (!sql) sql = postgres(url, { ssl: "require", max: 1 });
  return sql;
}
