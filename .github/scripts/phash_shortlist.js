#!/usr/bin/env node
/* Phase B: run DNSTwist with pHash on the shortlist only */
const fsp = require("node:fs/promises");
const fs = require("node:fs");
const { execFile } = require("node:child_process");

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { ...opts }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code ?? 1 : 0, stdout: stdout || "", stderr: stderr || "" });
    });
  });
}

(async () => {
  if (!fs.existsSync("shortlist.json")) {
    await fsp.writeFile("phaseB_results.json", "[]");
    return;
  }
  const items = JSON.parse(await fsp.readFile("shortlist.json", "utf8"));
  const out = [];

  for (const row of items) {
    const dom = row.domain;
    if (!dom) continue;
    const res = await run("dnstwist", ["--registered","--mx","--lsh","--phash","--format","json", dom], {
      env: process.env, // includes CHROME_BIN from the workflow step
    });
    if (res.code === 0 && res.stdout.trim()) {
      try {
        const arr = JSON.parse(res.stdout);
        if (Array.isArray(arr)) out.push(...arr);
      } catch {}
    }
  }

  await fsp.writeFile("phaseB_results.json", JSON.stringify(out));
})().catch((e) => { console.error(e); process.exit(1); });
