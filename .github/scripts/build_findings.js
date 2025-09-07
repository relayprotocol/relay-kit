#!/usr/bin/env node
// Score + reasons + allowlist; alert even if no DNS when name is very close

import fs from "node:fs";
import { promises as fsp } from "node:fs";

const lshThr   = parseInt(process.env.LSH_THRESHOLD  || "75", 10);
const phashThr = parseInt(process.env.PHASH_THRESHOLD|| "85", 10);
const minScore = parseInt(process.env.MIN_SCORE      || "2",  10);
const NAME_EDIT_MAX = parseInt(process.env.NAME_EDIT_DISTANCE_MAX || "1", 10);

const risky = (process.env.RISKY_KEYWORDS || "").split(",").map(w=>w.trim().toLowerCase()).filter(Boolean);
const allow = (process.env.ALLOWLIST || "").split(",").map(w=>w.trim().toLowerCase()).filter(Boolean);
const seeds = (process.env.WATCH_DOMAINS || "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
const seedLabels = seeds.map(s => s.split(".")[0]);

const isRiskyName = (dom) => { const s=(dom||"").toLowerCase(); return risky.some(k => s.includes(k)); };
const isAllowed   = (dom) => { const s=(dom||"").toLowerCase(); return allow.some(k => s===k || s.endsWith("."+k)); };

function indexBy(rows) { const m=new Map(); for (const r of rows||[]) { const d=r?.domain; if(!d) continue; m.set(d, {...(m.get(d)||{}), ...r}); } return m; }
function sld(d) { return (d||"").split(".")[0].toLowerCase(); }
function lev(a,b){a=(a||"").toLowerCase();b=(b||"").toLowerCase();const M=Array.from({length:a.length+1},(_,i)=>[i].concat(Array(b.length).fill(0)));for(let j=1;j<=b.length;j++)M[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){const c=a[i-1]===b[j-1]?0:1;M[i][j]=Math.min(M[i-1][j]+1,M[i][j-1]+1,M[i-1][j-1]+c);}return M[a.length][b.length];}
function isNameClose(dom){ const label=sld(dom); return seedLabels.some(L => lev(label,L) <= NAME_EDIT_MAX); }

(async () => {
  const A = fs.existsSync("phaseA_results.json") ? JSON.parse(await fsp.readFile("phaseA_results.json","utf8")) : [];
  const B = fs.existsSync("phaseB_results.json") ? JSON.parse(await fsp.readFile("phaseB_results.json","utf8")) : [];
  const m = indexBy(A); for (const [k,v] of indexBy(B).entries()) m.set(k, {...(m.get(k)||{}), ...v});

  const out = [];
  for (const [dom,row] of m.entries()) {
    if (isAllowed(dom)) continue;

    const hasA  = Array.isArray(row.dns_a) ? row.dns_a.length>0 : Boolean(row.dns_a);
    const hasMX = Array.isArray(row.mx)    ? row.mx.length>0   : Boolean(row.mx);
    const active = hasA || hasMX;

    const html = row.http_similarity;
    const img  = row.screenshot_similarity ?? row.phash_similarity ?? row.page_similarity;
    const nameClose = isNameClose(dom);
    const riskyName = isRiskyName(dom);

    const reasons = [];
    let score = 0;
    if (img  != null && img  >= phashThr) { score += 2; reasons.push(`img>=${phashThr} (${img}%)`); }
    if (html != null && html >= lshThr)   { score += 1; reasons.push(`html>=${lshThr} (${html}%)`); }
    if (nameClose)                        { score += 2; reasons.push(`name-edit≤${NAME_EDIT_MAX}`); }
    if (riskyName)                        { score += 1; reasons.push("risky-name"); }
    if (hasMX)                            { score += 1; reasons.push("has-MX"); }

    // Gate: either similar content, OR (very close name), and either active or nameClose
    const similar = (img != null && img >= phashThr) || (html != null && html >= lshThr);
    const passes  = (similar || nameClose || riskyName) && (active || nameClose);

    if (passes && score >= minScore) {
      out.push({ domain: dom, html_similarity: html ?? null, image_similarity: img ?? null, dns_a: row.dns_a || [], mx: row.mx || [], score, reasons });
    }
  }

  await fsp.writeFile("findings.json", JSON.stringify(out, null, 2));
  const flag = out.length ? "true" : "false";
  const gh = process.env.GITHUB_OUTPUT; if (gh) await fsp.appendFile(gh, `has_findings=${flag}\n`);
  console.log(`has_findings=${flag} findings_count=${out.length}`);
})().catch((e)=>{ console.error(e); process.exit(1); });
