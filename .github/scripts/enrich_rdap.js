#!/usr/bin/env node
// RDAP enrich BEFORE build_findings:
// - sources domains from: findings.json (if present) -> phaseB -> phaseA -> shortlist
// - writes rdap_enrich.json (array of {domain, registrar, abuse_emails, abuse_phones, nameservers, creation_date, updated_date, age_days, parked_ns})

import fs from "node:fs";
import { promises as fsp } from "node:fs";

const RDAP_BASE = process.env.RDAP_BASE || "https://rdap.org/domain/";
const NOW = new Date();

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
  const order = ["findings.json","phaseB_results.json","phaseA_results.json","shortlist.json"];
  for (const f of order) {
    if (!exists(f)) continue;
    try {
      const data = await readJson(f);
      const arr = Array.isArray(data) ? data : [];
      const doms = extractDomains(arr);
      if (doms.length) return { source: f, domains: doms };
    } catch {}
  }
  return { source: null, domains: [] };
}

function pickVCard(entity, key) {
  const va = entity?.vcardArray;
  if (!Array.isArray(va) || !Array.isArray(va[1])) return [];
  return va[1]
    .filter(e => Array.isArray(e) && e[0] === key && e.length >= 4)
    .map(e => e[3])
    .filter(Boolean);
}
const firstVCard = (entity, key) => { const v = pickVCard(entity, key); return v.length ? v[0] : undefined; };

async function rdap(domain) {
  try {
    const res = await fetch(`${RDAP_BASE}${encodeURIComponent(domain)}`, { redirect: "follow" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function parseDate(s) { try { return s ? new Date(s) : null; } catch { return null; } }

function computeAgeDays(created) {
  if (!created) return null;
  const ms = NOW - created;
  return ms > 0 ? Math.floor(ms / (1000*60*60*24)) : null;
}

function parkedByNS(nameservers = []) {
  const list = (process.env.PARKING_NS || [
    "sedoparking","parkingcrew","bodis","afternic","dan.com","namebrightdns",
    "hugedomains","uniregistrymarket","sav.com","squadhelp","porkbun","godaddy"
  ].join(",")).split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
  const ns = nameservers.map(n => String(n).toLowerCase());
  return list.some(p => ns.some(n => n.includes(p)));
}

(async () => {
  const { source, domains } = await loadCandidates();
  if (!domains.length) {
    console.log("RDAP: no input domains (no findings/phaseA/phaseB/shortlist).");
    await fsp.writeFile("rdap_enrich.json","[]");
    return;
  }
  console.log(`RDAP: enriching ${domains.length} domain(s) from ${source}`);

  const out = [];
  for (const dom of domains) {
    const data = await rdap(dom);
    let registrar, abuseEmails = [], abusePhones = [], nameservers = [], created, updated;

    if (data) {
      // registrar / abuse
      if (Array.isArray(data.entities)) {
        for (const e of data.entities) {
          const roles = (e.roles || []).map(r => String(r).toLowerCase());
          if (roles.includes("registrar")) registrar = registrar || firstVCard(e,"fn");
          if (roles.includes("abuse")) {
            abuseEmails.push(...pickVCard(e,"email"));
            abusePhones.push(...pickVCard(e,"tel"));
          }
        }
      }
      abuseEmails = [...new Set(abuseEmails)];
      abusePhones = [...new Set(abusePhones)];

      // nameservers
      if (Array.isArray(data.nameservers)) {
        nameservers = data.nameservers
          .map(ns => (typeof ns === "string" ? ns : (ns.ldhName || ns.unicodeName || "")))
          .filter(Boolean);
      }

      // dates
      const ev = Array.isArray(data.events) ? data.events : [];
      created = parseDate(ev.find(e => e.eventAction === "registration")?.eventDate)
             || parseDate(data.events?.find(e => e.eventAction === "registered")?.eventDate)
             || parseDate(data.events?.find(e => /create/i.test(e.eventAction || ""))?.eventDate)
             || parseDate(data?.events?.[0]?.eventDate); // fallback
      updated = parseDate(ev.find(e => e.eventAction === "last changed")?.eventDate)
             || parseDate(ev.find(e => /update/i.test(e.eventAction || ""))?.eventDate);
    }

    const age_days = computeAgeDays(created);
    const parked_ns = parkedByNS(nameservers);

    out.push({
      domain: dom,
      registrar: registrar || null,
      abuse_emails: abuseEmails,
      abuse_phones: abusePhones,
      nameservers,
      creation_date: created ? created.toISOString() : null,
      updated_date: updated ? updated.toISOString() : null,
      age_days,
      parked_ns
    });
  }

  await fsp.writeFile("rdap_enrich.json", JSON.stringify(out, null, 2));
  console.log(`RDAP enriched ${out.length} domain(s) -> rdap_enrich.json`);
})().catch(e => { console.error(e); process.exit(1); });
