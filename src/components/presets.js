// ======================================================
// src/components/presets.js — Preset management + monitor toggle
// ======================================================

import { state, socket, saveState } from '../store.js';

function getActivePresetId() { return state.settings?.activePresetId || null; }

function setActivePresetId(id) {
    if (!state.settings) state.settings = {};
    state.settings.activePresetId = id;
    saveState();
}

export function renderPresetSelect() {
    const sel = document.getElementById('preset-select');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">— brak —</option>';
    const presets = state.presets || [];
    presets.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        sel.appendChild(opt);
    });
    const preferredId = getActivePresetId() || currentVal;
    if (preferredId && presets.some(p => p.id === preferredId)) {
        sel.value = preferredId;
    }
    if (getActivePresetId() && !presets.some(p => p.id === getActivePresetId())) {
        setActivePresetId(null);
    }
}

function savePreset() {
    const sel = document.getElementById('preset-select');
    const selectedId = sel?.value || '';

    if (selectedId) {
        const existing = (state.presets || []).find(p => p.id === selectedId);
        const name = existing?.name || selectedId;
        socket.emit('savePreset', {
            id: selectedId,
            name,
            graphics: JSON.parse(JSON.stringify(state.graphics)),
            groups: JSON.parse(JSON.stringify(state.groups))
        });
        setActivePresetId(selectedId);
    } else {
        const name = prompt('Nazwa nowego presetu:', 'Program A');
        if (!name || !name.trim()) return;
        const newId = 'preset-' + Date.now();
        socket.emit('savePreset', {
            id: newId,
            name: name.trim(),
            graphics: JSON.parse(JSON.stringify(state.graphics)),
            groups: JSON.parse(JSON.stringify(state.groups))
        });
        setActivePresetId(newId);
    }
}

function loadPreset() {
    const sel = document.getElementById('preset-select');
    const id = sel?.value;
    if (!id) { alert('Wybierz preset z listy.'); return; }
    const preset = (state.presets || []).find(p => p.id === id);
    if (!preset) return;

    const onAir = state.graphics.some(g => g.visible);
    if (onAir) {
        if (!confirm(`Załadować preset "${preset.name}"?\n\nWszystkie aktywne grafiki zostaną wyłączone.`)) return;
    }

    setActivePresetId(id);
    socket.emit('loadPreset', id);
}

function deletePreset() {
    const sel = document.getElementById('preset-select');
    const id = sel?.value;
    if (!id) { alert('Wybierz preset do usunięcia.'); return; }
    const preset = (state.presets || []).find(p => p.id === id);
    if (!preset) return;
    if (!confirm(`Usunąć preset "${preset.name}"? Tej operacji nie można cofnąć.`)) return;
    if (getActivePresetId() === id) setActivePresetId(null);
    socket.emit('deletePreset', id);
}

function exportPreset() {
    const sel = document.getElementById('preset-select');
    const id = sel?.value;
    let preset, exportData;

    if (id) {
        preset = (state.presets || []).find(p => p.id === id);
    }

    if (preset) {
        exportData = {
            _exportVersion: 1,
            _type: 'preset',
            id: preset.id,
            name: preset.name,
            created_at: preset.created_at,
            graphics: preset.graphics || [],
            groups: preset.groups || []
        };
    } else {
        const name = prompt('Nazwa eksportowanego presetu:', 'Preset Export');
        if (!name) return;
        exportData = {
            _exportVersion: 1,
            _type: 'preset',
            id: 'preset-export-' + Date.now(),
            name: name.trim(),
            created_at: Date.now(),
            graphics: JSON.parse(JSON.stringify(state.graphics)),
            groups: JSON.parse(JSON.stringify(state.groups))
        };
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preset-${exportData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importPreset(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data._type !== 'preset' || !data.graphics) {
                alert('Nieprawidłowy plik presetu.');
                return;
            }
            const name = prompt('Nazwa presetu po imporcie:', data.name || 'Importowany preset');
            if (!name) return;
            const newId = 'preset-' + Date.now();
            socket.emit('savePreset', {
                id: newId,
                name: name.trim(),
                graphics: data.graphics,
                groups: data.groups || []
            });
            setActivePresetId(newId);
        } catch (err) {
            alert('Błąd odczytu pliku: ' + err.message);
        }
    };
    reader.readAsText(file);
}

export function bindPresetEvents() {
    const bind = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    bind('btn-preset-load', 'click', loadPreset);
    bind('btn-preset-save', 'click', savePreset);
    bind('btn-preset-delete', 'click', deletePreset);
    bind('btn-preset-export', 'click', exportPreset);
    const fileInput = document.getElementById('preset-import-file');
    if (fileInput) fileInput.addEventListener('change', (e) => { importPreset(e.target.files[0]); e.target.value = ''; });

    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) {
        presetSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                setActivePresetId(e.target.value);
            }
        });
    }
}

// ===========================================================
// MONITOR COLLAPSE TOGGLE
// ===========================================================
const _monitorState = { preview: true, program: true };

window.toggleMonitor = function(which) {
    const collapsible = document.getElementById(which + '-monitor-collapsible');
    const chevron = document.getElementById('chevron-' + which);
    if (!collapsible) return;
    _monitorState[which] = !_monitorState[which];
    const open = _monitorState[which];
    collapsible.style.display = open ? '' : 'none';
    if (chevron) {
        chevron.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
    }
};
