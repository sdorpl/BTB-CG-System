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
    const isNativeBuild = (targetPlatform === process.platform) || (targetPlatform === 'linux' && process.platform === 'linux');

    console.log(`[afterPack] Rebuilding better-sqlite3 for Electron ${electronVersion} (${targetPlatform})...`);
    try {
        execSync('npm init -y', { cwd: tmpDir, stdio: 'ignore' });
        execSync('npm install better-sqlite3@12.8.0 --ignore-scripts', { cwd: tmpDir, stdio: 'inherit' });

        if (isNativeBuild) {
            // Native platform: use @electron/rebuild to compile from source
            execSync(`npx --yes @electron/rebuild -m "${tmpDir}" -o better-sqlite3 -v ${electronVersion}`, {
                cwd: tmpDir, stdio: 'inherit'
            });
        } else {
            // Cross-compile: use prebuild-install to download prebuilt binary
            const bs3Dir = path.join(tmpDir, 'node_modules', 'better-sqlite3');
            execSync(
                `npx --yes prebuild-install --runtime electron --target ${electronVersion} --arch x64 --platform ${targetPlatform} --tag-prefix v`,
                { cwd: bs3Dir, stdio: 'inherit' }
            );
        }

        const builtBinary = path.join(tmpDir, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
        if (fs.existsSync(builtBinary)) {
            fs.mkdirSync(destBinaryDir, { recursive: true });
            fs.copyFileSync(builtBinary, destBinary);
            console.log('[afterPack] better-sqlite3 .node binary replaced with Electron build.');
        } else {
            console.error('[afterPack] WARNING: Rebuilt binary not found at', builtBinary);
        }
    } catch (err) {
        console.error('[afterPack] WARNING: Failed to rebuild better-sqlite3:', err.message);
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
