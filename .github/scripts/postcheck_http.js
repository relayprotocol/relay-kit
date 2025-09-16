#!/usr/bin/env node
// For each finding, probe http:// and https:// to capture status & final URL

import fs from "node:fs";
import { promises as fsp } from "node:fs";

const UA = (process.env.USER_AGENT || "Mozilla/5.0").trim();
const TIMEOUT_MS = (parseInt(process.env.TIMEOUT_SECS || "15", 10)) * 1000;

async function probe(url) {
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": UA } });
    const body = await res.text(); // not stored, but content-length via length
    clearTimeout(t);
    return { status: res.status, finalUrl: res.url, length: body.length };
  } catch (e) {
    clearTimeout(t);
    return { error: String(e) };
  }
}

(async () => {
  if (!fs.existsSync("findings.json")) {
    console.log("No findings.json; nothing to post-check.");
    await fsp.writeFile("http_diagnostics.json","[]");
    return;
  }
  const items = JSON.parse(await fsp.readFile("findings.json","utf8"));
  const diag = [];
  for (const it of items) {
    const dom = it.domain;
    const http  = await probe(`http://${dom}/`);
    const https = await probe(`https://${dom}/`);
    diag.push({ domain: dom, http, https });
  }
  await fsp.writeFile("http_diagnostics.json", JSON.stringify(diag, null, 2));
  console.log(`diagnosed ${diag.length} domains`);
})();
