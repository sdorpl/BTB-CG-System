const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

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
            loadStateFromDB();
        }
    }
});

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
                                const stmt = db.prepare('INSERT INTO templates (id, data) VALUES (?, ?)');
                                for (const t of state.templates) {
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
                                loadStateFromDB();
                            });
                        });
                    } catch (e) {
                        console.error("[DB] Seeding failed:", e.message);
                        loadStateFromDB();
                    }
                } else {
                    console.log("[DB] No db.json found for seeding.");
                    loadStateFromDB();
                }
            } else {
                loadStateFromDB();
            }
        });
    });
}

let appState = { settings: {}, templates: [], graphics: [], groups: [] };

// Funkcja ładująca stan z bazy SQLite do RAM,
// żeby przy połączeniu nowego klienta od razu wysłać 'initialState' 
// bez konieczności czekania na asynchroniczne zapytania w on('connection')
function loadStateFromDB(callback) {
    console.log("[DB] Loading state from SQLite...");
    let newState = { settings: {}, templates: [], graphics: [], groups: [] };
    let queriesPending = 4;

    function checkDone() {
        queriesPending--;
        if (queriesPending === 0) {
            appState = newState;
            console.log(`[DB] State fully loaded. Graphics: ${newState.graphics.length}, Templates: ${newState.templates.length}`);
            if (callback) callback();
        }
    }

    // Settings
    db.get("SELECT data FROM settings WHERE id = 1", (err, row) => {
        if (!err && row) {
            try { newState.settings = JSON.parse(row.data); } catch(e){}
        }
        checkDone();
    });

    // Templates
    db.all("SELECT data FROM templates", (err, rows) => {
        if (!err && rows) {
            newState.templates = rows.map(r => {
                try { return JSON.parse(r.data); } catch(e) { return null; }
            }).filter(Boolean);
        }
        checkDone();
    });

    // Groups
    db.all("SELECT data FROM groups", (err, rows) => {
        if (!err && rows) {
            newState.groups = rows.map(r => {
                try { return JSON.parse(r.data); } catch(e) { return null; }
            }).filter(Boolean);
        }
        checkDone();
    });

    // Graphics
    db.all("SELECT id, templateId, name, groupId, visible, data FROM graphics", (err, rows) => {
        if (!err && rows) {
            newState.graphics = rows.map(r => {
                let parsed = {};
                try { parsed = JSON.parse(r.data); } catch(e){}
                return {
                    ...parsed,
                    id: r.id,
                    templateId: r.templateId,
                    name: r.name,
                    groupId: r.groupId,
                    visible: r.visible === 1
                };
            });
        }
        checkDone();
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
            const stmtTpl = db.prepare('INSERT INTO templates (id, data) VALUES (?, ?)');
            for (const t of state.templates) {
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
        
        // Persist to disk
        if (newState.graphics && newState.graphics.length > 0) {
            syncGraphicsToDB(newState.graphics);
        }
        syncStateToDB(newState);
    });

    socket.on('disconnect', () => {
        console.log(`[-] Client disconnected: ${socket.id}`);
    });
});

const os = require('os');
const PORT = process.env.PORT || 3000;

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
