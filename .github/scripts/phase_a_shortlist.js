#!/usr/bin/env node
// Phase A: LSH shortlist with per-seed HTTPS reference + retries/fallback (ESM)

import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);
const BIN = (process.env.DNSTWIST_BIN || "dnstwist").trim();
const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const THREADS = String(process.env.THREADS || "8"); // lower concurrency to be polite

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeSeed(s) {
  if (!s) return "";
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) {
    try { return new URL(t).hostname || ""; } catch { return t; }
  }
  return t.replace(/\/+$/, "");
}

async function run(cmd, args, opts = {}) {
  try {
    const { stdout = "", stderr = "" } = await execFile(cmd, args, { ...opts });
    return { code: 0, stdout, stderr };
  } catch (err) {
    return {
      code: err?.code ?? 1,
      stdout: err?.stdout || "",
      stderr: err?.stderr || String(err),
    };
  }
}

function isRateLimit(stderr) {
  const s = (stderr || "").toLowerCase();
  return s.includes("429") || s.includes("too many requests") || s.includes("rate");
}

function isRedirect(stderr) {
  const s = (stderr || "").toLowerCase();
  return s.includes("308") || s.includes("permanent redirect");
}

(async () => {
  const watch = (process.env.WATCH_DOMAINS || "").trim();
  if (!watch) {
    console.error("WATCH_DOMAINS secret is empty");
    process.exit(1);
  }

  const domains = watch.split(",").map(normalizeSeed).filter(Boolean);
  if (!domains.length) {
    console.error("No usable seed domains after normalization.");
    process.exit(1);
  }

  const tldFile = (process.env.TLD_FILE || "").trim();
  const userAgent = (process.env.USER_AGENT || DEFAULT_UA).trim();

  const TIMEOUT = String(process.env.TIMEOUT_SECS || "60");
  const baseArgs = [
    "--registered","--mx","--format","json",
    "--threads", THREADS,
    "--timeout", TIMEOUT,
    /* plus --lsh or --phash where applicable */
  ];
  if (tldFile && fs.existsSync(tldFile)) baseArgs.push("--tld", tldFile);
  if (userAgent) baseArgs.push("--useragent", userAgent);

  const allRows = [];

  for (const seed of domains) {
    // Prefer a canonical HTTPS reference; allow override
    const refUrl = (process.env.REFERENCE_URL || `https://${seed}/`).trim();

    // Try up to 3 times with LSH; exponential backoff on 429/redirect
    let got = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const args = [...baseArgs, "--lsh", "--lsh-url", refUrl, "--", seed];
      const res = await run(BIN, args, { env: process.env });
      if (res.code === 0 && res.stdout.trim()) { got = res.stdout; break; }

      // If we hit 429/308, back off and retry; otherwise break immediately
      if (isRateLimit(res.stderr) || isRedirect(res.stderr)) {
        const wait = 500 * Math.pow(3, attempt - 1); // 0.5s, 1.5s, 4.5s
        console.warn(`LSH attempt ${attempt} failed for "${seed}" (${res.stderr?.trim() || res.code}); retrying in ${wait}ms...`);
        await sleep(wait);
        continue;
      } else {
        console.warn(`LSH failed for "${seed}" (${res.stderr?.trim() || res.code}); not retrying.`);
        break;
      }
    }

    if (!got) {
      // Fallback: run without LSH so we still get active domains; we’ll rely on risky keywords + "new domain" logic
      console.warn(`Falling back to no-LSH scan for "${seed}".`);
      const res2 = await run(BIN, [...baseArgs, "--", seed], { env: process.env });
      if (res2.code !== 0) {
        console.error(`dnstwist fallback exited with code ${res2.code} for seed "${seed}"\n${res2.stderr || ""}`);
        continue;
      }
      got = res2.stdout;
    }

    try {
      const arr = JSON.parse(got);
      if (Array.isArray(arr)) allRows.push(...arr);
    } catch {
      /* ignore parse errors for this seed */
    }
  }

  // Robust active detection (array or scalar)
  const active = allRows.filter((r) => {
    const hasA  = Array.isArray(r.dns_a) ? r.dns_a.length > 0 : Boolean(r.dns_a);
    const hasMX = Array.isArray(r.mx)    ? r.mx.length    > 0 : Boolean(r.mx);
    return hasA || hasMX;
  });

  const cachePath = path.join(".dnstwist-cache", "active.json");
  let prev = [];
  if (fs.existsSync(cachePath)) {
    try { prev = JSON.parse(await fsp.readFile(cachePath, "utf8")); } catch {}
  }
  const prevSet = new Set(prev.map((x) => x?.domain).filter(Boolean));

  const risky = (process.env.RISKY_KEYWORDS || "")
    .split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
  const lshThr = parseInt(process.env.LSH_THRESHOLD || "75", 10);
  const cap    = parseInt(process.env.SHORTLIST_CAP || "120", 10);

  const isRiskyName = (dom) => {
    const s = (dom || "").toLowerCase();
    return risky.some((k) => s.includes(k));
  };

  const candidates = [];
  for (const r of active) {
    const dom = r.domain;
    if (!dom) continue;
    const sim = r.http_similarity ?? -1; // may be absent if we fell back
    if (!prevSet.has(dom) || isRiskyName(dom) || sim >= lshThr) candidates.push(r);
  }

  const shortlist = candidates.slice(0, cap);

  await fsp.writeFile("phaseA_results.json", JSON.stringify(allRows));
  await fsp.writeFile("shortlist.json", JSON.stringify(shortlist));
  await fsp.mkdir(path.dirname(cachePath), { recursive: true });
  await fsp.writeFile(cachePath, JSON.stringify(active));

  const out = process.env.GITHUB_OUTPUT;
  if (out) await fsp.appendFile(out, `shortlist_count=${shortlist.length}\n`);
  console.log(`shortlist_count=${shortlist.length}`);
})().catch((e) => { console.error(e); process.exit(1); });
