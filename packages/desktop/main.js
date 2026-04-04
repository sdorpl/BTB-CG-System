const { app, BrowserWindow, nativeTheme, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// ── Linux AppImage / Snap sandbox fix ────────────────────
if (process.platform === 'linux') {
    app.commandLine.appendSwitch('no-sandbox');
}

// Dark title bar on Windows/macOS
nativeTheme.themeSource = 'dark';

let serverProcess = null;
let serverPort = null;
let mainWindow = null;
let splashWindow = null;

// ── Resolve paths (dev vs packaged) ─────────────────────
function getServerScript() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'server', 'server.js');
    }
    return path.join(__dirname, '..', 'server', 'server.js');
}

function getClientRoot() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'client');
    }
    return path.join(__dirname, '..', 'client');
}

// ── Locate system Node.js binary ────────────────────────
// We use spawn('node', ...) instead of fork() because fork() would use
// Electron's built-in Node (different NODE_MODULE_VERSION), causing native
// module (better-sqlite3) load failures. Spawn uses the system Node.
function getNodeBinary() {
    // In packaged builds, bundle Node alongside or rely on system Node
    if (app.isPackaged) {
        const bundled = path.join(process.resourcesPath, 'node',
            process.platform === 'win32' ? 'node.exe' : 'node');
        const fs = require('fs');
        if (fs.existsSync(bundled)) return bundled;
    }
    return 'node'; // system PATH
}

// ── Start the backend server as a child process ─────────
function startServer() {
    const serverScript = getServerScript();
    const userDataPath = app.getPath('userData');
    const nodeBin = getNodeBinary();

    serverProcess = spawn(nodeBin, [serverScript], {
        env: {
            ...process.env,
            APPDATA_PATH: userDataPath,
            CLIENT_ROOT: getClientRoot(),
            // PORT not set → server will listen on a random free port (0)
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
    });

    // Parse port from server stdout (looks for "__PORT__:12345")
    let stdoutBuffer = '';
    serverProcess.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(`[server] ${text}`);

        // Accumulate and scan for port announcement
        if (!serverPort) {
            stdoutBuffer += text;
            const match = stdoutBuffer.match(/__PORT__:(\d+)/);
            if (match) {
                serverPort = parseInt(match[1], 10);
                console.log(`[Electron] Server ready on port ${serverPort}`);
                onServerReady(serverPort);
                stdoutBuffer = ''; // free memory
            }
        }
    });

    serverProcess.stderr.on('data', (data) => {
        process.stderr.write(`[server:err] ${data}`);
    });

    serverProcess.on('exit', (code) => {
        console.log(`[Electron] Server process exited with code ${code}`);
        serverProcess = null;
    });
}

// ── Kill the server process on app quit ─────────────────
function stopServer() {
    if (serverProcess && !serverProcess.killed) {
        serverProcess.kill();
        serverProcess = null;
    }
}

// ── Splash Screen ────────────────────────────────────────
function createSplash() {
    splashWindow = new BrowserWindow({
        width: 420,
        height: 340,
        frame: false,
        transparent: true,
        resizable: false,
        center: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    splashWindow.on('closed', () => { splashWindow = null; });
}

// ── Main Window ──────────────────────────────────────────
function createWindow() {
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
    const winW = Math.round(Math.sqrt(0.7 * screenW * screenH * 16 / 10));
    const winH = Math.round(winW * 10 / 16);

    mainWindow = new BrowserWindow({
        width: Math.min(winW, screenW),
        height: Math.min(winH, screenH),
        minWidth: 1024,
        minHeight: 600,
        title: 'BTB CG System',
        icon: path.join(__dirname, 'icon.png'),
        show: false,
        backgroundColor: '#0d1320',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    mainWindow.removeMenu();

    mainWindow.webContents.on('did-finish-load', () => {
        setTimeout(() => {
            if (splashWindow && !splashWindow.isDestroyed()) {
                splashWindow.close();
            }
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.show();
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.focus();
            }
        }, 300);
    });

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            mainWindow.webContents.toggleDevTools();
            event.preventDefault();
        } else if (input.key === 'F5') {
            mainWindow.webContents.reloadIgnoringCache();
            event.preventDefault();
        }
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Server Ready → load app ──────────────────────────────
function onServerReady(port) {
    // Signal splash to show 100%
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.executeJavaScript('window.__splashReady && window.__splashReady()').catch(() => {});
    }

    setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(`http://localhost:${port}`);
        }
    }, 400);
}

// ── App Lifecycle ────────────────────────────────────────
app.whenReady().then(() => {
    createSplash();
    createWindow();
    startServer();

    // Fallback: if server was already ready before windows were created
    if (serverPort && mainWindow) {
        mainWindow.loadURL(`http://localhost:${serverPort}`);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('before-quit', () => {
    stopServer();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        stopServer();
        app.quit();
    }
});
