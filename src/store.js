// ======================================================
// src/store.js — Shared state, proxy, socket, channels
// ======================================================

export const socket = io();

export let state = { templates: [], graphics: [], groups: [], settings: {} };
export function setState(newState) { state = newState; }

export let selectedGraphicId = null;
export function setSelectedGraphicId(id) { selectedGraphicId = id; }

export let previewGraphic = null;
export function setPreviewGraphic_store(g) { previewGraphic = g; }

export let currentPage = 'dashboard'; // 'dashboard' | 'templates'
export function setCurrentPage(p) { currentPage = p; }

export let currentTemplateId = null;
export function setCurrentTemplateId(id) { currentTemplateId = id; }

export let currentTemplateTab = 'html';
export function setCurrentTemplateTab(t) { currentTemplateTab = t; }

export let codeEditorGraphicId = null; // When set, template editor edits this graphic's code overrides
export function setCodeEditorGraphicId(id) { codeEditorGraphicId = id; }

export let inspectorAccordionStates = {}; // graphicId -> { accordionId -> isOpen }
export function setInspectorAccordionStates(v) { inspectorAccordionStates = v; }

export let currentInspectorTab = 'main'; // Tracks active tab in inspector
export function setCurrentInspectorTab(t) { currentInspectorTab = t; }

export const DB_KEY = 'cg_state_backup';

// Debounced localStorage flush — prevents blocking the main thread on every keystroke
export let _draftSaveTimer = null;
export function _flushDrafts(target) {
    clearTimeout(_draftSaveTimer);
    _draftSaveTimer = setTimeout(() => {
        try { localStorage.setItem('cg_drafts', JSON.stringify(target)); } catch(e){}
    }, 300);
}

export const draftsProxyHandler = {
    set(target, prop, val) {
        target[prop] = val;
        _flushDrafts(target);
        return true;
    },
    deleteProperty(target, prop) {
        delete target[prop];
        _flushDrafts(target);
        return true;
    }
};

let initialDrafts = {};
try { initialDrafts = JSON.parse(localStorage.getItem('cg_drafts')) || {}; } catch(e){}
window._draftGraphics = new Proxy(initialDrafts, draftsProxyHandler);

export const urlParams = new URLSearchParams(window.location.search);
export const panelMode = urlParams.get('panel'); // 'bank' | 'inspector' | 'preview' | null
export const uiChannel = new BroadcastChannel('cg_ui_sync');

// ===========================================================
// 2. STATE
// ===========================================================
export function saveState() {
    if (!state || !state.templates || state.templates.length === 0) {
        console.warn("[!] saveState blocked: State appears to be empty or uninitialized.");
        return;
    }
    socket.emit('updateState', state);
}

// --- Helper do wysyłania plików na serwer ---
export async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });
    if (!resp.ok) throw new Error('Upload failed');
    return await resp.json(); // { url: "/uploads/..." }
}
