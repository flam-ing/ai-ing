#!/usr/bin/env node
/*
 * validate_all.js — syntax-checks every inline <script> block in the HTML files.
 * Skips non-JS scripts (e.g. application/ld+json) and external src= scripts.
 * Usage: node scratch/validate_all.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const files = ['index.html'].filter((f) => fs.existsSync(path.join(root, f)));

const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let totalBlocks = 0;
let errors = 0;

for (const file of files) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  let m;
  let idx = 0;
  while ((m = scriptRe.exec(html))) {
    const attrs = m[1] || '';
    const code = m[2] || '';
    // Skip external scripts and non-JS script types (JSON-LD, importmap, etc.)
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (/\btype\s*=/.test(attrs) && !/type\s*=\s*["']?(text\/javascript|module|application\/javascript)["']?/i.test(attrs)) continue;
    if (!code.trim()) continue;

    idx++;
    totalBlocks++;
    const tmp = path.join(os.tmpdir(), `aiing_validate_${file.replace(/\W/g, '_')}_${idx}.js`);
    fs.writeFileSync(tmp, code);
    try {
      execSync(`node --check "${tmp}"`, { stdio: 'pipe' });
    } catch (e) {
      errors++;
      console.error(`\n✗ Syntax error in ${file} (inline script block #${idx}):\n${e.stderr ? e.stderr.toString() : e.message}`);
    } finally {
      fs.unlinkSync(tmp);
    }
  }
}

if (errors === 0) {
  console.log(`✓ validate_all: ${totalBlocks} inline script block(s) checked across ${files.length} file(s) — no syntax errors.`);
  process.exit(0);
} else {
  console.error(`\n✗ validate_all: ${errors} block(s) with syntax errors.`);
  process.exit(1);
}
