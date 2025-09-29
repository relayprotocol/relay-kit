#!/usr/bin/env node
// HTTP diagnostics (fast):
// - Stage A: probe http:// + https:// root for all domains in parallel (concurrency-limited)
// - Stage B: for domains still not LIVE, probe up to N paths
// - Short timeouts + partial body read (stop after BODY_READ_LIMIT bytes)
// - Skips seeds/allowlist; skips domains with no A record (optional)
// Output: http_diagnostics.json  [{ domain, results: [{host, http, https, probes:[{path,status,finalUrl,length}]}] }]

import fs from "node:fs";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Agent, setGlobalDispatcher } from "undici";

// ---------- Tuning (via env) ----------
const UA = (process.env.USER_AGENT || "Mozilla/5.0 (DNSTwist monitor)").trim();
const ROOT_TIMEOUT_MS = (parseInt(process.env.ROOT_TIMEOUT_SECS || "6", 10)) * 1000;
const PATH_TIMEOUT_MS = (parseInt(process.env.PATH_TIMEOUT_SECS || "6", 10)) * 1000;
const HTTP_CONCURRENCY = parseInt(process.env.HTTP_CONCURRENCY || "40", 10);
const PATH_CONCURRENCY = parseInt(process.env.PATH_CONCURRENCY || "20", 10);
const BODY_MIN = parseInt(process.env.BODY_MIN || "1500", 10);
const BODY_READ_LIMIT = parseInt(process.env.BODY_READ_LIMIT || "32768", 10); // 32 KB
const PATH_PROBES = (process.env.PATH_PROBES || "/,/app,/bridge,/swap,/connect,/login,/signin").split(",").map(s=>s.trim()).filter(Boolean);
const MAX_PATHS_PER_DOMAIN = parseInt(process.env.MAX_PATHS_PER_DOMAIN || "3", 10);
const PROBE_PATHS_ON_FAIL = (process.env.PROBE_PATHS_ON_FAIL || "1") === "1";
const SKIP_NO_A = (process.env.SKIP_NO_A || "1") === "1";

// Seeds/subdomains auto-skip
function normalizeSeed(s) {
  if (!s) return "";
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) { try { return new URL(t).hostname || ""; } catch { return t; } }
  return t.replace(/\/+$/, "").toLowerCase();
}
const seeds = (process.env.WATCH_DOMAINS || "").split(",").map(normalizeSeed).filter(Boolean);
const isSeedOrSub = (d) => {
  const s = (d || "").toLowerCase();
  return seeds.some(base => s === base || s.endsWith("." + base));
};

// Keep-alive HTTP agent (reuses sockets)
setGlobalDispatcher(new Agent({
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 10_000,
  connections: HTTP_CONCURRENCY * 2, // plenty of sockets
}));

// ---------- Helpers ----------
async function readJSON(p, fallback = []) { try { return JSON.parse(await fsp.readFile(p, "utf8")); } catch { return fallback; } }
function hasA(row) {
  const a = row?.dns_a;
  if (Array.isArray(a)) return a.length > 0;
  return !!a;
}

function withTimeoutAbort(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { ctrl, clear: () => clearTimeout(t) };
}

// Read up to BODY_READ_LIMIT bytes
async function measuredFetch(url, ms) {
  const { ctrl, clear } = withTimeoutAbort(ms);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": UA } });
    let length = 0;
    try {
      const reader = res.body?.getReader ? res.body.getReader() : null;
      if (reader) {
        while (length < BODY_READ_LIMIT) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value?.length || 0;
          if (length >= BODY_READ_LIMIT) break;
        }
      } else {
        // Fallback: read text (rare on Node <18)
        const txt = await res.text();
        length = txt.length;
      }
    } catch {}
    const out = { status: res.status, finalUrl: res.url, length };
    clear();
    return out;
  } catch (e) {
    clear();
    return { error: String(e) };
  }
}

