#!/usr/bin/env node
/* Combine Phase A + B, apply thresholds, emit findings.json and set output */
const fsp = require("node:fs/promises");
const fs = require("node:fs");

function indexByDomain(rows) {
  const map = new Map();
  for (const r of rows) {
    const dom = r.domain;
    if (!dom) continue;
    const cur = map.get(dom) || {};
    Object.assign(cur, r);
    map.set(dom, cur);
  }
  return map;
}

(async () => {
  const lshThr = parseInt(process.env.LSH_THRESHOLD || "75", 10);
  const phashThr = parseInt(process.env.PHASH_THRESHOLD || "85", 10);
  const risky = (process.env.RISKY_KEYWORDS || "")
    .split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);

  const isRiskyName = (dom) => {
    const s = (dom || "").toLowerCase();
    return risky.some((k) => s.includes(k));
  };

  const A = fs.existsSync("phaseA_results.json")
    ? JSON.parse(await fsp.readFile("phaseA_results.json", "utf8")) : [];
  const B = fs.existsSync("phaseB_results.json")
    ? JSON.parse(await fsp.readFile("phaseB_results.json", "utf8")) : [];

  const m = indexByDomain(A);
  for (const [k, v] of indexByDomain(B).entries()) {
    m.set(k, Object.assign(m.get(k) || {}, v));
  }

  const findings = [];
  for (const [dom, row] of m.entries()) {
    const active = (row.dns_a && row.dns_a.length) || (row.mx && row.mx.length);
    const html = row.http_similarity;
    const img = row.screenshot_similarity ?? row.phash_similarity ?? row.page_similarity;
    if (active && (isRiskyName(dom) || (html != null && html >= lshThr) || (img != null && img >= phashThr))) {
      findings.push({
        domain: dom,
        html_similarity: html ?? null,
        image_similarity: img ?? null,
        dns_a: row.dns_a || [],
        mx: row.mx || []
      });
    }
  }

  await fsp.writeFile("findings.json", JSON.stringify(findings, null, 2));

  const flag = findings.length ? "true" : "false";
  const out = process.env.GITHUB_OUTPUT;
  if (out) await fsp.appendFile(out, `has_findings=${flag}\n`);
  console.log(`has_findings=${flag}`);
})().catch((e) => { console.error(e); process.exit(1); });
