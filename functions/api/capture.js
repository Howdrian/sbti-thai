import { ensureSchema } from "../_lib/db.js";

function badRequest(message) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "DB binding missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  await ensureSchema(env.DB);

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("invalid json");
  }

  const email = String(body.email || "").trim().toLowerCase();
  const resultCode = String(body.resultCode || "").trim();
  const resultName = String(body.resultName || "").trim();
  const answers = body.answers && typeof body.answers === "object" ? body.answers : null;
  const rawScores = body.rawScores && typeof body.rawScores === "object" ? body.rawScores : {};
  const levels = body.levels && typeof body.levels === "object" ? body.levels : {};
  const marketingOptIn = body.marketingOptIn ? 1 : 0;
  const createdAt = body.createdAt || new Date().toISOString();

  if (!isValidEmail(email)) return badRequest("invalid email");
  if (!resultCode) return badRequest("missing resultCode");
  if (!answers) return badRequest("missing answers");

  const answerEntries = Object.entries(answers)
    .map(([questionId, optionValue]) => [String(questionId), Number(optionValue)])
    .filter(([, optionValue]) => Number.isFinite(optionValue));

  const statements = [
    env.DB.prepare(`
      INSERT INTO submissions (
        email, marketing_opt_in, result_code, result_name, answers_json, raw_scores_json, levels_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      email,
      marketingOptIn,
      resultCode,
      resultName,
      JSON.stringify(answers),
      JSON.stringify(rawScores),
      JSON.stringify(levels),
      createdAt
    ),
    env.DB.prepare(`
      INSERT INTO leads (
        email, first_seen_at, last_seen_at, marketing_opt_in, latest_result_code, latest_result_name, submission_count
      ) VALUES (?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(email) DO UPDATE SET
        last_seen_at = excluded.last_seen_at,
        marketing_opt_in = MAX(leads.marketing_opt_in, excluded.marketing_opt_in),
        latest_result_code = excluded.latest_result_code,
        latest_result_name = excluded.latest_result_name,
        submission_count = leads.submission_count + 1
    `).bind(email, createdAt, createdAt, marketingOptIn, resultCode, resultName),
    env.DB.prepare(`
      INSERT INTO result_stats (code, name, count)
      VALUES (?, ?, 1)
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        count = result_stats.count + 1
    `).bind(resultCode, resultName),
  ];

  for (const [questionId, optionValue] of answerEntries) {
    statements.push(
      env.DB.prepare(`
        INSERT INTO option_stats (question_id, option_value, count)
        VALUES (?, ?, 1)
        ON CONFLICT(question_id, option_value) DO UPDATE SET
          count = option_stats.count + 1
      `).bind(questionId, optionValue)
    );
  }

  await env.DB.batch(statements);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
