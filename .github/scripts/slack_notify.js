#!/usr/bin/env node
// Send a labeled Slack summary with explicit "reasons" for each domain.

import fs from "node:fs";
import { promises as fsp } from "node:fs";

function tagsFromReasons(reasons = []) {
  const t = new Set();
  for (const r of reasons) {
    if (/^img[>=]/i.test(r)) t.add("IMG");
    if (/^html[>=]/i.test(r)) t.add("HTML");
    if (r.includes("name-edit")) t.add("NAME");
    if (r.includes("has-MX")) t.add("MX");
    if (r.includes("age≤")) t.add("NEW");
    if (r.includes("LIVE")) t.add("LIVE");
    if (r.includes("path-200")) t.add("PATH");
    if (r.includes("risky-name")) t.add("KEYWORD");
    if (r.includes("known-bad")) t.add("OVERRIDE");
  }
  return [...t];
}

function humanizeReasons(reasons = []) {
  // Keep thresholds as-is; expand a few for readability.
  return reasons.map(r => {
    if (r.startsWith("img>=")) return r.replace("img>=", "Image similarity ≥");
    if (r.startsWith("html>=")) return r.replace("html>=", "HTML similarity ≥");
    if (r.startsWith("age≤")) return r.replace("age≤", "Domain age ≤ ");
    if (r === "risky-name") return "Risky keyword in domain";
    if (r === "has-MX") return "Has MX (can receive mail)";
    if (r === "LIVE") return "Loaded successfully (HTTP 200)";
    if (r === "name-edit≤1") return "Name very close (edit distance ≤ 1)";
    return r;
  });
}

async function readJson(p) {
  try { return JSON.parse(await fsp.readFile(p, "utf8")); }
  catch { return null; }
}

(async () => {
  const webhook = (process.env.SLACK_WEBHOOK_URL || "").trim();
  if (!webhook) {
    console.error("SLACK_WEBHOOK_URL is empty");
    process.exit(1);
  }

  // Prefer enriched findings if available
  const findings =
    (await readJson("findings_enriched.json")) ??
    (await readJson("findings.json")) ?? [];

  if (!Array.isArray(findings) || findings.length === 0) {
    console.log("No findings to send to Slack.");
    return;
  }

  // Optional extras for nicer details
  const manifest = (await readJson("snapshots_manifest.json")) ?? [];
  const diag = (await readJson("http_diagnostics.json")) ?? [];
  const shotByDomain = new Map(manifest.map(m => [m.domain, m]));
  const diagByDomain = new Map(diag.map(d => [d.domain, d]));

  const runUrl =
    process.env.RUN_URL ||
    `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;

  // build message lines
  const maxItems = Number(process.env.SLACK_MAX_ITEMS || 20);
  const lines = findings.slice(0, maxItems).map(it => {
    const tags = tagsFromReasons(it.reasons || []);
    const why = humanizeReasons(it.reasons || []);
    const parts = [];

    if (it.html_similarity != null) parts.push(`HTML ${it.html_similarity}%`);
    if (it.image_similarity != null) parts.push(`pHash ${it.image_similarity}%`);
    if (it.registrar) parts.push(`Registrar: ${it.registrar}`);
    if (it.abuse_emails?.length) parts.push(`Abuse: ${it.abuse_emails.join(", ")}`);

    const shot = shotByDomain.get(it.domain);
    const shotNote = shot?.screenshot ? " • PNG saved" : "";

    // try to show the URL we actually loaded (from diagnostics or snapshot manifest)
    let liveUrl = shot?.url;
    if (!liveUrl) {
      const d = diagByDomain.get(it.domain);
      const candidate =
        d?.results?.flatMap(r => (r.probes || []).concat([r.https, r.http]).filter(Boolean)) ||
        (d ? [d.https, d.http, ...(d.probes || [])].filter(Boolean) : []);
      const good = candidate.find(x => x?.status === 200 && (x.length || 0) > 1500 && x.finalUrl);
      liveUrl = good?.finalUrl;
    }
    const liveStr = liveUrl ? `\n    ↳ live: ${liveUrl}` : "";

    const tagStr = tags.length ? ` [${tags.join(",")}]` : "";
    const whyStr = why.length ? `\n    why: ${why.join(" • ")}` : "";

    return `• ${it.domain}${tagStr} (${parts.join(" • ")}${shotNote})${whyStr}${liveStr}`;
  });

  const header = `DNSTwist: ${findings.length} potential lookalike${findings.length === 1 ? "" : "s"}.`;
  const footer = `\nScreenshots & diagnostics: ${runUrl}\n(Artifacts: dnstwist-snaps, dnstwist-diagnostics)`;

  const payload = {
    text: `${header}\n${lines.join("\n")}${footer}`
  };

  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const t = await res.text();
    console.error(`Slack webhook failed: ${res.status} ${t}`);
    process.exit(1);
  }
  console.log("Slack notified with reasons.");
})().catch(e => { console.error(e); process.exit(1); });
