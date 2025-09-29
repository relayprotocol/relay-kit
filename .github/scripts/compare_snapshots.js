#!/usr/bin/env node
// Compare snaps/*.png to a reference app screenshot.
// Outputs snap_similarity.json mapping domain -> {image_similarity, method, diff_path?}

import fs from "node:fs";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

// ---- Chrome resolver (reuse from snapshot script) ----
function resolveChromeBin() {
  const expandHome = p => (p && p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p);
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
      for (const c of cands) try { if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; } catch {}
    }
    try { if (fs.existsSync(p) && fs.statSync(p).isFile()) return p; } catch {}
  }
  const mac = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];
  for (const c of mac) try { if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; } catch {}
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

function takeRefShot(chrome, url, outPng) {
  fs.mkdirSync(path.dirname(outPng), { recursive: true });
  const args = [
    "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
    "--hide-scrollbars","--no-first-run","--no-default-browser-check","--no-zygote",
    "--window-size=1366,768", `--screenshot=${outPng}`, url
  ];
  const env = { ...process.env, DBUS_SESSION_BUS_ADDRESS:"/dev/null", XDG_RUNTIME_DIR:"/tmp", LIBGL_ALWAYS_SOFTWARE:"1" };
  const proc = spawnSync(chrome, args, { encoding:"utf8", env, timeout: 20000 });
  if (proc.status !== 0 || !fs.existsSync(outPng)) {
    throw new Error(`reference shot failed (status ${proc.status}): ${proc.stderr || proc.stdout || ""}`);
  }
}

// ---- tiny PNG reader + dHash/SSIM (no native deps) ----
// We’ll use pure-js PNG decode to avoid npm native installs in Actions.
import { PNG } from "pngjs"; // add to package.json devDeps
function readPNG(p) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(p).pipe(new PNG()).on("parsed", function () {
      resolve({ width: this.width, height: this.height, data: Buffer.from(this.data) });
    }).on("error", reject);
  });
}
function toGray(img) {
  const { width, height, data } = img;
  const g = new Uint8Array(width*height);
  for (let y=0, i=0; y<height; y++) for (let x=0; x<width; x++, i+=4) {
    const r=data[i], gch=data[i+1], b=data[i+2];
    g[y*width+x] = (0.299*r + 0.587*gch + 0.114*b) | 0;
  }
  return { width, height, data: g };
}
function resizeGray(img, w2, h2) {
  // nearest is fine for dHash/SSIM windowed; simple & fast
  const { width:w1, height:h1, data:d1 } = img;
  const d2 = new Uint8Array(w2*h2);
  for (let y=0; y<h2; y++){
    const yy = Math.min(h1-1, Math.round(y*(h1-1)/(h2-1)));
    for (let x=0; x<w2; x++){
      const xx = Math.min(w1-1, Math.round(x*(w1-1)/(w2-1)));
      d2[y*w2+x] = d1[yy*w1+xx];
    }
  }
  return { width:w2, height:h2, data:d2 };
}
function dHash64(gray) {
  // 9x8 compare horizontally
  const w=9, h=8;
  const r = resizeGray(gray, w, h).data;
  let bits = 0n;
  for (let y=0; y<h; y++) {
    for (let x=0; x<8; x++) {
      const a = r[y*w + x], b = r[y*w + x + 1];
      bits = (bits << 1n) | (a > b ? 1n : 0n);
    }
  }
  return bits; // 64-bit bigint
}
function hamming64(a,b) {
  let v = a ^ b;
  let count = 0n;
  while (v) { v &= (v - 1n); count++; }
  return Number(count);
}
// simple SSIM over resized 256x256 (fast-ish)
function ssimFast(grayA, grayB) {
  const A = resizeGray(grayA, 256, 256).data;
  const B = resizeGray(grayB, 256, 256).data;
  // 8x8 window, constants per standard
  const K1=0.01, K2=0.03, L=255, C1=(K1*L)**2, C2=(K2*L)**2;
  let muA=0, muB=0, n=A.length;
  for (let i=0;i<n;i++){ muA+=A[i]; muB+=B[i]; }
  muA/=n; muB/=n;
  let sigmaA=0, sigmaB=0, sigmaAB=0;
  for (let i=0;i<n;i++){
    const da=A[i]-muA, db=B[i]-muB;
    sigmaA+=da*da; sigmaB+=db*db; sigmaAB+=da*db;
  }
  sigmaA/=n-1; sigmaB/=n-1; sigmaAB/=n-1;
  const num = (2*muA*muB + C1) * (2*sigmaAB + C2);
  const den = (muA*muA + muB*muB + C1) * (sigmaA + sigmaB + C2);
  let s = num/den;
  if (!isFinite(s)) s = 0;
  return Math.max(0, Math.min(1, s));
}

async function ensureReferencePng() {
  const refFile = process.env.REFERENCE_PNG || "reference_snaps/relay.link.png";
  if (fs.existsSync(refFile)) return refFile;

  const url = process.env.REFERENCE_URL || "https://relay.link/";
  const chrome = resolveChromeBin();
  if (!chrome) throw new Error("No Chrome binary found for reference shot.");
  fs.mkdirSync(path.dirname(refFile), { recursive:true });
  takeRefShot(chrome, url, refFile);
  return refFile;
}

async function main() {
  const refPng = await ensureReferencePng();
  const refImg = toGray(await readPNG(refPng));
  const refHash = dHash64(refImg);

  const snapsDir = "snaps";
  if (!fs.existsSync(snapsDir)) { await fsp.writeFile("snap_similarity.json","{}"); console.log("No snaps/ folder."); return; }

  const files = fs.readdirSync(snapsDir).filter(f => f.toLowerCase().endsWith(".png"));
  const out = {};

  for (const f of files) {
    const domain = path.basename(f, ".png");
    const p = path.join(snapsDir, f);
    try {
      const img = toGray(await readPNG(p));
      const hash = dHash64(img);
      const dist = hamming64(refHash, hash);     // 0..64
      const dhashSim = 1 - dist/64;              // 0..1
      const ssim = ssimFast(refImg, img);        // 0..1
      const combined = Math.round((0.6*ssim + 0.4*dhashSim) * 100); // weighted

      out[domain] = { image_similarity: combined, method: "dhash+ssim" };
    } catch (e) {
      out[domain] = { image_similarity: null, method: "error", error: String(e) };
    }
  }

  await fsp.writeFile("snap_similarity.json", JSON.stringify(out, null, 2));
  console.log(`Wrote snap_similarity.json for ${Object.keys(out).length} domains`);
}

main().catch(e => { console.error(e); process.exit(1); });
