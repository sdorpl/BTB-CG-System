const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'database.sqlite');
const outPath = path.join(__dirname, 'new-db.json');
const db = new Database(dbPath, { readonly: true });

const state = {
    settings: {},
    templates: [],
    groups: [],
    graphics: []
};

try {
    const settingsRow = db.prepare("SELECT data FROM settings WHERE id = 1").get();
    state.settings = settingsRow ? JSON.parse(settingsRow.data) : {};

    state.templates = db.prepare("SELECT data FROM templates").all()
        .map(r => JSON.parse(r.data));

    state.groups = db.prepare("SELECT data FROM groups").all()
        .map(r => JSON.parse(r.data));

    state.graphics = db.prepare("SELECT id, templateId, name, groupId, visible, data FROM graphics").all()
        .map(r => {
            let parsed = {};
            try { parsed = JSON.parse(r.data); } catch(e){}
            return { ...parsed, id: r.id, templateId: r.templateId, name: r.name, groupId: r.groupId, visible: r.visible === 1 };
        });

    fs.writeFileSync(outPath, JSON.stringify(state, null, 2), 'utf8');
    console.log('Eksport bazy zakończony pomyślnie do ' + outPath);
} catch (e) {
    console.error('Błąd eksportu: ', e);
} finally {
    db.close();
}
