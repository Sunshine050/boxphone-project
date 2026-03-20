'use strict';
/**
 * เรียก shared script ด้วย path แบบ resolve จากโฟลเดอร์ admin (ไม่พึ่ง ../ ใน package.json)
 */
const path = require('path');
const { spawnSync } = require('child_process');

const appRoot = path.resolve(__dirname, '..');
const runner = path.resolve(appRoot, '..', 'shared', 'scripts', 'run-next-build-filter-baseline-warn.cjs');

const result = spawnSync(process.execPath, [runner], {
  cwd: appRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
