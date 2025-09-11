#!/usr/bin/env node
// RDAP enrich: registrar + abuse contacts -> findings_enriched.json

import fs from "node:fs";
import { promises as fsp } from "node:fs";

function pickVCard(entity, key) {
  // vcardArray: ["vcard",[["version",{},"text","4.0"],["fn",...,"text","NAME"],["email",...,"text","x@y"], ...]]
  const va = entity?.vcardArray;
  if (!Array.isArray(va) || !Array.isArray(va[1])) return [];
  return va[1]
    .filter((e) => Array.isArray(e) && e[0] === key && e.length >= 4)
    .map((e) => e[3])
    .filter(Boolean);
}

function firstVCard(entity, key) {
  const vals = pickVCard(entity, key);
  return vals.length ? vals[0] : undefined;
}

async function rdap(domain) {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { redirect: "follow" });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

(async () => {
  if (!fs.existsSync("findings.json")) {
    console.log("No findings.json; skipping RDAP.");
    await fsp.writeFile("findings_enriched.json","[]");
    return;
  }

  const items = JSON.parse(await fsp.readFile("findings.json","utf8"));
  const out = [];

  for (const it of items) {
    const data = await rdap(it.domain);
    let registrar = undefined;
    let abuseEmails = [];
    let abusePhones = [];
    if (data && Array.isArray(data.entities)) {
      for (const e of data.entities) {
        const roles = (e.roles || []).map((r) => String(r).toLowerCase());
        if (roles.includes("registrar")) {
          registrar = registrar || firstVCard(e,"fn");
        }
        if (roles.includes("abuse")) {
          abuseEmails.push(...pickVCard(e,"email"));
          abusePhones.push(...pickVCard(e,"tel"));
        }
      }
      abuseEmails = [...new Set(abuseEmails)];
      abusePhones = [...new Set(abusePhones)];
    }
    out.push({ ...it, registrar: registrar || null, abuse_emails: abuseEmails, abuse_phones: abusePhones });
  }

  await fsp.writeFile("findings_enriched.json", JSON.stringify(out, null, 2));
  console.log(`RDAP enriched ${out.length} findings`);
})();
