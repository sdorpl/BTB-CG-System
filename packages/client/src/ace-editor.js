// ======================================================
// src/ace-editor.js — Ace Editor wrapper functions
// ======================================================

// ── Ace Editor ──────────────────────────────────────────
let _aceEditor = null;
export let _aceSuppressChange = false;

export function _aceInit() {
    if (_aceEditor) return _aceEditor;
    const el = document.getElementById('tpl-code-editor');
    if (!el || typeof ace === 'undefined') return null;

    _aceEditor = ace.edit(el, {
        mode: 'ace/mode/html',
        theme: 'ace/theme/one_dark',
        fontSize: 13,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        showPrintMargin: false,
        wrap: true,
        tabSize: 2,
        useSoftTabs: true,
        showGutter: true,
        highlightActiveLine: true,
        useWorker: false,           // Wyłącz walidator — szablony używają Handlebars {{}}
    });

    // Match app background
    _aceEditor.container.style.background = '#1a1a2e';
    _aceEditor.renderer.setScrollMargin(8, 8);
    const gutter = _aceEditor.renderer.$gutterLayer?.element;
    if (gutter) gutter.style.background = '#1a1a2e';

    return _aceEditor;
}

export function _cmGetValue() {
    const ed = _aceInit();
    return ed ? ed.getValue() : '';
}

export function _cmSetValue(str) {
    const ed = _aceInit();
    if (!ed) return;
    _aceSuppressChange = true;
    ed.setValue(str || '', -1);  // -1 = move cursor to start
    ed.clearSelection();
    _aceSuppressChange = false;
}

export function _cmSetLanguage(lang) {
    const ed = _aceInit();
    if (!ed) return;
    const modeMap = { html: 'ace/mode/html', css: 'ace/mode/css', js: 'ace/mode/javascript' };
    ed.session.setMode(modeMap[lang] || 'ace/mode/html');
}

export function _cmSetReadOnly(val) {
    const ed = _aceInit();
    if (ed) ed.setReadOnly(!!val);
}

export function _cmSetOpacity(val) {
    const el = document.getElementById('tpl-code-editor');
    if (el) el.style.opacity = val;
}
