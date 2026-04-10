let schemaReady = false;

export async function ensureSchema(db) {
  if (schemaReady) return;

  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        marketing_opt_in INTEGER NOT NULL DEFAULT 0,
        result_code TEXT NOT NULL,
        result_name TEXT,
        answers_json TEXT NOT NULL,
        raw_scores_json TEXT,
        levels_json TEXT,
        created_at TEXT NOT NULL
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS leads (
        email TEXT PRIMARY KEY,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        marketing_opt_in INTEGER NOT NULL DEFAULT 0,
        latest_result_code TEXT,
        latest_result_name TEXT,
        submission_count INTEGER NOT NULL DEFAULT 1
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS result_stats (
        code TEXT PRIMARY KEY,
        name TEXT,
        count INTEGER NOT NULL DEFAULT 0
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS option_stats (
        question_id TEXT NOT NULL,
        option_value INTEGER NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (question_id, option_value)
      )
    `),
  ]);

  schemaReady = true;
}
