import { unauthorized, isAuthorized } from "../_lib/auth.js";
import { ensureSchema } from "../_lib/db.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorized();
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "DB binding missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  await ensureSchema(env.DB);

  const [submissionCount, uniqueLeads, marketingLeads, resultRows, optionRows, latestLeads] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS count FROM submissions`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM leads`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM leads WHERE marketing_opt_in = 1`).first(),
    env.DB.prepare(`SELECT code, name, count FROM result_stats ORDER BY count DESC, code ASC`).all(),
    env.DB.prepare(`SELECT question_id, option_value, count FROM option_stats ORDER BY question_id ASC, option_value ASC`).all(),
    env.DB.prepare(`
      SELECT email, marketing_opt_in, latest_result_code, latest_result_name, submission_count, first_seen_at, last_seen_at
      FROM leads
      ORDER BY last_seen_at DESC
      LIMIT 200
    `).all(),
  ]);

  return new Response(JSON.stringify({
    overview: {
      submissions: submissionCount?.count || 0,
      uniqueLeads: uniqueLeads?.count || 0,
      marketingLeads: marketingLeads?.count || 0,
    },
    results: resultRows.results || [],
    options: optionRows.results || [],
    leads: latestLeads.results || [],
  }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
