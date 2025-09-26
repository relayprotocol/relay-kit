#!/usr/bin/env node
// HTTP diagnostics that work BEFORE or AFTER build_findings.
// Sources domains from: findings_enriched.json -> findings.json -> phaseB_results.json -> phaseA_results.json -> shortlist.json
// Probes bare + www and common paths; writes http_diagnostics.json.

import fs from "node:fs";
import { promises as fsp } from "node:fs";

const UA = (process.env.USER_AGENT || "Mozilla/5.0").trim();
const TIMEOUT_MS = (parseInt(process.env.TIMEOUT_SECS || "15", 10)) * 1000;
const PATH_PROBES = (process.env.PATH_PROBES || "/,/app,/bridge,/swap,/connect,/login,/signin")
  .split(",").map(s => s.trim()).filter(Boolean);

function exists(p){ return fs.existsSync(p); }
async function readJson(p){ return JSON.parse(await fsp.readFile(p,"utf8")); }

function extractDomains(list) {
  const out = new Set();
  for (const it of list || []) {
    if (typeof it === "string") out.add(it.toLowerCase());
    else if (it && typeof it === "object") {
      const cand = it.domain || it.fqdn || it.name;
      if (cand) out.add(String(cand).toLowerCase());
    }
  }
  return [...out];
}

async function loadCandidates() {
  const order = [
    "findings_enriched.json",
    "findings.json",
    "phaseB_results.json",
    "phaseA_results.json",
    "shortlist.json"
  ];
  for (const f of order) {
    if (!exists(f)) continue;
    try {
      const data = await readJson(f);
      const arr = Array.isArray(data) ? data : [];
      const doms = extractDomains(arr);
      if (doms.length) return { source: f, domains: doms };
    } catch { /* continue */ }
  }
  return { source: null, domains: [] };
}

function parkedHost(url="") {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const list = (process.env.PARKING_HOSTS || [
      "sedo","afternic","dan.com","uniregistry","namebright","bodis",
      "parkingcrew","hugedomains","godaddy","porkbun","namecheap",
      "dynadot","sav.com","domainmarket","buydomains","bluehost","hostgator","squadhelp"
    ].join(",")).split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
    return list.some(d => host === d || host.endsWith("."+d));
  } catch { return false; }
}

function containsParking(text="") {
  const keys = (process.env.PARKING_KEYWORDS || [
    "this domain is for sale","parked","parking","future home","coming soon",
    "buy this domain","make an offer","domain for sale"
  ].join(",")).split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
  const low = text.toLowerCase();
  return keys.some(k => low.includes(k));
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": UA } });
    const html = await res.text();
    clearTimeout(t);
    const m = html.match(/<title[^>]*>([^<]{0,200})<\/title>/i);
    const title = m ? m[1].trim() : undefined;
    const isParked = parkedHost(res.url) || containsParking(html) || containsParking(title || "");
    return { status: res.status, finalUrl: res.url, length: html.length, title, parked: Boolean(isParked) };
  } catch (e) {
    clearTimeout(t);
    return { error: String(e) };
  }
}

(async () => {
  const { source, domains } = await loadCandidates();
  if (!domains.length) {
    console.log("HTTP diagnostics: no input domains found (no PhaseA/PhaseB/findings).");
    await fsp.writeFile("http_diagnostics.json","[]");
    return;
  }
  console.log(`HTTP diagnostics: probing ${domains.length} domain(s) from ${source}`);

  const diag = [];
  for (const dom of domains) {
    const hosts = [dom, `www.${dom}`];
    const hostResults = [];
    for (const host of hosts) {
      // root first
      const http  = await fetchText(`http://${host}/`);
      const https = await fetchText(`https://${host}/`);
      // path probes on https
      const probes = [];
      for (const p of PATH_PROBES) {
        const url = `https://${host}${p.startsWith("/")?p:"/"+p}`;
        const r = await fetchText(url);
        probes.push({ path: p, ...r });
        if (r.status === 200 && (r.length||0) > 1500) break; // found real content
      }
      hostResults.push({ host, http, https, probes });
    }
    diag.push({ domain: dom, results: hostResults });
  }

  await fsp.writeFile("http_diagnostics.json", JSON.stringify(diag, null, 2));
  console.log(`HTTP diagnostics complete: wrote ${diag.length} domain(s) to http_diagnostics.json`);
})().catch(e => { console.error(e); process.exit(1); });