function liveEnough(x) {
  return x && x.status === 200 && (x.length || 0) >= BODY_MIN;
}

// simple concurrency limiter (no deps)
function pLimit(n) {
  const queue = [];
  let active = 0;
  const next = () => {
    if (active >= n || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    (async () => fn())().then((v) => { resolve(v); active--; next(); })
                       .catch((e)=> { reject(e); active--; next(); });
  };
  return (fn) => new Promise((resolve,reject) => { queue.push({ fn, resolve, reject }); next(); });
}

// ---------- Main ----------
(async () => {
  // Prefer shortlist/phaseA as source (pre-filtered), but allow phaseB/findings if needed
  const candidates =
    await readJSON("shortlist.json") ||
    await readJSON("phaseA_results.json") ||
    await readJSON("phaseB_results.json") ||
    [];

  if (!Array.isArray(candidates) || candidates.length === 0) {
    console.log("No candidates to diagnose.");
    await fsp.writeFile("http_diagnostics.json", "[]");
    return;
  }

  // Build unique domain list; optionally skip seeds and those with no A
  const rows = [];
  const seen = new Set();
  for (const r of candidates) {
    const dom = (r?.domain || "").toLowerCase();
    if (!dom || seen.has(dom)) continue;
    if (isSeedOrSub(dom)) continue;
    if (SKIP_NO_A && !hasA(r)) continue;
    seen.add(dom);
    rows.push({ domain: dom, row: r });
  }

  console.log(`HTTP diagnostics: probing ${rows.length} domain(s). Concurrency=${HTTP_CONCURRENCY}/${PATH_CONCURRENCY}.`);

  // Stage A: root probes (http + https) for all domains
  const limitRoot = pLimit(HTTP_CONCURRENCY);
  const stageA = await Promise.all(rows.map(({ domain }) => limitRoot(async () => {
    const http  = await measuredFetch(`http://${domain}/`,  ROOT_TIMEOUT_MS);
    const https = await measuredFetch(`https://${domain}/`, ROOT_TIMEOUT_MS);
    return { domain, http, https };
  })));

  // Identify those still not LIVE for Stage B
  const needPaths = new Set();
  const byDomain = new Map();
  for (const r of stageA) {
    byDomain.set(r.domain, { domain: r.domain, results: [{ host: r.domain, http: r.http, https: r.https, probes: [] }] });
    if (!liveEnough(r.http) && !liveEnough(r.https)) needPaths.add(r.domain);
  }

  // Stage B: probe a few paths only for domains not LIVE at root
  if (PROBE_PATHS_ON_FAIL && needPaths.size) {
    const limitPath = pLimit(PATH_CONCURRENCY);
    const paths = PATH_PROBES.slice(0, Math.max(1, Math.min(PATH_PROBES.length, MAX_PATHS_PER_DOMAIN)));

    await Promise.all([...needPaths].map((domain) => limitPath(async () => {
      // Try https first (more common), then http
      for (const scheme of ["https", "http"]) {
        for (const pth of paths) {
          const url = `${scheme}://${domain}${pth.startsWith("/") ? pth : `/${pth}`}`;
          const pr = await measuredFetch(url, PATH_TIMEOUT_MS);
          const entry = byDomain.get(domain);
          if (entry) {
            entry.results[0].probes.push({ path: pth, ...pr });
          }
          if (liveEnough(pr)) return; // stop probing this domain once we get a live page
        }
      }
    })));
  }

  // Emit diagnostics array
  const out = [...byDomain.values()];
  await fsp.writeFile("http_diagnostics.json", JSON.stringify(out, null, 2));

  // Quick summary
  const liveCount = out.filter(d => {
    const r = d.results?.[0];
    if (!r) return false;
    if (liveEnough(r.http) || liveEnough(r.https)) return true;
    return (r.probes || []).some(liveEnough);
  }).length;

  console.log(`diagnosed ${out.length} domains; LIVE=${liveCount}`);
})().catch(e => { console.error(e); process.exit(1); });
