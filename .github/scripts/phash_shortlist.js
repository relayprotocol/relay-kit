#!/usr/bin/env node
// Phase B: run DNSTwist with pHash on the shortlist only (ESM)
// Omits any domain that is the seed apex or a subdomain of seeds.

import fs from "node:fs";
import { promises as fsp } from "node:fs";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

function normalizeSeed(s) {
  if (!s) return "";
  const t = s.trim();
  if (/^https?:\/\//i.test(t)) {
    try { return new URL(t).hostname || ""; } catch { return t; }
  }
  return t.replace(/\/+$/, "").toLowerCase();
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

(async () => {
  if (!fs.existsSync("shortlist.json")) {
    await fsp.writeFile("phaseB_results.json", "[]");
    return;
  }

  // seeds to skip (apex & subdomains)
  const seeds = (process.env.WATCH_DOMAINS || "")
    .split(",").map(normalizeSeed).filter(Boolean);
  const isSeedOrSub = (d) => {
    const s = (d || "").toLowerCase();
    return seeds.some(base => s === base || s.endsWith("." + base));
  };

  const items = JSON.parse(await fsp.readFile("shortlist.json", "utf8"));
  const out = [];

  for (const row of items) {
    const dom = row?.domain;
    if (!dom || isSeedOrSub(dom)) continue; // 🔒 skip your own domains

    const res = await run(
      "dnstwist",
      ["--registered", "--mx", "--lsh", "--phash", "--format", "json", dom],
      { env: process.env } // includes CHROME_BIN from the workflow
    );

    if (res.code === 0 && res.stdout.trim()) {
      try {
        const arr = JSON.parse(res.stdout);
        if (Array.isArray(arr)) {
          // also ensure any accidental seed domains in dnstwist output are dropped
          out.push(...arr.filter(r => r?.domain && !isSeedOrSub(r.domain)));
        }
      } catch {
        /* ignore parse errors for individual runs */
      }
    }
  }

  await fsp.writeFile("phaseB_results.json", JSON.stringify(out));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
