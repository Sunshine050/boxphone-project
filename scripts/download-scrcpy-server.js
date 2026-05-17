#!/usr/bin/env node
// Download scrcpy-server.jar from GitHub releases (Windows/Mac/Linux compatible).
// รัน: node scripts/download-scrcpy-server.js
// ใช้ตอน clone repo สด หรือ upgrade เวอร์ชัน

const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");

const VERSION = process.env.SCRCPY_SERVER_VERSION || "2.4";
const EXPECTED_SHA256 =
  "93c272b7438605c055e127f7444064ed78fa9ca49f81156777fd201e79ce7ba3";
const URL = `https://github.com/Genymobile/scrcpy/releases/download/v${VERSION}/scrcpy-server-v${VERSION}`;
const DEST_DIR = path.resolve(__dirname, "..", "backend", "assets");
const DEST_FILE = path.join(DEST_DIR, `scrcpy-server-v${VERSION}`);

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function followAndDownload(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (redirectsLeft <= 0) {
            reject(new Error("Too many redirects"));
            return;
          }
          followAndDownload(res.headers.location, dest, redirectsLeft - 1)
            .then(resolve)
            .catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
        file.on("error", reject);
      })
      .on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
  }

  if (fs.existsSync(DEST_FILE)) {
    const existing = sha256(DEST_FILE);
    if (existing === EXPECTED_SHA256) {
      console.log(`OK  ${DEST_FILE} — already up to date (sha256 verified)`);
      return;
    }
    console.warn(`WARN existing file sha256 mismatch (${existing}), re-downloading...`);
  }

  console.log(`Downloading scrcpy-server v${VERSION} ...`);
  console.log(`  from: ${URL}`);
  console.log(`  to:   ${DEST_FILE}`);
  await followAndDownload(URL, DEST_FILE);

  const actual = sha256(DEST_FILE);
  if (actual !== EXPECTED_SHA256) {
    fs.unlinkSync(DEST_FILE);
    throw new Error(
      `SHA256 mismatch! expected ${EXPECTED_SHA256}, got ${actual}`,
    );
  }
  const size = fs.statSync(DEST_FILE).size;
  console.log(`OK  Downloaded ${size} bytes, sha256 verified`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
