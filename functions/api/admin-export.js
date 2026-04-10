import { unauthorized, isAuthorized } from "../_lib/auth.js";
import { ensureSchema } from "../_lib/db.js";

function toCsvCell(value) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorized();
  if (!env.DB) {
    return new Response("DB binding missing", { status: 500 });
  }

  await ensureSchema(env.DB);

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") || "marketing";
  const where = scope === "all" ? "" : "WHERE marketing_opt_in = 1";

  const rows = await env.DB.prepare(`
    SELECT email, marketing_opt_in, latest_result_code, latest_result_name, submission_count, first_seen_at, last_seen_at
    FROM leads
    ${where}
    ORDER BY last_seen_at DESC
  `).all();

  const header = [
    "email",
    "marketing_opt_in",
    "latest_result_code",
    "latest_result_name",
    "submission_count",
    "first_seen_at",
    "last_seen_at",
  ];

  const lines = [
    header.map(toCsvCell).join(","),
    ...(rows.results || []).map((row) =>
      [
        row.email,
        row.marketing_opt_in,
        row.latest_result_code,
        row.latest_result_name,
        row.submission_count,
        row.first_seen_at,
        row.last_seen_at,
      ].map(toCsvCell).join(",")
    ),
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sbti-leads-${scope}.csv"`,
    },
  });
}
