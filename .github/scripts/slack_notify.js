#!/usr/bin/env node
// Send a labeled Slack summary; link to the run page where screenshots artifact lives.

import fs from "node:fs";
import { promises as fsp } from "node:fs";

function tagsFromReasons(reasons = []) {
  const t = new Set();
  for (const r of reasons) {
    if (/^img>?=/.test(r)) t.add("IMG");
    if (/^html>?=/.test(r)) t.add("HTML");
    if (r.includes("name-edit")) t.add("NAME");
    if (r.includes("has-MX")) t.add("MX");
    if (r.includes("age≤")) t.add("NEW");
    if (r.includes("path-200")) t.add("PATH");
    if (r.includes("risky-name")) t.add("KEYWORD");
    if (r.includes("known-bad")) t.add("OVERRIDE");
  }
  return [...t];
}

(async () => {
  const webhook = (process.env.SLACK_WEBHOOK_URL || "").trim();
  if (!webhook) { console.error("SLACK_WEBHOOK_URL is empty"); process.exit(1); }

  const findingsFile = fs.existsSync("findings_enriched.json") ? "findings_enriched.json"
                      : fs.existsSync("findings.json")          ? "findings.json"
                      : null;
  if (!findingsFile) { console.log("No findings file; nothing to send."); return; }

  const items = JSON.parse(await fsp.readFile(findingsFile, "utf8"));
  const manifest = fs.existsSync("snapshots_manifest.json")
    ? JSON.parse(await fsp.readFile("snapshots_manifest.json","utf8"))
    : [];
  const shots = new Map(manifest.map(m => [m.domain, m]));

  // Link to this run (users can click into Artifacts -> dnstwist-snaps)
  const runUrl = process.env.RUN_URL
    || `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

  const lines = items.slice(0, 20).map((it) => {
    const parts = [];
    if (it.html_similarity != null) parts.push(`HTML ${it.html_similarity}%`);
    if (it.image_similarity != null) parts.push(`pHash ${it.image_similarity}%`);

    const tags = tagsFromReasons(it.reasons || []);
    const tagStr = tags.length ? ` [${tags.join(",")}]` : "";

    if (it.registrar) parts.push(`Registrar: ${it.registrar}`);
    if (it.abuse_emails?.length) parts.push(`Abuse: ${it.abuse_emails.join(", ")}`);

    const snap = shots.get(it.domain);
    const snapNote = snap?.screenshot ? " • PNG saved" : "";

    return `- ${it.domain}${tagStr} (${parts.join(" • ")}${snapNote})`;
  });

  const body = {
    text:
`DNSTwist: ${items.length} potential lookalikes.
${lines.join("\n")}

Screenshots & diagnostics: ${runUrl}
(Artifacts: dnstwist-snaps, dnstwist-diagnostics)`,
  };

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`Slack webhook failed: ${res.status} ${t}`);
    process.exit(1);
  }
  console.log("Slack notified.");
})().catch((e)=>{ console.error(e); process.exit(1); });
