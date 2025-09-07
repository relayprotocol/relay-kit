#!/usr/bin/env node
/* Post a compact summary to Slack via Incoming Webhook */
const fsp = require("node:fs/promises");
const fs = require("node:fs");

(async () => {
  const webhook = (process.env.SLACK_WEBHOOK_URL || "").trim();
  if (!webhook) {
    console.error("SLACK_WEBHOOK_URL is empty");
    process.exit(1);
  }

  if (!fs.existsSync("findings.json")) {
    console.log("No findings.json; nothing to send.");
    return;
  }

  const items = JSON.parse(await fsp.readFile("findings.json", "utf8"));
  const lines = items.slice(0, 20).map((it) => {
    const parts = [];
    if (it.html_similarity != null) parts.push(`HTML ${it.html_similarity}%`);
    if (it.image_similarity != null) parts.push(`pHash ${it.image_similarity}%`);
    const sim = parts.length ? ` (${parts.join(" / ")})` : "";
    return `- ${it.domain}${sim}`;
  });

  const body = {
    text: `DNSTwist: ${items.length} potential lookalikes found.\n${lines.join("\n")}`,
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
})().catch((e) => { console.error(e); process.exit(1); });
