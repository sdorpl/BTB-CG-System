const { app, BrowserWindow, nativeTheme, screen, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
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
let connectWindow = null;
let activeServerUrl = null; // The URL the app connected to (local or remote)

// ── Persistent config (simple JSON in userData) ─────────
const CONFIG_FILE = path.join(app.getPath('userData'), 'cg-config.json');

function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch { return {}; }
}

function saveConfig(data) {
    const existing = loadConfig();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, ...data }, null, 2));
}

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
function getNodeBinary() {
    if (app.isPackaged) {
        const bundled = path.join(process.resourcesPath, 'node',
            process.platform === 'win32' ? 'node.exe' : 'node');
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
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
    });

    let stdoutBuffer = '';
    serverProcess.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(`[server] ${text}`);

        if (!serverPort) {
            stdoutBuffer += text;
            const match = stdoutBuffer.match(/__PORT__:(\d+)/);
            if (match) {
                serverPort = parseInt(match[1], 10);
                console.log(`[Electron] Server ready on port ${serverPort}`);
                activeServerUrl = `http://localhost:${serverPort}`;
                onServerReady();
                stdoutBuffer = '';
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

// ── Connect Dialog ───────────────────────────────────────
function showConnectDialog() {
    const config = loadConfig();
    const lastRemote = config.lastRemoteUrl || '';

    connectWindow = new BrowserWindow({
        width: 460,
        height: 340,
        frame: false,
        resizable: false,
        center: true,
        backgroundColor: '#0d1320',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-connect.js'),
        }
    });

    connectWindow.loadFile(path.join(__dirname, 'connect.html'));

    connectWindow.webContents.on('did-finish-load', () => {
        connectWindow.webContents.send('init-config', { lastRemoteUrl: lastRemote });
    });

    connectWindow.on('closed', () => {
        connectWindow = null;
        // If user closed dialog without choosing, quit
        if (!mainWindow) app.quit();
    });
}

// ── Main Window ──────────────────────────────────────────
function createMainWindow() {
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
    const winW = Math.round(Math.sqrt(0.7 * screenW * screenH * 16 / 10));
    const winH = Math.round(winW * 10 / 16);

    const preloadPath = path.join(__dirname, 'preload.js');

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
            preload: preloadPath,
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
function onServerReady() {
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.executeJavaScript('window.__splashReady && window.__splashReady()').catch(() => {});
    }

    setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(activeServerUrl);
        }
    }, 400);
}

// ── Connect to remote server ─────────────────────────────
function connectToRemote(url) {
    activeServerUrl = url;
    saveConfig({ lastRemoteUrl: url });

    if (connectWindow && !connectWindow.isDestroyed()) {
        connectWindow.close();
    }

    createMainWindow();
    mainWindow.loadURL(url);
    mainWindow.show();
}

// ── Launch local server flow ─────────────────────────────
function launchLocal() {
    if (connectWindow && !connectWindow.isDestroyed()) {
        connectWindow.close();
    }

    createSplash();
    createMainWindow();
    startServer();

    if (serverPort && mainWindow) {
        mainWindow.loadURL(`http://localhost:${serverPort}`);
    }
}

// ── IPC Handlers ─────────────────────────────────────────
ipcMain.on('connect-local', () => {
    launchLocal();
});

ipcMain.on('connect-remote', (_event, url) => {
    connectToRemote(url);
});

ipcMain.handle('get-server-url', () => {
    return activeServerUrl || '';
});

// ── App Lifecycle ────────────────────────────────────────
app.whenReady().then(() => {
    showConnectDialog();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            showConnectDialog();
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
