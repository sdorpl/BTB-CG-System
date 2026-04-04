const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'database.sqlite');
const jsonPath = path.join(__dirname, 'db.json');

// Jeśli plik db.json nie istnieje, nie mamy czego migrować
if (!fs.existsSync(jsonPath)) {
    console.log('db.json not found, skipping migration.');
    process.exit(0);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('Setting up database schema...');

db.exec(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)`);
db.exec(`CREATE TABLE IF NOT EXISTS templates (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
db.exec(`CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
db.exec(`CREATE TABLE IF NOT EXISTS graphics (id TEXT PRIMARY KEY, templateId TEXT, name TEXT, groupId TEXT, visible INTEGER DEFAULT 0, data TEXT NOT NULL)`);

// Czyścimy wszystko
db.exec('DELETE FROM settings');
db.exec('DELETE FROM templates');
db.exec('DELETE FROM groups');
db.exec('DELETE FROM graphics');

const rawData = fs.readFileSync(jsonPath, 'utf8');
const state = JSON.parse(rawData);

const migrate = db.transaction(() => {
    if (state.settings) {
        db.prepare('INSERT INTO settings (id, data) VALUES (1, ?)').run(JSON.stringify(state.settings));
    }

    if (state.templates && state.templates.length > 0) {
        const stmt = db.prepare('INSERT INTO templates (id, data) VALUES (?, ?)');
        for (const t of state.templates) {
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
migrate();

console.log('Migration to database.sqlite complete.');
db.close();
