const { app, BrowserWindow, Menu, nativeTheme, screen, ipcMain, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// ── Linux AppImage / Snap sandbox fix ────────────────────
if (process.platform === 'linux') {
    app.commandLine.appendSwitch('no-sandbox');
}

// Dark title bar on Windows/macOS
nativeTheme.themeSource = 'dark';

// Remove application menu (File, Help) from all windows
Menu.setApplicationMenu(null);

let serverProcess = null;
let serverPort = null;
let mainWindow = null;
let splashWindow = null;
let connectWindow = null;
let activeServerUrl = null; // The URL the app connected to (local or remote)
let serverStartTimeout = null;
let serverStderrLog = '';    // Capture stderr for diagnostics
let showingErrorDialog = false; // Prevent app.quit() while error dialog is open
let logFilePath = null;      // Path to diagnostic log file

// ── Diagnostic logging ──────────────────────────────────
function getLogFile() {
    if (!logFilePath) {
        logFilePath = path.join(app.getPath('userData'), 'server-error.log');
    }
    return logFilePath;
}

function writeLog(text) {
    try {
        fs.appendFileSync(getLogFile(), `[${new Date().toISOString()}] ${text}\n`);
    } catch { /* ignore */ }
}

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

// ── Start the backend server as a child process ─────────
function startServer() {
    const serverScript = getServerScript();
    const userDataPath = app.getPath('userData');

    // Clear previous log
    try { fs.writeFileSync(getLogFile(), `=== BTB CG System server log ===\nDate: ${new Date().toISOString()}\nPlatform: ${process.platform} ${process.arch}\nElectron: ${process.versions.electron}\nNode: ${process.versions.node}\nPackaged: ${app.isPackaged}\n\n`); } catch {}

    // Verify server script exists before attempting spawn
    if (!fs.existsSync(serverScript)) {
        const msg = `Server script not found: ${serverScript}`;
        console.error(`[Electron] ${msg}`);
        writeLog(msg);
        showServerError(`Plik serwera nie istnieje:\n${serverScript}`);
        return;
    }

    let nodeBin, spawnEnv;
    if (app.isPackaged) {
        // Packaged: use Electron binary with ELECTRON_RUN_AS_NODE
        nodeBin = process.execPath;
        spawnEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };

        // Verify native module binary exists (better-sqlite3)
        const bs3Binary = path.join(process.resourcesPath, 'server', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
        if (!fs.existsSync(bs3Binary)) {
            const msg = `better-sqlite3 native binary missing: ${bs3Binary}`;
            console.error(`[Electron] ${msg}`);
            writeLog(msg);
            showServerError(
                `Brak natywnego modułu better-sqlite3.\n\n` +
                `Oczekiwany plik:\n${bs3Binary}\n\n` +
                `Prawdopodobnie kompilacja nie uwzględniła poprawnej wersji dla tej platformy (${process.platform}).`
            );
            return;
        }

        writeLog(`Node binary: ${nodeBin}`);
        writeLog(`Server script: ${serverScript}`);
        writeLog(`bs3 binary: ${bs3Binary}`);
    } else {
        // Dev: use system node so regular native modules work
        const { execSync } = require('child_process');
        const whichCmd = process.platform === 'win32' ? 'where node' : 'which node';
        try {
            nodeBin = execSync(whichCmd, { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
        } catch { nodeBin = 'node'; }
        spawnEnv = { ...process.env };
    }

    spawnEnv.APPDATA_PATH = userDataPath;
    spawnEnv.CLIENT_ROOT = getClientRoot();

    console.log(`[Electron] Spawning server: "${nodeBin}" "${serverScript}"`);
    console.log(`[Electron] Platform: ${process.platform}, packaged: ${app.isPackaged}`);
    console.log(`[Electron] APPDATA_PATH: ${userDataPath}`);
    console.log(`[Electron] CLIENT_ROOT: ${spawnEnv.CLIENT_ROOT}`);
    writeLog(`Spawning server: "${nodeBin}" "${serverScript}"`);
    writeLog(`APPDATA_PATH: ${userDataPath}`);
    writeLog(`CLIENT_ROOT: ${spawnEnv.CLIENT_ROOT}`);

    serverStderrLog = '';

    try {
        serverProcess = spawn(nodeBin, [serverScript], {
            env: spawnEnv,
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(serverScript),
            windowsHide: true,
        });
    } catch (err) {
        console.error(`[Electron] spawn() threw:`, err);
        writeLog(`spawn() threw: ${err.message}`);
        showServerError(`Nie można uruchomić procesu serwera.\n\nBłąd: ${err.message}\n\nLog: ${getLogFile()}`);
        return;
    }

    // Handle spawn-level errors (critical on Windows — fires instead of 'exit')
    serverProcess.on('error', (err) => {
        console.error(`[Electron] Server process error:`, err);
        writeLog(`Server process error: ${err.message}`);
        clearTimeout(serverStartTimeout);
        serverProcess = null;
        showServerError(
            `Nie można uruchomić procesu serwera.\n\n` +
            `Ścieżka: ${nodeBin}\n` +
            `Błąd: ${err.message}\n\n` +
            `Log: ${getLogFile()}`
        );
    });

    // Timeout: if server doesn't start within 30s, show error
    serverStartTimeout = setTimeout(() => {
        if (!serverPort) {
            console.error('[Electron] Server start timed out after 30s');
            const stderrTail = serverStderrLog.slice(-500);
            stopServer();
            showServerError(
                'Serwer nie uruchomił się w wyznaczonym czasie (30s).\n\n' +
                (stderrTail ? `Ostatnie logi błędów:\n${stderrTail}` : 'Brak dodatkowych informacji.') +
                `\n\nLog: ${getLogFile()}`
            );
        }
    }, 30000);

    let stdoutBuffer = '';
    serverProcess.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(`[server] ${text}`);

        if (!serverPort) {
            stdoutBuffer += text;
            const match = stdoutBuffer.match(/__PORT__:(\d+)/);
            if (match) {
                clearTimeout(serverStartTimeout);
                serverPort = parseInt(match[1], 10);
                console.log(`[Electron] Server ready on port ${serverPort}`);
                activeServerUrl = `http://127.0.0.1:${serverPort}`;
                onServerReady();
                stdoutBuffer = '';
            }
        }
    });

    serverProcess.stderr.on('data', (data) => {
        const text = data.toString();
        process.stderr.write(`[server:err] ${text}`);
        writeLog(`[stderr] ${text.trimEnd()}`);
        serverStderrLog += text;
        if (serverStderrLog.length > 2048) serverStderrLog = serverStderrLog.slice(-2048);
    });

    serverProcess.on('exit', (code, signal) => {
        console.log(`[Electron] Server process exited — code: ${code}, signal: ${signal}`);
        writeLog(`Server exited — code: ${code}, signal: ${signal}`);
        const wasStarting = !serverPort;
        serverProcess = null;
        if (wasStarting) {
            clearTimeout(serverStartTimeout);
            const stderrTail = serverStderrLog.slice(-500);
            // Detect common native module errors
            let hint = '';
            if (stderrTail.includes('NODE_MODULE_VERSION') || stderrTail.includes('was compiled against')) {
                hint = '\n\nPrzyczyna: Moduł natywny (better-sqlite3) został skompilowany dla innej wersji Node/Electron.';
            } else if (stderrTail.includes('not a valid Win32 application') || stderrTail.includes('invalid ELF header')) {
                hint = '\n\nPrzyczyna: Moduł natywny został skompilowany dla innej platformy (Linux zamiast Windows lub odwrotnie).';
            } else if (stderrTail.includes('MODULE_NOT_FOUND') || stderrTail.includes('Cannot find module')) {
                hint = '\n\nPrzyczyna: Brakuje wymaganego modułu — sprawdź czy node_modules zostały poprawnie skopiowane.';
            } else if (code === 3221225477 || code === -1073741819) {
                // 0xC0000005 = Access Violation on Windows (common with wrong .node binary)
                hint = '\n\nPrzyczyna: Naruszenie dostępu (Access Violation) — prawdopodobnie nieprawidłowa binarka natywna dla tej platformy.';
            }
            showServerError(
                `Serwer zakończył działanie z kodem ${code} przed uruchomieniem.${hint}\n\n` +
                (stderrTail ? `Logi błędów:\n${stderrTail}` : 'Brak dodatkowych informacji — sprawdź instalację.') +
                `\n\nLog diagnostyczny: ${getLogFile()}`
            );
        }
    });
}

// ── Kill the server process on app quit ─────────────────
function stopServer() {
    if (serverStartTimeout) {
        clearTimeout(serverStartTimeout);
        serverStartTimeout = null;
    }
    if (serverProcess && !serverProcess.killed) {
        serverProcess.kill();
        serverProcess = null;
    }
}

// ── Show server error and allow retry ───────────────────
function showServerError(message) {
    // Set flag BEFORE closing windows to prevent window-all-closed from quitting
    showingErrorDialog = true;

    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();

    dialog.showMessageBox({
        type: 'error',
        title: 'BTB CG System — Błąd serwera',
        message: 'Nie udało się uruchomić serwera',
        detail: message,
        buttons: ['Spróbuj ponownie', 'Zamknij'],
    }).then(({ response }) => {
        showingErrorDialog = false;
        serverPort = null;
        if (response === 0) {
            showConnectDialog();
        } else {
            app.quit();
        }
    });
}

// ── Splash Screen ────────────────────────────────────────
function createSplash() {
    // transparent: true causes invisible windows on some Windows GPUs/RDP
    const isWin = process.platform === 'win32';
    splashWindow = new BrowserWindow({
        width: 380,
        height: 300,
        frame: false,
        transparent: !isWin,
        resizable: false,
        center: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        backgroundColor: isWin ? '#020617' : undefined,
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
        width: 440,
        height: 530,
        resizable: false,
        center: true,
        show: false,
        backgroundColor: '#020617',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-connect.js'),
        }
    });

    connectWindow.removeMenu();

    connectWindow.loadFile(path.join(__dirname, 'connect.html'));

    connectWindow.webContents.on('did-finish-load', () => {
        connectWindow.webContents.send('init-config', { lastRemoteUrl: lastRemote });
        // Close init splash and reveal connect dialog
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        if (connectWindow && !connectWindow.isDestroyed()) {
            connectWindow.show();
            connectWindow.focus();
        }
    });

    connectWindow.on('closed', () => {
        connectWindow = null;
        // If user closed dialog without choosing, quit
        if (!mainWindow && !showingErrorDialog) app.quit();
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
        backgroundColor: '#020617',
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: preloadPath,
        }
    });

    mainWindow.removeMenu();

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[Electron] Main window did-finish-load');
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // Handle network-level load failures (connection refused, DNS, etc.)
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error(`[Electron] Main window did-fail-load: ${errorCode} ${errorDescription} URL=${validatedURL}`);
        // Retry loading after a short delay (server may still be starting)
        if (activeServerUrl && validatedURL && validatedURL.startsWith(activeServerUrl)) {
            console.log('[Electron] Retrying URL load in 1s...');
            setTimeout(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.loadURL(activeServerUrl).catch(() => {});
                }
            }, 1000);
        }
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
function waitForServer(url, retries, delay) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        function tryFetch() {
            attempts++;
            const request = net.request(url);
            request.on('response', () => {
                console.log(`[Electron] Health check passed (attempt ${attempts})`);
                resolve();
            });
            request.on('error', (err) => {
                if (attempts < retries) {
                    setTimeout(tryFetch, delay);
                } else {
                    reject(err);
                }
            });
            request.end();
        }
        tryFetch();
    });
}

