/**
 * Prebuild script: installs server dependencies in an isolated directory
 * to ensure flat/hoisted node_modules (avoids Windows MAX_PATH issues with nested deps).
 *
 * Running `npm install` inside the workspace would create deeply nested node_modules
 * (14+ levels deep, 270+ char paths) because npm respects workspace hoisting rules.
 * By copying package.json to a temp dir and installing there, we get a truly flat
 * structure (~5 levels deep, ~70 char paths) that works safely on Windows.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const serverDir = path.join(__dirname, '..', 'server');
// Use a temp dir on the same filesystem to allow rename (avoids EXDEV cross-device error)
const tmpDir = path.join(__dirname, '..', '.server-deps-tmp-' + Date.now());

try {
    // 1. Create isolated temp directory with server's package.json
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.copyFileSync(
        path.join(serverDir, 'package.json'),
        path.join(tmpDir, 'package.json')
    );

    // 2. Install production deps in isolation (flat hoisted structure)
    console.log('[prebuild] Installing server dependencies (isolated, flat)...');
    execSync('npm install --omit=dev --ignore-scripts', {
        cwd: tmpDir,
        stdio: 'inherit',
    });

    // 3. Replace server's node_modules with the flat version
    const serverNM = path.join(serverDir, 'node_modules');
    if (fs.existsSync(serverNM)) {
        fs.rmSync(serverNM, { recursive: true, force: true });
    }
    fs.renameSync(path.join(tmpDir, 'node_modules'), serverNM);
    console.log('[prebuild] Flat node_modules installed into server/');

    // 4. Rebuild native modules (better-sqlite3) for current platform
    console.log('[prebuild] Rebuilding better-sqlite3...');
    execSync('npm rebuild better-sqlite3', {
        cwd: serverDir,
        stdio: 'inherit',
    });

    console.log('[prebuild] Done.');
} finally {
    // Cleanup temp dir
    fs.rmSync(tmpDir, { recursive: true, force: true });
}
