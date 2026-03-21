const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const DB_FILE = process.env.DATABASE_URL || path.join(__dirname, 'database.sqlite');

const dbExists = fs.existsSync(DB_FILE) && fs.statSync(DB_FILE).isFile();
console.log(`[DB] Using database file: ${DB_FILE}`);
console.log(`[DB] Valid file exists on start: ${dbExists} (${dbExists ? fs.statSync(DB_FILE).size : 0} bytes)`);

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log(`Connected to SQLite database.`);
        if (!dbExists) {
            console.log("[DB] Database file missing or empty. Initializing schema...");
            ensureDatabaseInitialized();
        } else {
            console.log("[DB] Database file found. Loading state...");
            loadStateFromDB(() => {
                syncTemplateFilesToDB(() => {
                    startServer();
                });
            });
        }
    }
});

// Konfiguracja uploadu plików (multer)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // max 10MB

// Funkcja automatycznej inicjalizacji bazy danych przy pierwszym uruchomieniu
function ensureDatabaseInitialized() {
    console.log("[DB] Ensuring database schema...");
    db.serialize(() => {
        // Tworzenie schematu
        db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)`);
        db.run(`CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
        db.run(`CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
        db.run(`CREATE TABLE IF NOT EXISTS graphics (id TEXT PRIMARY KEY, templateId TEXT, name TEXT, groupId TEXT, visible INTEGER DEFAULT 0, data TEXT NOT NULL)`);

        console.log("[DB] Schema ensured.");

        // SEEDING: Jeśli baza jest pusta, a mamy db.json, to importujemy go
        db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
            if (!err && row && row.count === 0) {
                const jsonPath = path.join(__dirname, 'db.json');
                if (fs.existsSync(jsonPath)) {
                    console.log("[DB] Database is empty. Seeding from db.json...");
                    try {
                        const rawData = fs.readFileSync(jsonPath, 'utf8');
                        const state = JSON.parse(rawData);
                        
                        db.serialize(() => {
                            db.run('BEGIN TRANSACTION');
                            
                            if (state.settings) {
                                db.run('INSERT OR REPLACE INTO settings (id, data) VALUES (1, ?)', [JSON.stringify(state.settings)]);
                            }
                            
                            if (state.templates && state.templates.length > 0) {
                                const stmt = db.prepare('INSERT OR REPLACE INTO templates (id, data) VALUES (?, ?)');
                                for (const t of state.templates) {
                                    if (!t.id) continue;
                                    stmt.run(t.id, JSON.stringify(t));
                                }
                                stmt.finalize();
                            }
                            
                            if (state.groups && state.groups.length > 0) {
                                const stmt = db.prepare('INSERT INTO groups (id, data) VALUES (?, ?)');
                                for (const g of state.groups) {
                                    stmt.run(g.id, JSON.stringify(g));
                                }
                                stmt.finalize();
                            }
                            
                            if (state.graphics && state.graphics.length > 0) {
                                const stmt = db.prepare('INSERT INTO graphics (id, templateId, name, groupId, visible, data) VALUES (?, ?, ?, ?, ?, ?)');
                                for (const g of state.graphics) {
                                    const visibleInt = g.visible ? 1 : 0;
                                    stmt.run(g.id, g.templateId || null, g.name || '', g.groupId || null, visibleInt, JSON.stringify(g));
                                }
                                stmt.finalize();
                            }
                            
                            db.run('COMMIT', () => {
                                console.log("[DB] Seeding complete.");
                                loadStateFromDB(() => {
                                    syncTemplateFilesToDB(() => {
                                        startServer();
                                    });
                                });
                            });
                        });
                    } catch (e) {
                        console.error("[DB] Seeding failed:", e.message);
                        loadStateFromDB(() => {
                            syncTemplateFilesToDB(() => {
                                startServer();
                            });
                        });
                    }
                } else {
                    console.log("[DB] No db.json found for seeding.");
                    loadStateFromDB(() => {
                        syncTemplateFilesToDB(() => {
                            startServer();
                        });
                    });
                }
            } else {
                loadStateFromDB(() => {
                    syncTemplateFilesToDB(() => {
                        startServer();
                    });
                });
            }
        });
    });
}

// Auto-sync template JSON files from templates/ directory into the DB on startup
function syncTemplateFilesToDB(callback) {
    const tplDir = path.join(__dirname, 'templates');
    if (!fs.existsSync(tplDir)) { if (callback) callback(); return; }
    const files = fs.readdirSync(tplDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) { if (callback) callback(); return; }

    console.log(`[DB] Syncing ${files.length} template files from templates/ ...`);
    db.serialize(() => {
        const stmt = db.prepare('INSERT OR REPLACE INTO templates (id, data) VALUES (?, ?)');
        for (const fn of files) {
            try {
                const tpl = JSON.parse(fs.readFileSync(path.join(tplDir, fn), 'utf8'));
                if (!tpl.id) continue;
                stmt.run(tpl.id, JSON.stringify(tpl));
            } catch (e) {
                console.warn(`[DB] Skipping ${fn}: ${e.message}`);
            }
        }
        stmt.finalize(() => {
            console.log(`[DB] Template files synced.`);
            // Reload state to pick up updated templates
            loadStateFromDB(callback);
        });
    });
}

let appState = { settings: {}, templates: [], graphics: [], groups: [] };

// Funkcja ładująca stan z bazy SQLite do RAM (Promise.all pattern)
function loadStateFromDB(callback) {
    console.log("[DB] Loading state from SQLite...");

    const q = (fn) => new Promise((resolve) => fn(resolve));

    const pSettings = q(resolve => db.get("SELECT data FROM settings WHERE id = 1", (err, row) => {
        let settings = {};
        if (!err && row) { try { settings = JSON.parse(row.data); } catch(e){} }
        resolve(settings);
    }));

    const pTemplates = q(resolve => db.all("SELECT data FROM templates", (err, rows) => {
        const templates = (!err && rows)
            ? rows.map(r => { try { return JSON.parse(r.data); } catch(e) { return null; } }).filter(Boolean)
            : [];
        resolve(templates);
    }));

    const pGroups = q(resolve => db.all("SELECT data FROM groups", (err, rows) => {
        const groups = (!err && rows)
            ? rows.map(r => { try { return JSON.parse(r.data); } catch(e) { return null; } }).filter(Boolean)
            : [];
        resolve(groups);
    }));

    const pGraphics = q(resolve => db.all("SELECT id, templateId, name, groupId, visible, data FROM graphics", (err, rows) => {
        const graphics = (!err && rows)
            ? rows.map(r => {
                let parsed = {};
                try { parsed = JSON.parse(r.data); } catch(e){}
                return { ...parsed, id: r.id, templateId: r.templateId, name: r.name, groupId: r.groupId, visible: r.visible === 1 };
            })
            : [];
        resolve(graphics);
    }));

    Promise.all([pSettings, pTemplates, pGroups, pGraphics]).then(([settings, templates, groups, graphics]) => {
        appState = { settings, templates, groups, graphics };
        console.log(`[DB] State fully loaded. Graphics: ${graphics.length}, Templates: ${templates.length}`);
        if (callback) callback();
    });
}

// Funkcja synchronizująca pojedynczy element 'graphics' w bazie
function syncGraphicsToDB(graphicsArray) {
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        db.run("DELETE FROM graphics"); // Czyścimy i wypełniamy od nowa w obrębie transakcji by zachować kolejność
        
        if (graphicsArray && graphicsArray.length > 0) {
            const stmt = db.prepare('INSERT INTO graphics (id, templateId, name, groupId, visible, data) VALUES (?, ?, ?, ?, ?, ?)');
            for (const g of graphicsArray) {
                const visibleInt = g.visible ? 1 : 0;
                stmt.run(g.id, g.templateId || null, g.name || '', g.groupId || null, visibleInt, JSON.stringify(g));
            }
            stmt.finalize();
        }
        db.run("COMMIT");
    });
}

// Podstawowa synchronizacja całej reszty (templates, groups, settings)
function syncStateToDB(state) {
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // 1. Settings
        if (state.settings) {
            db.run("INSERT OR REPLACE INTO settings (id, data) VALUES (1, ?)", [JSON.stringify(state.settings)]);
        }

        // 2. Templates
        if (state.templates && state.templates.length > 0) {
            db.run("DELETE FROM templates");
            const stmtTpl = db.prepare('INSERT OR REPLACE INTO templates (id, data) VALUES (?, ?)');
            for (const t of state.templates) {
                if (!t.id) continue;
                stmtTpl.run(t.id, JSON.stringify(t));
            }
            stmtTpl.finalize();
        } else {
            console.warn("[!] syncStateToDB: Skipping templates update - state.templates is empty or missing. (Prevention of wiping DB)");
        }

        // 3. Groups
        db.run("DELETE FROM groups");
        if (state.groups && state.groups.length > 0) {
            const stmtGrp = db.prepare('INSERT INTO groups (id, data) VALUES (?, ?)');
            for (const g of state.groups) {
                stmtGrp.run(g.id, JSON.stringify(g));
            }
            stmtGrp.finalize();
        }

        db.run("COMMIT");
    });
}


// Start
// Usunięto loadStateFromDB() stąd, jest wywoływane wewnątrz ensureDatabaseInitialized()

// Serve static files from the current directory
app.use(express.static(__dirname));
// Serwowanie katalogu z uploadami
app.use('/uploads', express.static(UPLOADS_DIR));

// Endpoint do uploadu pliku (zastępuje osadzanie Base64 w grafice)
app.post('/api/upload', upload.single('file'), (req, res) => {
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
        appState = newState;
        // Broadcast the updated state to ALL connected clients
        io.emit('stateUpdated', appState);
        
        // Persist to disk — zawsze synchronizuj grafiki (nawet gdy pusta tablica)
        syncGraphicsToDB(newState.graphics || []);
        syncStateToDB(newState);
    });

    socket.on('disconnect', () => {
        console.log(`[-] Client disconnected: ${socket.id}`);
    });
});

const os = require('os');
const PORT = process.env.PORT || 3000;

function startServer() {
    server.listen(PORT, '0.0.0.0', () => {
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
        console.log(`  CG Server running on port ${PORT} (SQLite)`);
        console.log(`  Control Panel (Local): http://localhost:${PORT}/`);
        console.log(`  Control Panel (LAN):   http://${lanIp}:${PORT}/`);
        console.log(`  Output URL (Local):    http://localhost:${PORT}/output.html`);
        console.log(`  Output URL (LAN):      http://${lanIp}:${PORT}/output.html`);
        console.log(`========================================`);
    });
}