function onServerReady() {
    if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.executeJavaScript('window.__splashReady && window.__splashReady()').catch(() => {});
    }

    // Verify server is actually accepting HTTP connections before loading the URL
    waitForServer(activeServerUrl, 20, 150)
        .then(() => {
            console.log('[Electron] Server health check passed, loading URL');
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.loadURL(activeServerUrl);
            }
        })
        .catch((err) => {
            console.error('[Electron] Server health check failed:', err);
            // Try loading anyway — the did-fail-load handler will retry
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.loadURL(activeServerUrl).catch(() => {});
            }
        });
}

// ── Connect to remote server ─────────────────────────────
function connectToRemote(url) {
    activeServerUrl = url;
    saveConfig({ lastRemoteUrl: url });

    createMainWindow();

    if (connectWindow && !connectWindow.isDestroyed()) {
        connectWindow.close();
    }

    mainWindow.loadURL(url);
    mainWindow.show();
}

// ── Launch local server flow ─────────────────────────────
function launchLocal() {
    // Reuse existing splash if still open, otherwise create new one
    if (!splashWindow || splashWindow.isDestroyed()) {
        createSplash();
    }
    createMainWindow();

    if (connectWindow && !connectWindow.isDestroyed()) {
        connectWindow.close();
    }

    startServer();
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
    // Show splash immediately so the user sees something right away
    createSplash();
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
        // Don't quit while showing error dialog — user needs to see it
        if (showingErrorDialog) return;
        stopServer();
        app.quit();
    }
});
