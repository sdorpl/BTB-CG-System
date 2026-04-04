const { app, BrowserWindow, nativeTheme, screen } = require('electron');
const path = require('path');

// ── Linux AppImage / Snap sandbox fix ────────────────────
if (process.platform === 'linux') {
    app.commandLine.appendSwitch('no-sandbox');
}

// Dark title bar on Windows/macOS
nativeTheme.themeSource = 'dark';

const userDataPath = app.getPath('userData');
process.env.APPDATA_PATH = userDataPath;

const { serverEvents } = require('./server.js');

let serverPort = null;
let mainWindow = null;
let splashWindow = null;

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
    // 70% of screen area, 16:10 aspect ratio
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

    // Smooth show: wait until DOM is painted to avoid white flash
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

    // Local keyboard shortcuts (no system-wide registration → no KDE notifications)
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
serverEvents.on('ready', (port) => {
    serverPort = port;
    console.log(`[Electron] Server ready on port ${port}`);

    // Signal splash to show 100%
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.executeJavaScript('window.__splashReady && window.__splashReady()').catch(() => {});
    }

    // Small delay so the user sees "Launching…" before transition
    setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(`http://localhost:${port}`);
        }
    }, 400);
});

// ── App Lifecycle ────────────────────────────────────────
app.whenReady().then(() => {
    createSplash();
    createWindow();

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

app.on('will-quit', () => {});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
