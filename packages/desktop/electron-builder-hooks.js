const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Recursively copy a directory
function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

exports.default = async function afterPack(context) {
    const appOutDir = context.appOutDir;
    const resourcesDir = path.join(appOutDir, 'resources');

    // ── Copy server node_modules (electron-builder skips them via extraResources) ──
    const serverNM = path.join(__dirname, '..', 'server', 'node_modules');
    const destNM = path.join(resourcesDir, 'server', 'node_modules');
    if (fs.existsSync(serverNM) && !fs.existsSync(destNM)) {
        console.log('[afterPack] Copying server/node_modules to resources...');
        copyDirSync(serverNM, destNM);
        console.log('[afterPack] server/node_modules copied.');
    }

    // ── Rebuild better-sqlite3 for Electron ──
    // @electron/rebuild doesn't work against the stripped packaged node_modules,
    // so we rebuild in a temp dir and copy the resulting .node binary.
    const electronVersion = context.packager.config.electronVersion;
    const targetPlatform = context.electronPlatformName; // 'linux', 'win32', 'darwin'
    const destBinaryDir = path.join(resourcesDir, 'server', 'node_modules', 'better-sqlite3', 'build', 'Release');
    const destBinary = path.join(destBinaryDir, 'better_sqlite3.node');
    const os = require('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bs3-rebuild-'));
    const isNativeBuild = (targetPlatform === process.platform);

    console.log(`[afterPack] Rebuilding better-sqlite3 for Electron ${electronVersion} (${targetPlatform}, native=${isNativeBuild})...`);

    // Search for .node binary recursively under a directory
    function findNodeBinary(dir) {
        const candidates = [
            path.join(dir, 'build', 'Release', 'better_sqlite3.node'),
            path.join(dir, 'build', 'Debug', 'better_sqlite3.node'),
        ];
        // Also check prebuilds/ directory (prebuild-install puts files here)
        const prebuildsDir = path.join(dir, 'prebuilds');
        if (fs.existsSync(prebuildsDir)) {
            for (const sub of fs.readdirSync(prebuildsDir)) {
                const subDir = path.join(prebuildsDir, sub);
                if (fs.statSync(subDir).isDirectory()) {
                    for (const f of fs.readdirSync(subDir)) {
                        if (f.endsWith('.node')) {
                            candidates.push(path.join(subDir, f));
                        }
                    }
                }
            }
        }
        for (const c of candidates) {
            if (fs.existsSync(c)) return c;
        }
        return null;
    }

    try {
        execSync('npm init -y', { cwd: tmpDir, stdio: 'ignore' });
        execSync('npm install better-sqlite3@12.8.0 --ignore-scripts', { cwd: tmpDir, stdio: 'inherit' });

        const bs3Dir = path.join(tmpDir, 'node_modules', 'better-sqlite3');

        if (isNativeBuild) {
            // Native platform: use @electron/rebuild to compile from source
            execSync(`npx --yes @electron/rebuild -m "${tmpDir}" -o better-sqlite3 -v ${electronVersion}`, {
                cwd: tmpDir, stdio: 'inherit'
            });
        } else {
            // Cross-compile: try multiple strategies in order
            let downloaded = false;

            // Strategy 1: prebuild-install with NAPI runtime
            if (!downloaded) {
                try {
                    console.log('[afterPack] Trying prebuild-install (napi)...');
                    execSync(
                        `npx --yes prebuild-install -r napi --arch x64 --platform ${targetPlatform} --tag-prefix v`,
                        { cwd: bs3Dir, stdio: 'inherit' }
                    );
                    downloaded = !!findNodeBinary(bs3Dir);
                    if (downloaded) console.log('[afterPack] prebuild-install (napi) succeeded.');
                } catch (e) {
                    console.log('[afterPack] prebuild-install (napi) failed:', e.message);
                }
            }

            // Strategy 2: prebuild-install with electron runtime
            if (!downloaded) {
                try {
                    console.log('[afterPack] Trying prebuild-install (electron runtime)...');
                    execSync(
                        `npx --yes prebuild-install --runtime electron --target ${electronVersion} --arch x64 --platform ${targetPlatform} --tag-prefix v`,
                        { cwd: bs3Dir, stdio: 'inherit' }
                    );
                    downloaded = !!findNodeBinary(bs3Dir);
                    if (downloaded) console.log('[afterPack] prebuild-install (electron) succeeded.');
                } catch (e) {
                    console.log('[afterPack] prebuild-install (electron) failed:', e.message);
                }
            }

            // Strategy 3: @electron/rebuild with cross-compile env vars
            if (!downloaded && targetPlatform === 'win32') {
                try {
                    console.log('[afterPack] Trying @electron/rebuild with npm_config_platform=win32...');
                    execSync(
                        `npx --yes @electron/rebuild -m "${tmpDir}" -o better-sqlite3 -v ${electronVersion}`,
                        {
                            cwd: tmpDir, stdio: 'inherit',
                            env: { ...process.env, npm_config_platform: 'win32', npm_config_arch: 'x64' }
                        }
                    );
                    downloaded = !!findNodeBinary(bs3Dir);
                    if (downloaded) console.log('[afterPack] @electron/rebuild cross-compile succeeded.');
                } catch (e) {
                    console.log('[afterPack] @electron/rebuild cross-compile failed:', e.message);
                }
            }
        }

        // Find the binary wherever it ended up
        const builtBinary = findNodeBinary(bs3Dir);
        if (builtBinary) {
            // Validate: on cross-compile, check it's not a Linux ELF binary targeting Windows
            if (targetPlatform === 'win32') {
                const header = Buffer.alloc(2);
                const fd = fs.openSync(builtBinary, 'r');
                fs.readSync(fd, header, 0, 2, 0);
                fs.closeSync(fd);
                if (header[0] === 0x7f && header[1] === 0x45) { // ELF magic
                    console.error('[afterPack] ERROR: Binary is Linux ELF but target is win32! Skipping copy.');
                } else {
                    fs.mkdirSync(destBinaryDir, { recursive: true });
                    fs.copyFileSync(builtBinary, destBinary);
                    console.log(`[afterPack] better-sqlite3 .node binary copied from: ${builtBinary}`);
                }
            } else if (targetPlatform === 'darwin') {
                const header = Buffer.alloc(4);
                const fd = fs.openSync(builtBinary, 'r');
                fs.readSync(fd, header, 0, 4, 0);
                fs.closeSync(fd);
                if (header[0] === 0x7f && header[1] === 0x45) { // ELF magic
                    console.error('[afterPack] ERROR: Binary is Linux ELF but target is darwin! Skipping copy.');
                } else {
                    fs.mkdirSync(destBinaryDir, { recursive: true });
                    fs.copyFileSync(builtBinary, destBinary);
                    console.log(`[afterPack] better-sqlite3 .node binary copied from: ${builtBinary}`);
                }
            } else {
                fs.mkdirSync(destBinaryDir, { recursive: true });
                fs.copyFileSync(builtBinary, destBinary);
                console.log(`[afterPack] better-sqlite3 .node binary copied from: ${builtBinary}`);
            }
        } else {
            console.error('[afterPack] ERROR: No .node binary found after rebuild!');
            console.error('[afterPack] Searched in:', bs3Dir);
            // List what's in the directory for debugging
            try {
                const listing = execSync(`find "${bs3Dir}" -name "*.node" -o -name "prebuilds" 2>/dev/null || dir /s /b "${bs3Dir}\\*.node" 2>nul`, { encoding: 'utf8' });
                console.error('[afterPack] Found files:', listing || '(none)');
            } catch { /* ignore */ }
        }
    } catch (err) {
        console.error('[afterPack] ERROR: Failed to rebuild better-sqlite3:', err.message);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    // ── Linux sandbox fixes ──
    if (context.electronPlatformName !== 'linux') return;

    // 1. Remove chrome-sandbox (SUID sandbox — can't work in portable)
    const chromeSandbox = path.join(appOutDir, 'chrome-sandbox');
    if (fs.existsSync(chromeSandbox)) {
        fs.unlinkSync(chromeSandbox);
        console.log('[afterPack] Removed chrome-sandbox');
    }

    // 2. Wrap the executable with a shell script that injects --no-sandbox
    const execName = context.packager.executableName;
    const execPath = path.join(appOutDir, execName);

    if (fs.existsSync(execPath)) {
        const realBin = execPath + '.bin';
        fs.renameSync(execPath, realBin);
        fs.writeFileSync(execPath, [
            '#!/bin/bash',
            'SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"',
            'exec "$SCRIPT_DIR/' + execName + '.bin" --no-sandbox "$@"',
            ''
        ].join('\n'), { mode: 0o755 });
        console.log(`[afterPack] Created --no-sandbox wrapper for ${execName}`);
    }
};
