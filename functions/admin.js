import { unauthorized, isAuthorized } from "./_lib/auth.js";

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SBTI Admin</title>
  <script src="/js/questions.js"></script>
  <style>
    :root {
      --bg: #f5f8f5;
      --card: #ffffff;
      --text: #18311f;
      --muted: #66756b;
      --line: #d9e5da;
      --accent: #4d6a53;
      --soft: #eef5ef;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Noto Sans Thai", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text);
      background: var(--bg);
    }
    .shell {
      max-width: 1160px;
      margin: 0 auto;
      padding: 24px 16px 48px;
    }
    h1, h2, h3, p { margin: 0; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 18px;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 6px 10px;
      border: 1px solid var(--line);
      background: var(--soft);
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
    }
    .metric {
      font-size: 32px;
      font-weight: 800;
      color: var(--accent);
      margin-top: 8px;
    }
    .section {
      margin-top: 18px;
    }
    .toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    a.button, button.button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: white;
      color: var(--accent);
      padding: 10px 14px;
      font: inherit;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      font-size: 14px;
    }
    th {
      color: var(--muted);
      font-weight: 700;
      background: #fafcfa;
    }
    .muted { color: var(--muted); }
    .question-card {
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 14px;
      background: #fff;
      margin-top: 12px;
    }
    .option-row {
      display: grid;
      grid-template-columns: 1fr 120px;
      gap: 12px;
      margin-top: 8px;
      align-items: center;
    }
    .bar-wrap {
      position: relative;
      height: 10px;
      border-radius: 999px;
      overflow: hidden;
      background: #edf3ee;
      margin-top: 6px;
    }
    .bar {
      height: 100%;
      background: linear-gradient(90deg, #8fb298, #4d6a53);
    }
    @media (max-width: 860px) {
      .grid { grid-template-columns: 1fr; }
      .option-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="header">
      <div>
        <div class="eyebrow">Owner Only</div>
        <h1>SBTI Dashboard</h1>
        <p class="muted" style="margin-top:8px;">看结果占比、选项占比、邮箱线索。这里只能通过 Basic Auth 访问。</p>
      </div>
      <div class="toolbar">
        <a class="button" href="/api/admin-export?scope=marketing">导出已授权邮箱 CSV</a>
        <a class="button" href="/api/admin-export?scope=all">导出全部邮箱 CSV</a>
      </div>
    </div>

    <div class="grid" id="overview"></div>

    <div class="section card">
      <h2>结果占比</h2>
      <table id="resultTable"></table>
    </div>

    <div class="section card">
      <h2>选项占比</h2>
      <div id="optionStats"></div>
    </div>

    <div class="section card">
      <h2>最新线索</h2>
      <table id="leadTable"></table>
    </div>
  </div>

  <script>
    const questionMeta = new Map();
    [...QUESTIONS, ...GATE_QUESTIONS].forEach((q) => {
      questionMeta.set(q.id, q);
    });

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function renderOverview(overview) {
      const items = [
        ["提交总数", overview.submissions],
        ["唯一邮箱", overview.uniqueLeads],
        ["同意后续邮件", overview.marketingLeads],
      ];
      document.getElementById("overview").innerHTML = items.map(([label, value]) => \`
        <div class="card">
          <div class="muted">\${label}</div>
          <div class="metric">\${value}</div>
        </div>
      \`).join("");
    }

    function renderResultTable(results, total) {
      const rows = results.map((row) => {
        const pct = total ? ((row.count / total) * 100).toFixed(1) : "0.0";
        return \`<tr><td><strong>\${escapeHtml(row.code)}</strong></td><td>\${escapeHtml(row.name || "")}</td><td>\${row.count}</td><td>\${pct}%</td></tr>\`;
      }).join("");
      document.getElementById("resultTable").innerHTML = \`
        <thead><tr><th>Code</th><th>Name</th><th>Count</th><th>Share</th></tr></thead>
        <tbody>\${rows}</tbody>
      \`;
    }

    function renderOptionStats(optionRows) {
      const grouped = new Map();
      optionRows.forEach((row) => {
        if (!grouped.has(row.question_id)) grouped.set(row.question_id, []);
        grouped.get(row.question_id).push(row);
      });

      const html = [...grouped.entries()].map(([questionId, rows]) => {
        const meta = questionMeta.get(questionId);
        const total = rows.reduce((sum, row) => sum + row.count, 0);
        const optionMap = new Map((meta?.options || []).map((opt) => [Number(opt.value), opt.text]));
        const optionsHtml = rows.map((row) => {
          const pct = total ? ((row.count / total) * 100).toFixed(1) : "0.0";
          const label = optionMap.get(Number(row.option_value)) || \`Option \${row.option_value}\`;
          return \`
            <div class="option-row">
              <div>
                <div><strong>\${escapeHtml(label)}</strong></div>
                <div class="bar-wrap"><div class="bar" style="width:\${pct}%"></div></div>
              </div>
              <div class="muted">\${row.count} · \${pct}%</div>
            </div>
          \`;
        }).join("");

        return \`
          <div class="question-card">
            <div class="muted">\${escapeHtml(questionId)}</div>
            <h3 style="margin-top:6px;">\${escapeHtml(meta?.text || questionId)}</h3>
            \${optionsHtml}
          </div>
        \`;
      }).join("");

      document.getElementById("optionStats").innerHTML = html;
    }

    function renderLeads(leads) {
      const rows = leads.map((lead) => \`
        <tr>
          <td>\${escapeHtml(lead.email)}</td>
          <td>\${lead.marketing_opt_in ? "Yes" : "No"}</td>
          <td>\${escapeHtml(lead.latest_result_code || "")}</td>
          <td>\${lead.submission_count}</td>
          <td>\${escapeHtml(lead.last_seen_at || "")}</td>
        </tr>
      \`).join("");

      document.getElementById("leadTable").innerHTML = \`
        <thead><tr><th>Email</th><th>Marketing</th><th>Latest Result</th><th>Times</th><th>Last Seen</th></tr></thead>
        <tbody>\${rows}</tbody>
      \`;
    }

    fetch("/api/admin-summary", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((data) => {
        renderOverview(data.overview);
        renderResultTable(data.results, data.overview.submissions);
        renderOptionStats(data.options);
        renderLeads(data.leads);
      })
      .catch((err) => {
        document.body.innerHTML = '<div class="shell"><div class="card"><h2>加载失败</h2><p class="muted" style="margin-top:10px;">' + escapeHtml(err.message || String(err)) + '</p></div></div>';
      });
  </script>
</body>
</html>`;

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return unauthorized();
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
