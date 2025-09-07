#!/usr/bin/env node
// Post summary to Slack with registrar/abuse if available (ESM)

import fs from "node:fs";
import { promises as fsp } from "node:fs";

(async () => {
  const webhook = (process.env.SLACK_WEBHOOK_URL || "").trim();
  if (!webhook) { console.error("SLACK_WEBHOOK_URL is empty"); process.exit(1); }

  const file = fs.existsSync("findings_enriched.json") ? "findings_enriched.json"
             : fs.existsSync("findings.json")          ? "findings.json"
             : null;
  if (!file) { console.log("No findings file; nothing to send."); return; }

  const items = JSON.parse(await fsp.readFile(file, "utf8"));

  const lines = items.slice(0, 20).map((it) => {
    const parts = [];
    if (it.html_similarity != null) parts.push(`HTML ${it.html_similarity}%`);
    if (it.image_similarity != null) parts.push(`pHash ${it.image_similarity}%`);
    if (it.registrar) parts.push(`Registrar: ${it.registrar}`);
    if (it.abuse_emails?.length) parts.push(`Abuse: ${it.abuse_emails.join(", ")}`);
    const tail = parts.length ? ` (${parts.join(" • ")})` : "";
    return `- ${it.domain}${tail}`;
  });

  const body = { text: `DNSTwist: ${items.length} potential lookalikes found.\n${lines.join("\n")}` };

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
