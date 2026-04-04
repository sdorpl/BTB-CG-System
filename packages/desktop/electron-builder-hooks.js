const fs = require('fs');
const path = require('path');

// Fix Linux sandbox issues for portable packages (AppImage, tar.gz).
// Chromium's SUID sandbox needs root:4755 and user-ns sandbox is blocked
// by AppArmor on Ubuntu 23.10+. We replace the binary with a wrapper
// script that passes --no-sandbox, matching what VS Code / Slack do.
exports.default = async function afterPack(context) {
    if (context.electronPlatformName !== 'linux') return;

    const appOutDir = context.appOutDir;

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
