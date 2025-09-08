#!/usr/bin/env node
// Build findings: only report domains that actually load (HTTP 200)
// LIVE means: any host {domain, www.domain} at / or probed path returns 200 with non-tiny body.

import fs from "node:fs";
import { promises as fsp } from "node:fs";

const lshThr   = parseInt(process.env.LSH_THRESHOLD  || "80", 10);
const phashThr = parseInt(process.env.PHASH_THRESHOLD|| "90", 10);
const minScore = parseInt(process.env.MIN_SCORE      || "3",  10);
const NAME_EDIT_MAX = parseInt(process.env.NAME_EDIT_DISTANCE_MAX || "1", 10);
const NEW_DOMAIN_WINDOW_DAYS = parseInt(process.env.NEW_DOMAIN_WINDOW_DAYS || "14", 10);
const REPORT_ONLY_LIVE = (process.env.REPORT_ONLY_LIVE || "0") === "1";
const BODY_MIN = parseInt(process.env.BODY_MIN || "1500", 10); // "has content"

const risky = (process.env.RISKY_KEYWORDS || "").split(",").map(w=>w.trim().toLowerCase()).filter(Boolean);
const allow = (process.env.ALLOWLIST || "").split(",").map(w=>w.trim().toLowerCase()).filter(Boolean);
const seeds = (process.env.WATCH_DOMAINS || "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
const seedLabels = seeds.map(s => s.split(".")[0]);

function indexBy(rows){ const m=new Map(); for (const r of rows||[]) { const d=r?.domain; if(!d) continue; m.set(d, {...(m.get(d)||{}), ...r}); } return m; }
function sld(d){ return (d||"").split(".")[0].toLowerCase(); }
function lev(a,b){a=(a||"").toLowerCase();b=(b||"").toLowerCase();const M=Array.from({length:a.length+1},(_,i)=>[i].concat(Array(b.length).fill(0)));for(let j=1;j<=b.length;j++)M[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){const c=a[i-1]===b[j-1]?0:1;M[i][j]=Math.min(M[i-1][j]+1,M[i][j-1]+1,M[i-1][j-1]+c);}return M[a.length][b.length];}
const isRiskyName = (dom) => { const s=(dom||"").toLowerCase(); return risky.some(k=>s.includes(k)); };
const isAllowed   = (dom) => { const s=(dom||"").toLowerCase(); return allow.some(k => s===k || s.endsWith("."+k)); };
const nameClose   = (dom) => seedLabels.some(L => lev(sld(dom), L) <= NAME_EDIT_MAX);

function diagHasLive(diag) {
  if (!diag) return false;
  // Support old {http,https} and new {results:[{http,https,probes[]}]}
  const checks = [];
  if (Array.isArray(diag.results) && diag.results.length) {
    for (const r of diag.results) {
      const H = [r.http, r.https].filter(Boolean);
      for (const h of H) checks.push(h);
      for (const p of (r.probes||[])) checks.push(p);
    }
  } else {
    checks.push(diag.http, diag.https);
    for (const p of (diag.probes||[])) checks.push(p);
  }
  return checks.some(x => x && x.status === 200 && (x.length||0) >= BODY_MIN);
}

(async () => {
  const A = fs.existsSync("phaseA_results.json") ? JSON.parse(await fsp.readFile("phaseA_results.json","utf8")) : [];
  const B = fs.existsSync("phaseB_results.json") ? JSON.parse(await fsp.readFile("phaseB_results.json","utf8")) : [];
  const H = fs.existsSync("http_diagnostics.json") ? JSON.parse(await fsp.readFile("http_diagnostics.json","utf8")) : [];

  const mapAB = indexBy(A);
  for (const [k,v] of indexBy(B).entries()) mapAB.set(k, {...(mapAB.get(k)||{}), ...v});

  const diagByDomain = new Map((H||[]).map(h => [h.domain, h]));

  const out = [];
  for (const [dom,row] of mapAB.entries()) {
    if (isAllowed(dom)) continue;

    const hasA  = Array.isArray(row.dns_a) ? row.dns_a.length>0 : Boolean(row.dns_a);
    const hasMX = Array.isArray(row.mx)    ? row.mx.length>0   : Boolean(row.mx);
    const html = row.http_similarity;
    const img  = row.screenshot_similarity ?? row.phash_similarity ?? row.page_similarity;
    const age_days = row.age_days;

    // LIVE gate
    const live = diagHasLive(diagByDomain.get(dom));
    if (REPORT_ONLY_LIVE && !live) continue;

    // scoring + reasons
    let score = 0; const reasons = [];
    if (img  != null && img  >= phashThr) { score+=2; reasons.push(`img>=${phashThr} (${img}%)`); }
    if (html != null && html >= lshThr)   { score+=1; reasons.push(`html>=${lshThr} (${html}%)`); }
    if (nameClose(dom))                   { score+=2; reasons.push(`name-edit≤${NAME_EDIT_MAX}`); }
    if (isRiskyName(dom))                 { score+=1; reasons.push("risky-name"); }
    if (hasMX)                            { score+=1; reasons.push("has-MX"); }
    if (typeof age_days === "number" && age_days <= NEW_DOMAIN_WINDOW_DAYS) { score+=1; reasons.push(`age≤${NEW_DOMAIN_WINDOW_DAYS}d`); }
    if (live)                             { score+=1; reasons.push("LIVE"); }

    if (score >= minScore) {
      out.push({
        domain: dom,
        html_similarity: html ?? null,
        image_similarity: img ?? null,
        dns_a: row.dns_a || [],
        mx: row.mx || [],
        score, reasons
      });
    }
  }

  await fsp.writeFile("findings.json", JSON.stringify(out, null, 2));
  const flag = out.length ? "true" : "false";
  const gh = process.env.GITHUB_OUTPUT; if (gh) await fsp.appendFile(gh, `has_findings=${flag}\n`);
  console.log(`has_findings=${flag} findings_count=${out.length}`);
})();
