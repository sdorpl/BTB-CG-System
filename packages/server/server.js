const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const multer = require('multer');
const os = require('os');

// Suppress EPIPE / ECONNRESET crashes when clients disconnect mid-write
process.on('uncaughtException', (err) => {
    if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
    console.error('[FATAL]', err);
    process.exit(1);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const appDataPath = process.env.APPDATA_PATH || __dirname;
// PORT=0 → OS assigns a free port (used by Electron); explicit PORT for standalone/Docker
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 0;
const DB_FILE = process.env.DATABASE_URL || path.join(appDataPath, 'database.sqlite');
// Client static files root — set by Electron or default to sibling package
const CLIENT_ROOT = process.env.CLIENT_ROOT || path.join(__dirname, '..', 'client');

// Ensure the directory for the database file exists (needed in packaged mode)
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbExists = fs.existsSync(DB_FILE) && fs.statSync(DB_FILE).isFile();
console.log(`[DB] Using database file: ${DB_FILE}`);
console.log(`[DB] Valid file exists on start: ${dbExists} (${dbExists ? fs.statSync(DB_FILE).size : 0} bytes)`);

let appState = { settings: {}, templates: [], graphics: [], groups: [], presets: [] };

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
console.log(`Connected to SQLite database (better-sqlite3).`);

if (!dbExists) {
    console.log("[DB] Database file missing or empty. Initializing schema...");
    ensureDatabaseInitialized();
} else {
    console.log("[DB] Database file found. Loading state...");
    loadStateFromDB();
    syncTemplateFilesToDB();
    startServer();
}

// Konfiguracja uploadu plików (multer)
const UPLOADS_DIR = path.join(appDataPath, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const ALLOWED_UPLOAD_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.webm', '.mp4', '.mp3', '.ogg', '.wav', '.ttf', '.otf', '.woff', '.woff2']);
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!ALLOWED_UPLOAD_EXTS.has(ext)) {
            return cb(new Error('File type not allowed'));
        }
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + ext);
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // max 10MB

// Funkcja automatycznej inicjalizacji bazy danych przy pierwszym uruchomieniu
function ensureDatabaseInitialized() {
    console.log("[DB] Ensuring database schema...");
    db.exec(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)`);
    db.exec(`CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
    db.exec(`CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
    db.exec(`CREATE TABLE IF NOT EXISTS graphics (id TEXT PRIMARY KEY, templateId TEXT, name TEXT, groupId TEXT, visible INTEGER DEFAULT 0, data TEXT NOT NULL)`);
    db.exec(`CREATE TABLE IF NOT EXISTS presets (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL, data TEXT NOT NULL)`);
    console.log("[DB] Schema ensured.");

    // SEEDING: Jeśli baza jest pusta, a mamy db.json, to importujemy go
    const row = db.prepare("SELECT COUNT(*) as count FROM settings").get();
    if (row && row.count === 0) {
        const jsonPath = path.join(__dirname, 'db.json');
        if (fs.existsSync(jsonPath)) {
            console.log("[DB] Database is empty. Seeding from db.json...");
            try {
                const rawData = fs.readFileSync(jsonPath, 'utf8');
                const state = JSON.parse(rawData);

                const seed = db.transaction(() => {
                    if (state.settings) {
                        db.prepare('INSERT OR REPLACE INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(state.settings));
                    }
                    if (state.templates && state.templates.length > 0) {
                        const stmt = db.prepare('INSERT OR REPLACE INTO templates (id, data) VALUES (?, ?)');
                        for (const t of state.templates) {
                            if (!t.id) continue;
                            stmt.run(t.id, JSON.stringify(t));
                        }
                    }
                    if (state.groups && state.groups.length > 0) {
                        const stmt = db.prepare('INSERT INTO groups (id, data) VALUES (?, ?)');
                        for (const g of state.groups) {
                            stmt.run(g.id, JSON.stringify(g));
                        }
                    }
                    if (state.graphics && state.graphics.length > 0) {
                        const stmt = db.prepare('INSERT INTO graphics (id, templateId, name, groupId, visible, data) VALUES (?, ?, ?, ?, ?, ?)');
                        for (const g of state.graphics) {
                            const visibleInt = g.visible ? 1 : 0;
                            stmt.run(g.id, g.templateId || null, g.name || '', g.groupId || null, visibleInt, JSON.stringify(g));
                        }
                    }
                });
                seed();
                console.log("[DB] Seeding complete.");
            } catch (e) {
                console.error("[DB] Seeding failed:", e.message);
            }
        } else {
            console.log("[DB] No db.json found for seeding.");
        }
    }

    loadStateFromDB();
    syncTemplateFilesToDB();
    startServer();
}

// Auto-sync template JSON files from templates/ directory into the DB on startup
function syncTemplateFilesToDB() {
    const tplDir = path.join(__dirname, 'templates');
    if (!fs.existsSync(tplDir)) return;
    const files = fs.readdirSync(tplDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) return;

    console.log(`[DB] Syncing ${files.length} template files from templates/ ...`);
    const stmtTpl = db.prepare('INSERT OR REPLACE INTO templates (id, data) VALUES (?, ?)');
    const stmtGfx = db.prepare('INSERT OR REPLACE INTO graphics (id, templateId, name, groupId, visible, data) VALUES (?, ?, ?, ?, ?, ?)');

    const syncAll = db.transaction(() => {
        for (const fn of files) {
            try {
                const raw = JSON.parse(fs.readFileSync(path.join(tplDir, fn), 'utf8'));

                // Support v2 bundled format (template + graphics)
                if (raw._exportVersion === 2 && raw.template) {
                    const tpl = raw.template;
                    if (!tpl.id) continue;
                    stmtTpl.run(tpl.id, JSON.stringify(tpl));
                    if (Array.isArray(raw.graphics)) {
                        for (const g of raw.graphics) {
                            if (!g.id) continue;
                            stmtGfx.run(g.id, g.templateId || null, g.name || '', g.groupId || null, g.visible ? 1 : 0, JSON.stringify(g));
                        }
                    }
                } else {
                    // Legacy format — plain template object
                    if (!raw.id) continue;
                    stmtTpl.run(raw.id, JSON.stringify(raw));
                }
            } catch (e) {
                console.warn(`[DB] Skipping ${fn}: ${e.message}`);
            }
        }
    });
    syncAll();
    console.log(`[DB] Template files synced.`);
    // Reload state to pick up updated templates
    loadStateFromDB();
}

// Funkcja ładująca stan z bazy SQLite do RAM (synchronous)
function loadStateFromDB() {
    console.log("[DB] Loading state from SQLite...");
    // Ensure presets table exists (migration for existing databases)
    db.exec(`CREATE TABLE IF NOT EXISTS presets (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL, data TEXT NOT NULL)`);

    let settings = {};
    const settingsRow = db.prepare("SELECT data FROM settings WHERE id = 1").get();
    if (settingsRow) { try { settings = JSON.parse(settingsRow.data); } catch(e){} }

    const templates = db.prepare("SELECT data FROM templates").all()
        .map(r => { try { return JSON.parse(r.data); } catch(e) { return null; } }).filter(Boolean);

    const groups = db.prepare("SELECT data FROM groups").all()
        .map(r => { try { return JSON.parse(r.data); } catch(e) { return null; } }).filter(Boolean);

    const graphics = db.prepare("SELECT id, templateId, name, groupId, visible, data FROM graphics").all()
        .map(r => {
            let parsed = {};
            try { parsed = JSON.parse(r.data); } catch(e){}
            return { ...parsed, id: r.id, templateId: r.templateId, name: r.name, groupId: r.groupId, visible: r.visible === 1 };
        });

    const presets = db.prepare("SELECT id, name, created_at, data FROM presets ORDER BY created_at ASC").all()
        .map(r => { try { const d = JSON.parse(r.data); return { id: r.id, name: r.name, created_at: r.created_at, ...d }; } catch(e) { return null; } }).filter(Boolean);

    appState = { settings, templates, groups, graphics, presets };
    console.log(`[DB] State fully loaded. Graphics: ${graphics.length}, Templates: ${templates.length}, Presets: ${presets.length}`);
}

// Pojedyncza funkcja synchronizująca cały stan (settings, templates, groups, graphics) w jednej transakcji.
const syncFullStateToDB = db.transaction((state) => {
    // 1. Settings
    if (state.settings) {
        db.prepare("INSERT OR REPLACE INTO settings (id, data) VALUES (1, ?)").run(JSON.stringify(state.settings));
    }

    // 2. Templates
    if (state.templates !== undefined) {
        db.prepare("DELETE FROM templates").run();
        if (state.templates && state.templates.length > 0) {
            const stmtTpl = db.prepare('INSERT OR REPLACE INTO templates (id, data) VALUES (?, ?)');
            for (const t of state.templates) {
                if (!t.id) continue;
                stmtTpl.run(t.id, JSON.stringify(t));
            }
        }
    }

    // 3. Groups
    db.prepare("DELETE FROM groups").run();
    if (state.groups && state.groups.length > 0) {
        const stmtGrp = db.prepare('INSERT INTO groups (id, data) VALUES (?, ?)');
        for (const g of state.groups) {
            stmtGrp.run(g.id, JSON.stringify(g));
        }
    }

    // 4. Graphics
    db.prepare("DELETE FROM graphics").run();
    if (state.graphics && state.graphics.length > 0) {
        const stmtGfx = db.prepare('INSERT INTO graphics (id, templateId, name, groupId, visible, data) VALUES (?, ?, ?, ?, ?, ?)');
        for (const g of state.graphics) {
            const visibleInt = g.visible ? 1 : 0;
            stmtGfx.run(g.id, g.templateId || null, g.name || '', g.groupId || null, visibleInt, JSON.stringify(g));
        }
    }
});


// Start
// Usunięto loadStateFromDB() stąd, jest wywoływane wewnątrz ensureDatabaseInitialized()

// Block access to database files via static serving
app.use((req, res, next) => {
    if (/\.sqlite(-\w+)?$/i.test(req.path) || /db\.json$/i.test(req.path)) {
        return res.status(403).end();
    }
    next();
});

// Serve client static files from the client package
if (fs.existsSync(CLIENT_ROOT)) {
    app.use(express.static(CLIENT_ROOT));
}
// Serwowanie katalogu z uploadami
app.use('/uploads', express.static(UPLOADS_DIR));

// Endpoint z informacjami o serwerze (adresy IP, port)
app.get('/api/server-info', (req, res) => {
    const networkInterfaces = os.networkInterfaces();
    const lanIps = [];
    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                lanIps.push(net.address);
            }
        }
    }
    const actualPort = server.address().port;
    res.json({ port: actualPort, lanIps });
});

// Endpoint do uploadu pliku (zastępuje osadzanie Base64 w grafice)
app.post('/api/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
        next();
    });
}, (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    console.log(`[UPLOAD] Saved: ${req.file.filename} (${req.file.size} bytes)`);
    res.json({ url });
});

io.on('connection', (socket) => {
    console.log(`[+] Client connected: ${socket.id}`);
    
    // Send current memory state to newly connected client
    socket.emit('initialState', appState);

    // Listen for FULL state updates from the control panel
    // Dla optymalizacji oddzielamy zapis grafiki od zapisu całych struktur
    socket.on('updateState', (newState) => {
        if (!newState || (!newState.templates && !newState.graphics)) {
            console.error(`[!] Rejected updateState from ${socket.id}: State is null or empty.`);
            return;
        }

        console.log(`[u] Received updateState from ${socket.id}. Graphics: ${newState.graphics?.length || 0}, Templates: ${newState.templates?.length || 0}`);
        // Preserve server-managed presets — clients don't own this list
        appState = { ...newState, presets: appState.presets || [] };
        // Broadcast the updated state to ALL connected clients
        io.emit('stateUpdated', appState);
        
        // Persist to disk — jedna atomowa transakcja dla całego stanu
        syncFullStateToDB(newState);
    });

    // ── PRESET MANAGEMENT ──────────────────────────────────────
    socket.on('savePreset', ({ id, name, graphics, groups }) => {
        if (!id || !name) { console.error('[preset] savePreset: missing id or name'); return; }
        const existing = appState.presets.find(p => p.id === id);
        const created_at = existing ? existing.created_at : Date.now();
        const data = JSON.stringify({ graphics, groups });
        try {
            db.prepare('INSERT OR REPLACE INTO presets (id, name, created_at, data) VALUES (?, ?, ?, ?)').run(id, name, created_at, data);
            console.log(`[preset] Saved: "${name}" (${id})`);
            const presetObj = { id, name, created_at, graphics, groups };
            const idx = appState.presets.findIndex(p => p.id === id);
            if (idx >= 0) {
                appState.presets[idx] = presetObj;
            } else {
                appState.presets.push(presetObj);
            }
            io.emit('stateUpdated', appState);
        } catch (err) {
            console.error('[preset] Save error:', err);
        }
    });

    socket.on('deletePreset', (presetId) => {
        try {
            db.prepare('DELETE FROM presets WHERE id = ?').run(presetId);
            console.log(`[preset] Deleted: ${presetId}`);
            appState.presets = appState.presets.filter(p => p.id !== presetId);
            io.emit('stateUpdated', appState);
        } catch (err) {
            console.error('[preset] Delete error:', err);
        }
    });

    socket.on('loadPreset', (presetId) => {
        const preset = appState.presets.find(p => p.id === presetId);
        if (!preset) { console.warn(`[preset] Not found: ${presetId}`); return; }
        console.log(`[preset] Loading: "${preset.name}"`);
        // Turn off all currently visible graphics before switching
        const newGraphics = (preset.graphics || []).map(g => ({ ...g, visible: false }));
        const newGroups = preset.groups || [];
        const newState = { ...appState, graphics: newGraphics, groups: newGroups };
        appState = newState;
        io.emit('stateUpdated', appState);
        syncFullStateToDB(newState);
    });

    socket.on('set_background', (color) => {
        console.log(`[bg] Background set to: ${color}`);
        io.emit('set_background', color);
    });

    socket.on('disconnect', () => {
        console.log(`[-] Client disconnected: ${socket.id}`);
    });
});

function startServer() {
    server.listen(PORT, '0.0.0.0', () => {
        const actualPort = server.address().port;
        const networkInterfaces = os.networkInterfaces();
        let lanIp = 'localhost';
        for (const name of Object.keys(networkInterfaces)) {
            for (const net of networkInterfaces[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    lanIp = net.address;
                    break;
                }
            }
        }

        console.log(`========================================`);
        console.log(`  CG Server running on port ${actualPort} (SQLite)`);
        console.log(`  Control Panel (Local): http://localhost:${actualPort}/`);
        console.log(`  Control Panel (LAN):   http://${lanIp}:${actualPort}/`);
        console.log(`  Output URL (Local):    http://localhost:${actualPort}/output.html`);
        console.log(`  Output URL (LAN):      http://${lanIp}:${actualPort}/output.html`);
        console.log(`  Client root:           ${CLIENT_ROOT}`);
        console.log(`========================================`);

        // Signal readiness to parent process (Electron) via stdout marker + IPC
        console.log(`__PORT__:${actualPort}`);
        if (process.send) {
            process.send({ type: 'ready', port: actualPort });
        }
    });
}
