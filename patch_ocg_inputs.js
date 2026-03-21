#!/usr/bin/env node
// Patch script: add ocgInputs to all templates in db.json

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Standard two-line lower third fields
const LOWER_THIRD_INPUTS = [
    { id: 'TITLE',    label: 'Tytuł / Imię Nazwisko',  default: '', type: 'text' },
    { id: 'SUBTITLE', label: 'Podtytuł / Funkcja',      default: '', type: 'text' }
];

// Static graphic — no personalizable inputs (e.g. tags/logos)
const NO_INPUTS = [];

// Templates with only ticker content (managed via items list)
const TICKER_INPUTS = [
    { id: 'WIPER_TEXT', label: 'Etykieta Wipera / Label', default: '', type: 'text' }
];

// Ticker without wiper
const TICKER_NO_LABEL_INPUTS = [];

// Image / logo
const IMAGE_INPUTS = [
    { id: 'LOGO_URL', label: 'URL Grafiki / Logo', default: '', type: 'text' }
];

function getOcgInputs(tpl) {
    const name = (tpl.name || '').toLowerCase();
    const type = (tpl.type || '').toLowerCase();
    
    // Already has inputs — keep unchanged
    if (tpl.ocgInputs && tpl.ocgInputs.length > 0) {
        return tpl.ocgInputs;
    }

    if (type === 'image') return IMAGE_INPUTS;
    if (type === 'clock') return NO_INPUTS;

    if (type === 'ticker') {
        // Tickers with wiper (label) support
        if (name.includes('wiper') || name.includes('pilny') || name.includes('rotacyjn') || name.includes('crawl') || name.includes('scroll')) {
            return TICKER_INPUTS;
        }
        // Regular tickers — label is optional
        return TICKER_INPUTS;
    }

    if (type === 'lower_third' || type === undefined || type === 'undefined') {
        // Static tags / labels — no inputs 
        if (name.includes('tag') || name.includes('na żywo') || name.includes('powtórka') || name.includes('białystok') || name.includes('wydanie specjalne')) {
            return NO_INPUTS;
        }
        // All others: two-line lower third
        return LOWER_THIRD_INPUTS;
    }

    // Fallback
    return LOWER_THIRD_INPUTS;
}

let changed = 0;
db.templates.forEach(tpl => {
    const inputs = getOcgInputs(tpl);
    if (!tpl.ocgInputs || JSON.stringify(tpl.ocgInputs) !== JSON.stringify(inputs)) {
        tpl.ocgInputs = inputs;
        changed++;
    }
    
    // Also sync defaultFields from ocgInputs if not already set
    if (!tpl.defaultFields) tpl.defaultFields = {};
    inputs.forEach(inp => {
        if (tpl.defaultFields[inp.id] === undefined && inp.default !== undefined) {
            tpl.defaultFields[inp.id] = inp.default;
        }
    });
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Patched ${changed} templates with ocgInputs. Total: ${db.templates.length} templates.`);
db.templates.forEach(t => {
    const ids = (t.ocgInputs||[]).map(i=>i.id).join(', ') || '(none)';
    console.log(`  ${t.name} [${t.type}] => ${ids}`);
});
