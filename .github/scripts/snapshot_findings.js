#!/usr/bin/env node
// Take PNG screenshots for the top-N findings and write a manifest.
// Uses best URL from http_diagnostics; falls back to https://<domain>/.
// Adds spawn timeouts, retries, and disables background/update components.

import fs from "node:fs";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const TOP_N = parseInt(process.env.SNAPSHOT_TOP_N || "8", 10);
const BODY_MIN = parseInt(process.env.BODY_MIN || "1500", 10);
const SHOT_TIMEOUT_MS = parseInt(process.env.SNAPSHOT_TIMEOUT_MS || "20000", 10); // 20s per capture
const PNG_MIN_BYTES = parseInt(process.env.PNG_MIN_BYTES || "10240", 10); // 10KB sanity

function expandHome(p) { if (!p) return p; if (p.startsWith("~")) return path.join(os.homedir(), p.slice(1)); return p; }

function resolveChromeBin() {
  const envVal = (process.env.CHROME_BIN || "").trim();
  if (envVal) {
    let p = expandHome(envVal);
    if (p.endsWith(".app")) {
      const cands = [
        path.join(p, "Contents/MacOS/Google Chrome"),
        path.join(p, "Contents/MacOS/Chromium"),
        path.join(p, "Contents/MacOS/Brave Browser"),
        path.join(p, "Contents/MacOS/Microsoft Edge"),
      ];
      for (const c of cands) { try { if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; } catch {} }
    }
    try { if (fs.existsSync(p) && fs.statSync(p).isFile()) return p; } catch {}
  }
  const mac = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];
  for (const c of mac) { try { if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; } catch {} }
  const whiches = ["google-chrome-stable","google-chrome","chromium","chromium-browser","brave-browser","brave","microsoft-edge"];
  for (const w of whiches) {
    try {
      const out = spawnSync("bash", ["-lc", `command -v ${w}`], { encoding:"utf8" });
      const p = out.stdout.trim();
      if (p && fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch {}
  }
  return "";
}

const ensureDir = async (p) => fsp.mkdir(p, { recursive: true }).catch(()=>{});
const readJson = async (p, fallback=null) => { try { return JSON.parse(await fsp.readFile(p,"utf8")); } catch { return fallback; } };

const chooseUrl = (domain, diag) => {
  if (diag?.results?.length) {
    for (const r of diag.results) {
      const good = (r.probes || []).find(p => p?.status === 200 && (p.length||0) > BODY_MIN && p.finalUrl);
      if (good?.finalUrl) return good.finalUrl;
      if (r.https?.status === 200 && r.https?.finalUrl) return r.https.finalUrl;
      if (r.http?.status === 200 && r.http?.finalUrl) return r.http.finalUrl;
    }
  } else if (diag) {
    if (diag.https?.status === 200 && diag.https?.finalUrl) return diag.https.finalUrl;
    if (diag.http?.status === 200 && diag.http?.finalUrl) return diag.http.finalUrl;
  }
  return `https://${domain}/`;
};

// Two profiles of flags: strict (most disabled) then relaxed retry
function chromeArgsBase(outPng, url, userDataDir) {
  return [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--no-zygote",
    "--single-process", // helps on mac headless sometimes
    "--disable-background-networking",
    "--disable-client-side-phishing-detection",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-domain-reliability",
    "--disable-features=PushMessaging,BackgroundFetch,BackgroundSync,NotificationTriggers,OnDeviceModel,TranslateUI,MediaRouter,OptimizationHints,UseOzonePlatform",
    "--disable-notifications",
    "--disable-sync",
    "--metrics-recording-only",
    "--mute-audio",
    "--password-store=basic",
    "--safebrowsing-disable-auto-update",
    "--no-service-autorun",
    "--no-pings",
    "--window-size=1366,768",
    "--virtual-time-budget=15000",
    `--user-data-dir=${userDataDir}`,
    `--screenshot=${outPng}`,
    url,
  ];
}
function chromeArgsRetry(outPng, url, userDataDir) {
  const a = chromeArgsBase(outPng, url, userDataDir).filter(x => !String(x).startsWith("--single-process"));
  // If the first attempt failed, try SwiftShader explicitly
  a.splice(3, 0, "--enable-features=Vulkan"); // harmless if no Vulkan; can help on some setups
  return a;
}

function runShot(CHROME, args) {
  const env = {
    ...process.env,
    DBUS_SESSION_BUS_ADDRESS: "/dev/null",
    XDG_RUNTIME_DIR: "/tmp",
    LIBGL_ALWAYS_SOFTWARE: "1",
    // silence chrome logging a bit
    CHROME_LOG_FILE: "/dev/null",
  };
  // timeout will SIGTERM; Chrome exits non-zero if it times out
  return spawnSync(CHROME, args, { encoding: "utf8", env, timeout: SHOT_TIMEOUT_MS });
}

(async () => {
  const CHROME = resolveChromeBin();
  if (!CHROME) {
    console.error("Could not find a Chrome/Chromium binary. Set CHROME_BIN to the full path of the executable.");
    process.exit(1);
  }
  console.log(`Using Chrome: ${CHROME}`);

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

  const selection = findings.slice(0, TOP_N);
  const manifest = [];

  let ok = 0;
  for (const it of selection) {
    const domain = it.domain;
    const diag = diagMap.get(domain);
    const url = chooseUrl(domain, diag);
    const outPng = path.join(snapsDir, `${domain}.png`);
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-"));

    try {
      console.log(`Screenshot ${url} -> ${outPng}`);
      // Try #1 (strict flags)
      let proc = runShot(CHROME, chromeArgsBase(outPng, url, userDataDir));
      let success = proc.status === 0 && fs.existsSync(outPng) && fs.statSync(outPng).size >= PNG_MIN_BYTES;

      // Retry #2 (slightly different flags) if needed
      if (!success) {
        try { fs.unlinkSync(outPng); } catch {}
        proc = runShot(CHROME, chromeArgsRetry(outPng, url, userDataDir));
        success = proc.status === 0 && fs.existsSync(outPng) && fs.statSync(outPng).size >= PNG_MIN_BYTES;
      }

      if (!success) {
        const msg = (proc.stderr || proc.stdout || "").split("\n").slice(-6).join("\n");
        throw new Error(`chrome exited ${proc.status ?? "?"} (timeout=${proc.timedOut ? "yes" : "no"})\n${msg}`);
      }

      ok++;
      manifest.push({ domain, url, screenshot: `snaps/${path.basename(outPng)}` });
    } catch (e) {
      console.warn(`Screenshot failed for ${domain}: ${String(e).slice(0, 800)}`);
      manifest.push({ domain, url, screenshot: null, error: String(e).slice(0, 2000) });
    } finally {
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
    }
  }

  await fsp.writeFile("snapshots_manifest.json", JSON.stringify(manifest, null, 2));
  console.log(`Snapshotted ${ok}/${selection.length}`);
})();
