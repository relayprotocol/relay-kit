#!/usr/bin/env node
/* Phase A: run DNSTwist with LSH, build a bounded shortlist */
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { ...opts }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code ?? 1 : 0, stdout: stdout || "", stderr: stderr || "" });
    });
  });
}

(async () => {
  const watch = (process.env.WATCH_DOMAINS || "").trim();
  if (!watch) {
    console.error("WATCH_DOMAINS secret is empty");
    process.exit(1);
  }
  const domains = watch.split(",").map((s) => s.trim()).filter(Boolean);

  const tldFile = (process.env.TLD_FILE || "").trim();
  const argsCommon = ["--registered", "--mx", "--format", "json", "--lsh"];
  if (tldFile && fs.existsSync(tldFile)) argsCommon.push("--tld", tldFile);

  const allRows = [];
  for (const d of domains) {
    const res = await run("dnstwist", [...argsCommon, d]);
    if (res.code === 0 && res.stdout.trim()) {
      try {
        const arr = JSON.parse(res.stdout);
        if (Array.isArray(arr)) allRows.push(...arr);
      } catch {}
    }
  }

  const active = allRows.filter((r) => (r.dns_a && r.dns_a.length) || (r.mx && r.mx.length));

  const cachePath = path.join(".dnstwist-cache", "active.json");
  let prev = [];
  if (fs.existsSync(cachePath)) {
    try { prev = JSON.parse(await fsp.readFile(cachePath, "utf8")); } catch {}
  }
  const prevSet = new Set(prev.map((x) => x.domain).filter(Boolean));

  const risky = (process.env.RISKY_KEYWORDS || "")
    .split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);

  const lshThr = parseInt(process.env.LSH_THRESHOLD || "75", 10);
  const cap = parseInt(process.env.SHORTLIST_CAP || "120", 10);

  const isRiskyName = (dom) => {
    const s = (dom || "").toLowerCase();
    return risky.some((k) => s.includes(k));
  };

  const candidates = [];
  for (const r of active) {
    const dom = r.domain;
    if (!dom) continue;
    const sim = r.http_similarity ?? -1;
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
