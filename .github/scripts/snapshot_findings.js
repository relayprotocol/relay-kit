#!/usr/bin/env node
// Take PNG screenshots for the top-N findings and write a manifest.
// Uses the best URL we know (from http_diagnostics probes) or falls back to https://<domain>/.

import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const TOP_N = parseInt(process.env.SNAPSHOT_TOP_N || "8", 10);
const CHROME = (process.env.CHROME_BIN || "").trim();
if (!CHROME) {
  console.error("CHROME_BIN not set; cannot take screenshots.");
  process.exit(1);
}

const ensureDir = async (p) => fsp.mkdir(p, { recursive: true }).catch(()=>{});
const readJson = async (p, fallback=null) => {
  try { return JSON.parse(await fsp.readFile(p, "utf8")); } catch { return fallback; }
};

const chooseUrl = (domain, diag) => {
  // Try a 200 from probes first (newer diagnostics format), otherwise https_final, otherwise https://domain/
  // Supports either {results:[{probes:[{status,length,finalUrl}] }]} or {https:{status,finalUrl}}
  if (diag?.results?.length) {
    for (const r of diag.results) {
      const good = (r.probes || []).find(p => p.status === 200 && (p.length || 0) > 1500 && p.finalUrl);
      if (good?.finalUrl) return good.finalUrl;
      if (r.https?.status === 200 && r.https?.finalUrl) return r.https.finalUrl;
    }
  } else if (diag?.https?.status === 200 && diag?.https?.finalUrl) {
    return diag.https.finalUrl;
  }
  return `https://${domain}/`;
};

(async () => {
  const snapsDir = path.join(process.cwd(), "snaps");
  await ensureDir(snapsDir);

  const findings = await readJson("findings_enriched.json") ||
                   await readJson("findings.json") || [];
  if (!findings.length) {
    console.log("No findings to snapshot.");
    await fsp.writeFile("snapshots_manifest.json", "[]");
    return;
  }

  const diagArr = await readJson("http_diagnostics.json") || [];
  const diagMap = new Map(diagArr.map(d => [d.domain, d]));

  const pickOrder = findings.slice(0, TOP_N);
  const manifest = [];

  for (const it of pickOrder) {
    const domain = it.domain;
    const diag = diagMap.get(domain);
    const url = chooseUrl(domain, diag);
    const outPng = path.join(snapsDir, `${domain}.png`);

    const args = [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1366,768",
      "--virtual-time-budget=12000",
      `--screenshot=${outPng}`,
      url
    ];

    try {
      console.log(`Screenshot ${url} -> ${outPng}`);
      execFileSync(CHROME, args, { stdio: "inherit" });
      manifest.push({ domain, url, screenshot: `snaps/${path.basename(outPng)}` });
    } catch (e) {
      console.warn(`Screenshot failed for ${domain}: ${e?.status || e}`);
      manifest.push({ domain, url, screenshot: null, error: String(e) });
    }
  }

  await fsp.writeFile("snapshots_manifest.json", JSON.stringify(manifest, null, 2));
  console.log(`Snapshotted ${manifest.filter(m=>m.screenshot).length}/${manifest.length}`);
})();
