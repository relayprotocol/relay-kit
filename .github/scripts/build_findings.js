#!/usr/bin/env node
// Combine A+B, score, allowlist, emit reasons, write findings.json and set output

import fs from "node:fs";
import { promises as fsp } from "node:fs";

const lshThr   = parseInt(process.env.LSH_THRESHOLD  || "75", 10);
const phashThr = parseInt(process.env.PHASH_THRESHOLD|| "85", 10);
const minScore = parseInt(process.env.MIN_SCORE      || "2",  10);

const risky = (process.env.RISKY_KEYWORDS || "")
  .split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);

const allow = (process.env.ALLOWLIST || "")
  .split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);

const isRiskyName = (dom) => {
  const s = (dom || "").toLowerCase();
  return risky.some((k) => s.includes(k));
};

const isAllowed = (dom) => {
  const s = (dom || "").toLowerCase();
  return allow.some((k) => s === k || s.endsWith("." + k));
};

function indexByDomain(rows) {
  const map = new Map();
  for (const r of rows) {
    const dom = r?.domain;
    if (!dom) continue;
    const cur = map.get(dom) || {};
    Object.assign(cur, r);
    map.set(dom, cur);
  }
  return map;
}

(async () => {
  const A = fs.existsSync("phaseA_results.json")
    ? JSON.parse(await fsp.readFile("phaseA_results.json","utf8")) : [];
  const B = fs.existsSync("phaseB_results.json")
    ? JSON.parse(await fsp.readFile("phaseB_results.json","utf8")) : [];

  const m = indexByDomain(A);
  for (const [k,v] of indexByDomain(B).entries()) {
    m.set(k, Object.assign(m.get(k) || {}, v));
  }

  const findings = [];
  for (const [dom, row] of m.entries()) {
    if (isAllowed(dom)) continue; // ignore allowlisted

    const hasA  = Array.isArray(row.dns_a) ? row.dns_a.length > 0 : Boolean(row.dns_a);
    const hasMX = Array.isArray(row.mx)    ? row.mx.length    > 0 : Boolean(row.mx);
    const active = hasA || hasMX;

    const html = row.http_similarity;
    const img  = row.screenshot_similarity ?? row.phash_similarity ?? row.page_similarity;

    const reasons = [];
    let score = 0;

    if (img != null && img >= phashThr) { score += 2; reasons.push(`img>=${phashThr} (${img}%)`); }
    if (html != null && html >= lshThr) { score += 1; reasons.push(`html>=${lshThr} (${html}%)`); }
    if (isRiskyName(dom))               { score += 1; reasons.push("risky-name"); }
    if (hasMX)                          { score += 1; reasons.push("has-MX"); }

    // Require active and either similarity or strong name+MX
    const hasSimilarity = (img != null && img >= phashThr) || (html != null && html >= lshThr);
    const passesGate = active && (hasSimilarity || (isRiskyName(dom) && hasMX));

    if (passesGate && score >= minScore) {
      findings.push({
        domain: dom,
        html_similarity: html ?? null,
        image_similarity: img ?? null,
        dns_a: row.dns_a || [],
        mx: row.mx || [],
        score,
        reasons
      });
    }
  }

  await fsp.writeFile("findings.json", JSON.stringify(findings, null, 2));
  const flag = findings.length ? "true" : "false";
  const out = process.env.GITHUB_OUTPUT;
  if (out) await fsp.appendFile(out, `has_findings=${flag}\n`);
  console.log(`has_findings=${flag} findings_count=${findings.length}`);
})().catch((e)=>{ console.error(e); process.exit(1); });
