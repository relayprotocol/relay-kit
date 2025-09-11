#!/usr/bin/env node
// Phase A: shortlist on registered + name distance + LSH (with retries)
// Will include registered domains even if no A/MX, capped by SHORTLIST_CAP.

import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);
const BIN = (process.env.DNSTWIST_BIN || "dnstwist").trim();
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const THREADS = String(process.env.THREADS || "8");
const TIMEOUT = String(process.env.TIMEOUT_SECS || "15");
const NAME_EDIT_MAX = parseInt(process.env.NAME_EDIT_DISTANCE_MAX || "1", 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeSeed(s) {
  if (!s) return "";
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) { try { return new URL(t).hostname || ""; } catch { return t; } }
  return t.replace(/\/+$/, "");
}
function sld(domain) { return (domain || "").split(".")[0].toLowerCase(); }
function levenshtein(a, b) {
  a = (a||"").toLowerCase(); b = (b||"").toLowerCase();
  const m = Array.from({length: a.length+1}, (_,i)=>[i].concat(Array(b.length).fill(0)));
  for (let j=1;j<=b.length;j++) m[0][j]=j;
  for (let i=1;i<=a.length;i++) for (let j=1;j<=b.length;j++) {
    const cost = a[i-1]===b[j-1]?0:1;
    m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+cost);
  }
  return m[a.length][b.length];
}

async function run(cmd, args, opts = {}) {
  try { const { stdout = "", stderr = "" } = await execFile(cmd, args, { ...opts });
        return { code: 0, stdout, stderr }; }
  catch (err) { return { code: err?.code ?? 1, stdout: err?.stdout || "", stderr: err?.stderr || String(err) }; }
}
const isRateLimit = (s) => (s||"").toLowerCase().includes("429") || (s||"").toLowerCase().includes("too many requests");
const isRedirect  = (s) => (s||"").toLowerCase().includes("308") || (s||"").toLowerCase().includes("permanent redirect");

(async () => {
  const watch = (process.env.WATCH_DOMAINS || "").trim();
  if (!watch) { console.error("WATCH_DOMAINS secret is empty"); process.exit(1); }

  const seeds = watch.split(",").map(normalizeSeed).filter(Boolean);
  const seedLabels = seeds.map(sld);
  if (!seeds.length) { console.error("No usable seed domains after normalization."); process.exit(1); }

  const tldFile   = (process.env.TLD_FILE || "").trim();
  const userAgent = (process.env.USER_AGENT || DEFAULT_UA).trim();
  const risky = (process.env.RISKY_KEYWORDS || "").split(",").map(w=>w.trim().toLowerCase()).filter(Boolean);
  const lshThr = parseInt(process.env.LSH_THRESHOLD || "75", 10);
  const cap    = parseInt(process.env.SHORTLIST_CAP || "120", 10);

  const baseArgs = ["--registered","--mx","--format","json","--threads",THREADS];
  if (tldFile && fs.existsSync(tldFile)) baseArgs.push("--tld", tldFile);
  if (userAgent) baseArgs.push("--useragent", userAgent);

  const allRows = [];
  for (const seed of seeds) {
    const refUrl = (process.env.REFERENCE_URL || `https://${seed}/`).trim();
    let got = null;
    for (let attempt=1; attempt<=3; attempt++) {
      const res = await run(BIN, [...baseArgs, "--lsh", "--lsh-url", refUrl, "--", seed], { env: process.env });
      if (res.code === 0 && res.stdout.trim()) { got = res.stdout; break; }
      if (isRateLimit(res.stderr) || isRedirect(res.stderr)) { await sleep(500 * Math.pow(3, attempt-1)); continue; }
      console.warn(`LSH failed for "${seed}" (${res.stderr?.trim() || res.code}); no retry.`);
      break;
    }
    if (!got) {
      const res2 = await run(BIN, [...baseArgs, "--", seed], { env: process.env });
      if (res2.code !== 0) { console.error(`dnstwist fallback exited ${res2.code} for "${seed}"\n${res2.stderr || ""}`); continue; }
      got = res2.stdout;
    }
    try { const arr = JSON.parse(got); if (Array.isArray(arr)) allRows.push(...arr); } catch {}
  }

  // --- shortlist logic (do NOT require A/MX here) ---
  const seenCachePath = path.join(".dnstwist-cache","seen.json");
  let seen = []; if (fs.existsSync(seenCachePath)) { try { seen = JSON.parse(await fsp.readFile(seenCachePath,"utf8")); } catch {} }
  const seenSet = new Set((seen||[]).map(x => x?.domain).filter(Boolean));

  const isRiskyName = (dom) => { const low = (dom||"").toLowerCase(); return risky.some(k => low.includes(k)); };
  const rows = allRows.map(r => {
    const dom = r.domain || "";
    const label = sld(dom);
    const nameDist = Math.min(...seedLabels.map(l => levenshtein(label, l)));
    const hasA  = Array.isArray(r.dns_a) ? r.dns_a.length>0 : Boolean(r.dns_a);
    const hasMX = Array.isArray(r.mx)    ? r.mx.length>0   : Boolean(r.mx);
    const html  = r.http_similarity ?? -1;
    const newish = !seenSet.has(dom);
    const score = (html>=lshThr?2:0) + (hasMX?1:0) + (hasA?1:0) + (isRiskyName(dom)?1:0) + (nameDist<=NAME_EDIT_MAX?2:0) + (newish?1:0);
    return { ...r, _hasA:hasA, _hasMX:hasMX, _nameDist:nameDist, _new:newish, _score:score };
  });

  // filter to plausible suspects, then cap
  const candidates = rows.filter(r =>
    (r._nameDist <= NAME_EDIT_MAX) || (r.http_similarity >= lshThr) || isRiskyName(r.domain) || r._hasMX
  ).sort((a,b) => b._score - a._score).slice(0, cap);

  await fsp.writeFile("phaseA_results.json", JSON.stringify(allRows));
  await fsp.writeFile("shortlist.json", JSON.stringify(candidates));
  await fsp.mkdir(path.dirname(seenCachePath), { recursive:true });
  await fsp.writeFile(seenCachePath, JSON.stringify(allRows.map(r => ({domain:r.domain}))));

  const out = process.env.GITHUB_OUTPUT; if (out) await fsp.appendFile(out, `shortlist_count=${candidates.length}\n`);
  console.log(`shortlist_count=${candidates.length}`);
})().catch((e)=>{ console.error(e); process.exit(1); });
