const fs = require('fs');
const path = require('path');

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
