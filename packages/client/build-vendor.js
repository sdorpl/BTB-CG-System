#!/usr/bin/env node
// build-vendor.js — Copies vendor libs to vendor/ and bundles TipTap
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const NM = path.join(ROOT, 'node_modules');
const VENDOR = path.join(__dirname, 'vendor');

// Ensure vendor/ directory
fs.mkdirSync(VENDOR, { recursive: true });

// Copy vendor files
const copies = [
    ['sortablejs/Sortable.min.js', 'sortable.min.js'],
    ['gsap/dist/gsap.min.js', 'gsap.min.js'],
    ['handlebars/dist/handlebars.min.js', 'handlebars.min.js'],
];

for (const [src, dest] of copies) {
    const from = path.join(NM, src);
    const to = path.join(VENDOR, dest);
    if (!fs.existsSync(from)) {
        console.error(`  MISSING: ${from}`);
        process.exit(1);
    }
    fs.copyFileSync(from, to);
    console.log(`  ${dest}`);
}

// Copy ace-builds (needs multiple files for modes/themes)
const aceSrc = path.join(NM, 'ace-builds', 'src-min-noconflict');
const aceDest = path.join(VENDOR, 'ace');
fs.mkdirSync(aceDest, { recursive: true });

const aceFiles = [
    'ace.js',
    'mode-html.js',
    'mode-css.js',
    'mode-javascript.js',
    'mode-json.js',
    'theme-one_dark.js',
    'worker-html.js',
    'worker-css.js',
    'worker-javascript.js',
    'worker-json.js',
];
for (const f of aceFiles) {
    const from = path.join(aceSrc, f);
    const to = path.join(aceDest, f);
    if (fs.existsSync(from)) {
        fs.copyFileSync(from, to);
        console.log(`  ace/${f}`);
    }
}

// Bundle TipTap with esbuild
console.log('  Bundling TipTap...');
execSync(
    `npx esbuild src/tiptap-bundle.js --bundle --format=iife --minify --outfile=vendor/tiptap.bundle.js`,
    { cwd: __dirname, stdio: 'inherit' }
);

console.log('Vendor build complete.');
