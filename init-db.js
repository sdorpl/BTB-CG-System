const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'init_db.sqlite');
const jsonPath = path.join(__dirname, 'db.json');

// Jeśli plik db.json nie istnieje, nie mamy czego migrować
if (!fs.existsSync(jsonPath)) {
    console.log('db.json not found, skipping migration.');
    process.exit(0);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Setting up database schema...');

    // Tabela ustawięń
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            data TEXT NOT NULL
        )
    `);

    // Tabela szablonów
    db.run(`
        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
        )
    `);

    // Tabela grup
    db.run(`
        CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
        )
    `);

    // Tabela grafik
    db.run(`
        CREATE TABLE IF NOT EXISTS graphics (
            id TEXT PRIMARY KEY,
            templateId TEXT,
            name TEXT,
            groupId TEXT,
            visible INTEGER DEFAULT 0,
            data TEXT NOT NULL
        )
    `);

    // Czyścimy wszystko
    db.run('DELETE FROM settings');
    db.run('DELETE FROM templates');
    db.run('DELETE FROM groups');
    db.run('DELETE FROM graphics');

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const state = JSON.parse(rawData);

    db.run('BEGIN TRANSACTION');

    if (state.settings) {
        const stmt = db.prepare('INSERT INTO settings (id, data) VALUES (1, ?)');
        stmt.run(JSON.stringify(state.settings));
        stmt.finalize();
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

    db.run('COMMIT');
    console.log('Migration to database.sqlite complete.');
});

db.close();
