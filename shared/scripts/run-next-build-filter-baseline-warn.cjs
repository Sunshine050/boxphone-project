#!/usr/bin/env node
/**
 * รัน `next build` จาก cwd (โฟลเดอร์ admin หรือ user) แล้วกรอง warn baseline-browser-mapping
 */
const { spawn } = require('child_process');
const path = require('path');

const appRoot = process.cwd();
const nextBin = path.join(appRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

function skipLine(line) {
  return (
    line.includes('[baseline-browser-mapping]') &&
    line.includes('two months old')
  );
}

function createLineSink(writable) {
  let buf = '';
  return {
    write(chunk) {
      buf += chunk.toString();
      const parts = buf.split(/\n/);
      buf = parts.pop() ?? '';
      for (const line of parts) {
        if (skipLine(line)) continue;
        writable.write(line + '\n');
      }
    },
    end() {
      if (buf.length && !skipLine(buf)) {
        writable.write(buf.endsWith('\n') ? buf : buf + '\n');
      }
    },
  };
}

const child = spawn(process.execPath, [nextBin, 'build'], {
  cwd: appRoot,
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
});

const outSink = createLineSink(process.stdout);
const errSink = createLineSink(process.stderr);

child.stdout.on('data', (c) => outSink.write(c));
child.stderr.on('data', (c) => errSink.write(c));

child.on('close', (code) => {
  outSink.end();
  errSink.end();
  process.exit(code === null ? 1 : code);
});
