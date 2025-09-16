#!/usr/bin/env node
// Phase B: run DNSTwist with pHash on the shortlist only (ESM)

import fs from "node:fs";
import { promises as fsp } from "node:fs";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

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

  const items = JSON.parse(await fsp.readFile("shortlist.json", "utf8"));
  const out = [];

  for (const row of items) {
    const dom = row.domain;
    if (!dom) continue;

    const res = await run(
      "dnstwist",
      ["--registered", "--mx", "--lsh", "--phash", "--format", "json", dom],
      { env: process.env } // includes CHROME_BIN from the workflow
    );

    if (res.code === 0 && res.stdout.trim()) {
      try {
        const arr = JSON.parse(res.stdout);
        if (Array.isArray(arr)) out.push(...arr);
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
