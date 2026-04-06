// ======================================================
// src/components/templates.js — Template editor, list, OCG import/export
// ======================================================

import {
    state, saveState,
    currentTemplateId, setCurrentTemplateId,
    currentTemplateTab, setCurrentTemplateTab,
    codeEditorGraphicId, setCodeEditorGraphicId,
    previewGraphic
} from '../store.js';
import { escAttr } from '../utils.js';
import { _aceInit, _aceSuppressChange, _cmGetValue, _cmSetValue, _cmSetLanguage, _cmSetReadOnly, _cmSetOpacity } from '../ace-editor.js';
import { t } from '../i18n.js';

// ===========================================================
// 9. TEMPLATE EDITOR
// ===========================================================
export function renderTemplateList() {
    const list = document.getElementById('template-list');
    list.innerHTML = '';
    state.templates.forEach(tpl => {
        const item = document.createElement('div');
        item.className = `p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-750 text-sm group ${currentTemplateId === tpl.id ? 'bg-blue-900/40 border-l-4 border-l-blue-500' : ''}`;
        item.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                    <div class="font-medium truncate text-xs text-white">${tpl.name}</div>
                    <div class="text-[10px] text-gray-500 font-mono">${tpl.type}</div>
                </div>
                <button data-export-id="${tpl.id}" title="${t('tpl.exportToJson')}" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-600/20 text-blue-400 rounded transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
            </div>
        `;
        item.onclick = (e) => {
            if (e.target.closest('[data-export-id]')) {
                e.stopPropagation();
                exportTemplate(tpl.id);
                return;
            }
            openTemplateEditor(tpl.id);
        };
        list.appendChild(item);
    });
}

/**
 * Export template to a JSON file
 */
export function exportTemplate(id) {
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) return;

    // Bundle template with its associated graphics so settings are preserved on import
    const associatedGraphics = state.graphics.filter(g => g.templateId === id);
    const exportData = {
        _exportVersion: 2,
        template: tpl,
        graphics: associatedGraphics
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${tpl.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

/**
 * Import template from a JSON file
 */
export function importTemplate(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);

            // New bundled format (v2) — template + associated graphics
            if (imported._exportVersion === 2 && imported.template) {
                const tpl = imported.template;
                if (!tpl.name || (!tpl.html_template && !tpl.css_template)) {
                    alert(t('tpl.invalidFormat'));
                    return;
                }
                const newTplId = crypto.randomUUID();
                const newTpl = { ...tpl, id: newTplId, name: tpl.name + ' (Imported)' };
                state.templates.push(newTpl);

                // Import associated graphics with new IDs, linked to the new template
                if (Array.isArray(imported.graphics) && imported.graphics.length > 0) {
                    for (const g of imported.graphics) {
                        const newGraphic = { ...g, id: crypto.randomUUID(), templateId: newTplId };
                        state.graphics.push(newGraphic);
                    }
                }

                saveState();
                renderTemplateList();
                window._cgModules.renderShotbox();
                openTemplateEditor(newTpl.id);
                alert(t('tpl.importSuccessWithGraphics', imported.graphics?.length || 0));
                return;
            }

            // Legacy format — plain template object (backward compatibility)
            if (!imported.name || (!imported.html_template && !imported.css_template)) {
                alert(t('tpl.invalidFormat'));
                return;
            }
            const newTpl = { ...imported, id: crypto.randomUUID(), name: imported.name + ' (Imported)' };
            state.templates.push(newTpl);
            saveState();
            renderTemplateList();
            openTemplateEditor(newTpl.id);
            alert(t('tpl.importSuccess'));
        } catch (err) {
            console.error('Import error:', err);
            alert(t('tpl.importJsonError'));
        }
    };
    reader.readAsText(file);
}

export async function importOCGTemplates(files) {
    let count = 0;

    const readFileAsText = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });

    try {
        // Read all files in parallel for better performance
        const fileTexts = await Promise.all(
            Array.from(files).map(file => readFileAsText(file))
        );

        for (const text of fileTexts) {
            let imported = JSON.parse(text);
            if (!Array.isArray(imported)) imported = [imported];

            imported.forEach(tpl => {
                const name = tpl.name;
                const html = tpl.html || tpl.html_template;
                const css = tpl.css || tpl.css_template;
                const js = tpl.js || tpl.js_template;

                if (!name || (!html && !css)) return;

                let enhancedHtml = html || '';
                const mappedFields = { title: null, subtitle: null };

                if (tpl.inputs) {
                    tpl.inputs.forEach(input => {
                        let hbKey = `[${input.id}]`;
                        const lowerId = input.id.toLowerCase();

                        if (lowerId.includes('tytul') || lowerId.includes('nazwa') || lowerId.includes('title') || lowerId === 'f1') {
                            if (!lowerId.includes('sub')) {
                                mappedFields.title = input.default || '';
                            }
                        }

                        if (lowerId.includes('sub') || lowerId.includes('opis') || lowerId.includes('funkcja') || lowerId === 'f2') {
                            mappedFields.subtitle = input.default || '';
                        }

                        // We use [id] to support dashes in Handlebars, or the plain mapped key
                        const regex = new RegExp(`(<[^>]*id=["']${input.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>)(\\s*)(<\\/[^>]+>)`, 'g');
                        enhancedHtml = enhancedHtml.replace(regex, `$1{{{ ${hbKey} }}}$3`);
                    });
                }

                if (!tpl.defaultFields) tpl.defaultFields = {};
                if (mappedFields.title !== null && !tpl.defaultFields.title) tpl.defaultFields.title = mappedFields.title;
                if (mappedFields.subtitle !== null && !tpl.defaultFields.subtitle) tpl.defaultFields.subtitle = mappedFields.subtitle;

                // --- AUTO-CORRECTION FOR COMPATIBILITY ---
                let enhancedJs = js || '';
                // OCG JS defines `const root = {{DOM_CONTEXT}};`. The renderer wrapper now provides `root` correctly.
                enhancedJs = enhancedJs.replace(/const\s+root\s*=\s*(?:\{\{DOM_CONTEXT\}\}|'root'|"root");?/g, '/* root injected by CG wrapper */');
                enhancedJs = enhancedJs.replace(/\.innerText/g, '.textContent');

                // Infer dimensions and layout positioning from CSS
                let enhancedCss = css || '';
                let defaultWidth = undefined;
                let defaultHeight = undefined;
                let defaultX = 0;
                let defaultY = 0;

                if (enhancedCss) {
                    const blockRegex = /([^{]+)\{([^}]+)\}/g;
                    let rootBlockFound = false;

                    enhancedCss = enhancedCss.replace(blockRegex, (fullMatch, selector, rules) => {
                        if (rootBlockFound) return fullMatch;

                        // Heuristic: The root wrapper usually has `position: absolute;`
                        if (/position:\s*absolute/i.test(rules) && !rules.includes('z-index: 999999')) {
                            rootBlockFound = true;

                            const extract = (prop) => {
                                const r = new RegExp(`${prop}:\\s*([^;]+);`, 'i');
                                const m = rules.match(r);
                                return m ? m[1].trim() : null;
                            };

                            const w = extract('width');
                            const h = extract('height');
                            const l = extract('left');
                            const r = extract('right');
                            const t = extract('top');
                            const b = extract('bottom');

                            const parsePx = (val, isW) => {
                                if (!val) return null;
                                if (val.endsWith('px')) return parseFloat(val);
                                if (val === '100%') return isW ? 1920 : 1080;
                                return null;
                            };

                            let pxW = parsePx(w, true);
                            let pxH = parsePx(h, false);
                            let pxL = parsePx(l, true);
                            let pxR = parsePx(r, true);
                            let pxT = parsePx(t, false);
                            let pxB = parsePx(b, false);

                            if (pxW !== null) defaultWidth = pxW;
                            if (pxH !== null) defaultHeight = pxH;

                            // Estimate X/Y position in 1920x1080 bounds
                            if (pxL !== null) {
                                defaultX = pxL;
                            } else if (pxR !== null && pxW !== null) {
                                defaultX = 1920 - pxW - pxR;
                            } else if (pxR !== null) {
                                defaultX = 1920 - pxR - 200; // fallback width guess
                            }

                            if (pxT !== null) {
                                defaultY = pxT;
                            } else if (pxB !== null && pxH !== null) {
                                defaultY = 1080 - pxH - pxB;
                            } else if (pxB !== null) {
                                defaultY = 1080 - pxB - 100; // fallback height guess
                            }

                            // Strip hardcoded bounds from CSS so Alpha container can size it
                            let newRules = rules
                                .replace(/position:\s*absolute/gi, 'position: relative')
                                .replace(/left:\s*[^;]+(;|(?=\}))/gi, '')
                                .replace(/right:\s*[^;]+(;|(?=\}))/gi, '')
                                .replace(/top:\s*[^;]+(;|(?=\}))/gi, '')
                                .replace(/bottom:\s*[^;]+(;|(?=\}))/gi, '');

                            if (w && pxW !== null && pxW !== 1920) {
                                newRules = newRules.replace(new RegExp(`width:\\s*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};?`, 'gi'), 'width: var(--v-width, 100%);');
                            } else {
                                newRules = newRules.replace(/width:\s*100%;?/gi, 'width: var(--v-width, 100%);');
                            }
                            if (h && pxH !== null && pxH !== 1080) {
                                newRules = newRules.replace(new RegExp(`height:\\s*${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};?`, 'gi'), 'height: var(--v-height, 100%);');
                            } else {
                                newRules = newRules.replace(/height:\s*100%;?/gi, 'height: var(--v-height, 100%);');
                            }

                            // Strip transitional bounding bugs
                            newRules = newRules.replace(/,\s*(bottom|top|left|right)\s+([^,;]+)/gi, '');
                            newRules = newRules.replace(/(bottom|top|left|right)\s+([^,;]+),\s*/gi, '');

                            return `${selector}{${newRules}}`;
                        }
                        return fullMatch;
                    });
                }

                // Wipers & Tags widths fallback for non-root elements
                if (enhancedCss) {
                    enhancedCss = enhancedCss.replace(/width:\s*190px;/g, 'width: var(--v-width, 190px);');
                    enhancedCss = enhancedCss.replace(/width:\s*380px;/g, 'width: var(--v-width, 380px);');
                }

                if (tpl.inputs) {
                    const wInput = tpl.inputs.find(i => /width/i.test(i.id));
                    const hInput = tpl.inputs.find(i => /height/i.test(i.id));
                    if (wInput && !isNaN(parseFloat(wInput.default)) && !defaultWidth) defaultWidth = parseFloat(wInput.default);
                    if (hInput && !isNaN(parseFloat(hInput.default)) && !defaultHeight) defaultHeight = parseFloat(hInput.default);
                }

                if (enhancedCss && (
                    enhancedCss.includes('width: 1920px') ||
                    enhancedCss.includes('width: 100%') ||
                    /width:\s*(1920px|100%)/.test(enhancedCss)
                )) {
                    defaultWidth = defaultWidth || 1920;
                    defaultHeight = defaultHeight || 1080;
                }

                if (defaultWidth) console.log(`[OCG Import] Bounds Inferred: W:${defaultWidth} H:${defaultHeight} X:${defaultX} Y:${defaultY} for ${name}`);

                // --- CSS NORMALIZATION (Wygląd i Typografia) ---
                let defaultFontFamily = 'Bahnschrift';
                let defaultPrimaryBg = '#0047AB';
                let defaultTitleColor = '#ffffff';

                if (enhancedCss) {
                    // Extract font-family and replace
                    enhancedCss = enhancedCss.replace(/font-family:\s*([^;]+);/gi, (match, fontVal) => {
                        const firstFont = fontVal.split(',')[0].replace(/['"]/g, '').trim();
                        if (firstFont && !firstFont.includes('{{')) defaultFontFamily = firstFont;
                        return `font-family: '{{FONT_FAMILY}}', sans-serif;`;
                    });

                    // Discover text color
                    let textColFound = false;
                    enhancedCss = enhancedCss.replace(/color:\s*(#[0-9a-fA-F]+|rgba?\([^)]+\))/gi, (match, colVal) => {
                        // Exclude background-color or border-color that might be caught if regex is loose
                        if (!textColFound && match.trim().toLowerCase().startsWith('color:')) {
                            defaultTitleColor = colVal;
                            textColFound = true;
                        }
                        return `color: {{TITLE_COLOR}}`;
                    });

                    // Discover background color
                    let bgFound = false;
                    enhancedCss = enhancedCss.replace(/background(-color)?:\s*(#[0-9a-fA-F]+|rgba?\([^)]+\))/gi, (match, bType, colVal) => {
                        if (!bgFound) {
                            defaultPrimaryBg = colVal;
                            bgFound = true;
                        }
                        return `background${bType || ''}: {{PRIMARY_COLOR}}`;
                    });
                }

                const newTpl = {
                    id: crypto.randomUUID(),
                    name: name + (name.includes('(OCG)') ? '' : ' (OCG)'),
                    type: tpl.type || 'LOWER_THIRD',
                    html_template: tpl.html_template || enhancedHtml,
                    css_template: tpl.css_template || enhancedCss,
                    js_template: tpl.js_template || enhancedJs,
                    ocgInputs: tpl.inputs || tpl.ocgInputs || [],
                    defaultFields: tpl.defaultFields || {},
                    defaultLayout: {
                        width: defaultWidth || 1920,
                        height: defaultHeight || 1080,
                        x: defaultX || 0,
                        y: defaultY || 0,
                        ...(tpl.defaultLayout || tpl.layout || {})
                    },
                    defaultStyle: tpl.defaultStyle || tpl.style || {
                        background: {
                            type: 'solid',
                            color: defaultPrimaryBg,
                            color2: '#000000',
                            gradientAngle: 135,
                            opacity: 1,
                            borderColor: '#ffffff',
                            borderWidth: 0,
                            borderRadius: (tpl.type === 'TICKER' ? 10 : 0)
                        },
                        typography: {
                            fontFamily: defaultFontFamily,
                            fontSize: (tpl.type === 'TICKER' ? 30 : 80),
                            color: defaultTitleColor,
                            fontWeight: 'bold',
                            textTransform: (tpl.type === 'TICKER' ? 'uppercase' : 'none')
                        },
                        subtitleTypography: {
                            color: '#eeeeee',
                            fontFamily: defaultFontFamily,
                            fontSize: 40,
                            fontWeight: 'normal'
                        }
                    },
                    defaultAnimation: tpl.defaultAnimation || tpl.animation || {
                        in: { type: (tpl.type === 'TICKER' ? 'slide' : 'fade'), direction: 'bottom', duration: 0.6 },
                        out: { type: (tpl.type === 'TICKER' ? 'slide' : 'fade'), direction: 'bottom', duration: 0.4 }
                    }
                };

                // Populate defaultFields from OCG inputs if not already present
                if (tpl.inputs) {
                    tpl.inputs.forEach(input => {
                        if (newTpl.defaultFields[input.id] === undefined) {
                            newTpl.defaultFields[input.id] = input.default || '';
                        }
                    });
                }

                state.templates.push(newTpl);
                count++;
            });
        }

        if (count > 0) {
            saveState();
            renderTemplateList();
            alert(t('tpl.ocgImportSuccess', count));
        } else {
            alert(t('tpl.ocgImportNoValid'));
        }
    } catch (err) {
        console.error('OCG Import error:', err);
        alert(t('tpl.ocgImportError'));
    }
}

export function exportOCGTemplate(templateId) {
    const tpl = state.templates.find(t => t.id === templateId);
    if (!tpl) return;

    const ocgTpl = {
        id: tpl.id,
        name: tpl.name.replace(' (OCG)', ''),
        type: tpl.type,
        html: tpl.html_template,
        css: tpl.css_template,
        js: tpl.js_template,
        inputs: tpl.ocgInputs || [],
        defaultFields: tpl.defaultFields,
        defaultStyle: tpl.defaultStyle,
        defaultAnimation: tpl.defaultAnimation,
        defaultLayout: tpl.defaultLayout
    };

    const blob = new Blob([JSON.stringify(ocgTpl, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tpl.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

export function openTemplateEditor(id) {
    setCodeEditorGraphicId(null); // exit graphic mode
    setCurrentTemplateId(id);
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) return;

    renderTemplateList();

    document.getElementById('tpl-editor-empty').classList.add('hidden');
    const main = document.getElementById('tpl-editor-main');
    main.classList.remove('hidden');
    main.classList.add('flex');

    document.getElementById('tpl-name-input').value = tpl.name;
    document.getElementById('tpl-name-input').readOnly = false;
    document.getElementById('tpl-graphic-mode-bar').classList.add('hidden');

    // Show template-only buttons
    document.getElementById('btn-delete-template').classList.remove('hidden');
    document.getElementById('btn-export-template').classList.remove('hidden');
    document.getElementById('btn-export-ocg-template').classList.remove('hidden');

    // Show vars tab
    document.querySelector('.tpl-tab.tab-vars')?.classList.remove('hidden');

    if (!currentTemplateTab) setCurrentTemplateTab('html');
    updateTemplateEditorTab();
}

export function openGraphicCodeEditor(graphicId) {
    const graphic = window._draftGraphics[graphicId] || state.graphics.find(g => g.id === graphicId);
    if (!graphic) return;
    const tpl = state.templates.find(t => t.id === graphic.templateId);
    if (!tpl) return;

    setCodeEditorGraphicId(graphicId);
    setCurrentTemplateId(tpl.id);

    // Switch to templates page
    window._cgModules.switchPage('templates');
    renderTemplateList();

    document.getElementById('tpl-editor-empty').classList.add('hidden');
    const main = document.getElementById('tpl-editor-main');
    main.classList.remove('hidden');
    main.classList.add('flex');

    // Header shows graphic name (read-only)
    document.getElementById('tpl-name-input').value = graphic.name || tpl.name;
    document.getElementById('tpl-name-input').readOnly = true;

    // Show graphic mode bar
    const modeBar = document.getElementById('tpl-graphic-mode-bar');
    modeBar.classList.remove('hidden');
    document.getElementById('tpl-graphic-mode-name').textContent = graphic.name || graphic.id;
    document.getElementById('tpl-graphic-override-toggle').checked = !!graphic.useCodeOverride;

    // Hide template-only buttons
    document.getElementById('btn-delete-template').classList.add('hidden');
    document.getElementById('btn-export-template').classList.add('hidden');
    document.getElementById('btn-export-ocg-template').classList.add('hidden');

    // Hide vars tab in graphic mode (vars are edited in inspector)
    document.querySelector('.tpl-tab.tab-vars')?.classList.add('hidden');
    if (currentTemplateTab === 'vars') setCurrentTemplateTab('html');

    updateTemplateEditorTab();
}

export function _getGraphicForCodeEditor() {
    if (!codeEditorGraphicId) return null;
    return window._draftGraphics[codeEditorGraphicId] || state.graphics.find(g => g.id === codeEditorGraphicId);
}

export function updateTemplateEditorTab() {
    const tpl = state.templates.find(t => t.id === currentTemplateId);
    if (!tpl) return;

    const aceEl = document.getElementById('tpl-code-editor');
    const builderWrapper = document.getElementById('fields-builder-wrapper');
    const graphic = _getGraphicForCodeEditor();

    if (currentTemplateTab === 'vars' && !graphic) {
        // Show builder, hide code editor
        if (aceEl) aceEl.style.display = 'none';
        if (builderWrapper) {
            builderWrapper.classList.remove('hidden');
            builderWrapper.classList.add('flex');
        }
        renderFieldsBuilder(tpl);
    } else {
        // Show code editor, hide builder
        if (builderWrapper) {
            builderWrapper.classList.add('hidden');
            builderWrapper.classList.remove('flex');
        }
        if (aceEl) aceEl.style.display = '';

        if (graphic) {
            // Graphic code override mode
            const fieldMap = { html: 'html_override', css: 'css_override', js: 'js_override' };
            const tplMap = { html: tpl.html_template, css: tpl.css_template, js: tpl.js_template };
            if (graphic.useCodeOverride) {
                _cmSetValue(graphic[fieldMap[currentTemplateTab]] ?? tplMap[currentTemplateTab] ?? '');
                _cmSetReadOnly(false);
                _cmSetOpacity('1');
            } else {
                _cmSetValue(tplMap[currentTemplateTab] || '');
                _cmSetReadOnly(true);
                _cmSetOpacity('0.5');
            }
        } else {
            // Template mode (original behavior)
            const valMap = { html: tpl.html_template, css: tpl.css_template, js: tpl.js_template };
            _cmSetValue(valMap[currentTemplateTab] || '');
            _cmSetReadOnly(false);
            _cmSetOpacity('1');
        }

        _cmSetLanguage(currentTemplateTab);

        // Ace needs resize after visibility change
        const _aceEd = _aceInit();
        if (_aceEd) _aceEd.resize();
    }

    // Update tab styles
    document.querySelectorAll('.tpl-tab').forEach(tab => {
        const t = tab.getAttribute('data-tab');
        tab.classList.remove('active');
        if (t === currentTemplateTab) tab.classList.add('active');
    });
}

export function _saveCurrentCodeEditorContent() {
    if (!currentTemplateId) return;
    const graphic = _getGraphicForCodeEditor();

    if (graphic && graphic.useCodeOverride) {
        // Save graphic override
        const fieldMap = { html: 'html_override', css: 'css_override', js: 'js_override' };
        const field = fieldMap[currentTemplateTab];
        if (!field) return; // vars tab — nothing to save here
        graphic[field] = _cmGetValue();
        window._draftGraphics[graphic.id] = structuredClone(graphic);
        if (previewGraphic?.id === graphic.id) {
            Object.assign(previewGraphic, graphic);
            window._cgModules.refreshPreviewMonitor();
        }
    } else if (!graphic) {
        // Save template code
        const tpl = state.templates.find(t => t.id === currentTemplateId);
        if (tpl) {
            if (currentTemplateTab === 'vars') {
                const rows = document.querySelectorAll('#fields-builder-container .field-builder-row');
                const inputsArray = [];
                rows.forEach(r => {
                    const idVal = r.querySelector('.f-id')?.value.trim();
                    const labelVal = r.querySelector('.f-label')?.value.trim();
                    const defVal = r.querySelector('.f-def')?.value.trim();
                    const typeVal = r.querySelector('.f-type')?.value;
                    if (idVal && labelVal) {
                        inputsArray.push({ id: idVal, label: labelVal, default: defVal, type: typeVal });
                    }
                });
                tpl.ocgInputs = inputsArray;
            } else {
                const fieldMap = { html: 'html_template', css: 'css_template', js: 'js_template' };
                tpl[fieldMap[currentTemplateTab]] = _cmGetValue();
            }
        }
    }
}

export function saveCurrentTemplate() {
    const graphic = _getGraphicForCodeEditor();
    const btn = document.getElementById('btn-save-template');

    if (graphic) {
        // Graphic code override mode — save graphic to state
        _saveCurrentCodeEditorContent();
        const draft = window._draftGraphics[graphic.id];
        if (draft) {
            const idx = state.graphics.findIndex(g => g.id === draft.id);
            if (idx !== -1) {
                const saved = structuredClone(draft);
                delete saved._codeTab;
                const wasVisible = state.graphics[idx].visible;
                state.graphics[idx] = saved;
                state.graphics[idx].visible = wasVisible;
                delete window._draftGraphics[draft.id];
            }
        }
        saveState();
        window._cgModules.renderShotbox();
    } else {
        // Template mode (original behavior)
        const tpl = state.templates.find(t => t.id === currentTemplateId);
        if (!tpl) return;
        const nameInput = document.getElementById('tpl-name-input');
        tpl.name = nameInput.value || tpl.name;

        if (currentTemplateTab === 'vars') {
            const rows = document.querySelectorAll('#fields-builder-container .field-builder-row');
            const inputsArray = [];
            rows.forEach(r => {
                const idVal = r.querySelector('.f-id').value.trim();
                const labelVal = r.querySelector('.f-label').value.trim();
                const defVal = r.querySelector('.f-def').value.trim();
                const typeVal = r.querySelector('.f-type').value;
                if (idVal && labelVal) {
                    inputsArray.push({ id: idVal, label: labelVal, default: defVal, type: typeVal });
                }
            });
            tpl.ocgInputs = inputsArray;
        } else {
            const fieldMap = { html: 'html_template', css: 'css_template', js: 'js_template' };
            tpl[fieldMap[currentTemplateTab]] = _cmGetValue();
        }

        saveState();
        renderTemplateList();
        // Purge compiled Handlebars cache so stale template strings don't linger
        if (window.__cgRenderer?.clearHbsCache) window.__cgRenderer.clearHbsCache();
    }

    btn.textContent = t('tpl.saved');
    btn.classList.replace('bg-blue-600', 'bg-green-600');
    setTimeout(() => {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> ${t('tpl.save')}`;
        btn.classList.replace('bg-green-600', 'bg-blue-600');
    }, 2000);
}

// ===========================================================
// 9a. FIELDS BUILDER (Variable Definition System)
// ===========================================================
export function renderFieldsBuilder(tpl) {
    const container = document.getElementById('fields-builder-container');
    if (!container) return;
    container.innerHTML = '';
    const inputs = tpl.ocgInputs || [];
    inputs.forEach(inp => addFieldRow(inp.id, inp.label, inp.default, inp.type));
    refreshFieldsBuilderEmptyState();
    renderDefaultsEditor(tpl);
}

export function addFieldRow(idVal = '', labelVal = '', defVal = '', typeVal = 'text') {
    const container = document.getElementById('fields-builder-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'field-builder-row grid gap-2 items-center bg-[#111827] border border-gray-800 rounded px-3 py-2 hover:border-gray-700 transition-colors';
    row.style.gridTemplateColumns = '1fr 1.3fr 2fr 1fr auto';

    const typeOptions = [
        { value: 'text',     label: t('tpl.fieldTypeText') },
        { value: 'richtext', label: t('tpl.fieldTypeRichtext') },
        { value: 'list',     label: t('tpl.fieldTypeList') },
    ];
    const typeSelectHtml = typeOptions.map(o =>
        `<option value="${o.value}" ${typeVal === o.value ? 'selected' : ''}>${o.label}</option>`
    ).join('');

    row.innerHTML = `
        <input type="text" class="f-id w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] font-mono text-yellow-300 focus:outline-none focus:border-yellow-500 placeholder-gray-600" placeholder="${t('tpl.fieldIdPlaceholder')}" value="${escAttr(idVal)}">
        <input type="text" class="f-label w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] text-gray-200 focus:outline-none focus:border-blue-500 placeholder-gray-600" placeholder="${t('tpl.fieldLabelPlaceholder')}" value="${escAttr(labelVal)}">
        <input type="text" class="f-def w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] text-gray-400 focus:outline-none focus:border-blue-500 placeholder-gray-600" placeholder="${t('tpl.fieldDefaultPlaceholder')}" value="${escAttr(defVal)}">
        <select class="f-type w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] text-blue-400 focus:outline-none focus:border-blue-500 appearance-none">${typeSelectHtml}</select>
        <button class="field-row-delete w-7 h-7 rounded flex items-center justify-center bg-red-900/30 hover:bg-red-700 text-red-400 hover:text-white border border-red-900/50 transition-all text-sm shrink-0" title="${t('tpl.deleteVariable')}">&times;</button>
    `;

    row.querySelector('.field-row-delete').addEventListener('click', () => {
        row.remove();
        refreshFieldsBuilderEmptyState();
    });

    container.appendChild(row);
    refreshFieldsBuilderEmptyState();
}

export function refreshFieldsBuilderEmptyState() {
    const container = document.getElementById('fields-builder-container');
    const emptyMsg = document.getElementById('fields-builder-empty');
    if (!container || !emptyMsg) return;
    const hasRows = container.querySelectorAll('.field-builder-row').length > 0;
    emptyMsg.classList.toggle('hidden', hasRows);
    container.classList.toggle('hidden', !hasRows);
}

// ===========================================================
// 9b. DEFAULT VALUES EDITOR (Template Defaults)
// ===========================================================
export function renderDefaultsEditor(tpl) {
    const container = document.getElementById('tpl-defaults-editor');
    if (!container) return;

    const df = tpl.defaultFields || {};
    const ds = tpl.defaultStyle || {};
    const da = tpl.defaultAnimation || {};
    const dl = tpl.defaultLayout || {};
    const bg = ds.background || {};
    const typo = ds.typography || {};
    const subTypo = ds.subtitleTypography || {};
    const animIn = da.in || {};
    const animOut = da.out || {};

    const secClass = 'bg-gray-900/50 border border-gray-800 rounded p-3 space-y-2';
    const secTitle = (text) => `<h4 class="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">${text}</h4>`;
    const row = (label, id, val, type = 'text', extra = '') => {
        if (type === 'color') {
            return `<div class="flex items-center justify-between gap-2">
                <label class="text-[10px] text-gray-400 shrink-0 w-28">${label}</label>
                <div class="flex items-center gap-1 flex-1">
                    <input type="color" data-default="${id}" value="${escAttr(val || '#000000')}" class="w-7 h-7 rounded border border-gray-700 bg-gray-800 cursor-pointer p-0.5">
                    <input type="text" data-default="${id}" value="${escAttr(val || '')}" class="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-200 font-mono focus:outline-none focus:border-blue-500" placeholder="#000000">
                </div>
            </div>`;
        }
        if (type === 'select') {
            return `<div class="flex items-center justify-between gap-2">
                <label class="text-[10px] text-gray-400 shrink-0 w-28">${label}</label>
                <select data-default="${id}" class="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[10px] text-blue-400 focus:outline-none focus:border-blue-500 appearance-none">${extra}</select>
            </div>`;
        }
        if (type === 'number') {
            return `<div class="flex items-center justify-between gap-2">
                <label class="text-[10px] text-gray-400 shrink-0 w-28">${label}</label>
                <input type="number" data-default="${id}" value="${val ?? ''}" ${extra} class="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-200 focus:outline-none focus:border-blue-500">
            </div>`;
        }
        return `<div class="flex items-center justify-between gap-2">
            <label class="text-[10px] text-gray-400 shrink-0 w-28">${label}</label>
            <input type="text" data-default="${id}" value="${escAttr(val || '')}" class="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-200 focus:outline-none focus:border-blue-500" placeholder="${extra}">
        </div>`;
    };

    const opts = (vals, selected) => vals.map(v => {
        const [val, label] = Array.isArray(v) ? v : [v, v];
        return `<option value="${val}" ${selected === val ? 'selected' : ''}>${label}</option>`;
    }).join('');

    container.innerHTML = `
        <div class="${secClass}">
            ${secTitle(t('tpl.defaultsContentSection'))}
            ${row(t('tpl.defaultsTitleLabel'), 'defaultFields.title', df.title, 'text', t('tpl.defaultTitlePlaceholder'))}
            ${row(t('tpl.defaultsSubtitleLabel'), 'defaultFields.subtitle', df.subtitle, 'text', t('tpl.defaultSubtitlePlaceholder'))}
            ${row(t('tpl.defaultsIntroText'), 'defaultFields.introText', df.introText, 'text', t('tpl.wiperTextPlaceholder'))}
            ${row(t('tpl.defaultsTickerSpeed'), 'defaultFields.speed', df.speed, 'number', 'min="1" max="500"')}
            ${row(t('tpl.defaultsTickerMode'), 'defaultFields.tickerMode', df.tickerMode, 'select', opts([['whip','Whip'],['horizontal',t('tpl.tickerModeHorizontal')],['vertical',t('tpl.tickerModeVertical')],['scrolling','Scrolling']], df.tickerMode))}
        </div>

        <div class="${secClass}">
            ${secTitle(t('tpl.defaultsBgBorder'))}
            ${row(t('tpl.defaultsBgType'), 'defaultStyle.background.type', bg.type, 'select', opts([['solid',t('tpl.bgTypeSolid')],['gradient',t('tpl.bgTypeGradient')],['transparent',t('tpl.bgTypeTransparent')]], bg.type))}
            ${row(t('tpl.defaultsBgColor'), 'defaultStyle.background.color', bg.color, 'color')}
            ${row(t('tpl.defaultsBgColor2'), 'defaultStyle.background.color2', bg.color2, 'color')}
            ${row(t('tpl.defaultsGradientAngle'), 'defaultStyle.background.gradientAngle', bg.gradientAngle, 'number', 'min="0" max="360"')}
            ${row(t('tpl.defaultsBorderColor'), 'defaultStyle.background.borderColor', bg.borderColor, 'color')}
            ${row(t('tpl.defaultsBorderWidth'), 'defaultStyle.background.borderWidth', bg.borderWidth, 'number', 'min="0" max="20"')}
            ${row(t('tpl.defaultsBorderRadius'), 'defaultStyle.background.borderRadius', bg.borderRadius, 'number', 'min="0" max="100"')}
            ${row(t('tpl.defaultsSubtitleBg'), 'defaultStyle.background.subtitleBackgroundColor', bg.subtitleBackgroundColor, 'color')}
        </div>

        <div class="${secClass}">
            ${secTitle(t('tpl.defaultsTitleTypography'))}
            ${row(t('tpl.defaultsTextColor'), 'defaultStyle.typography.color', typo.color, 'color')}
            ${row(t('tpl.defaultsFontFamily'), 'defaultStyle.typography.fontFamily', typo.fontFamily, 'text', t('tpl.fontFamilyPlaceholder'))}
            ${row(t('tpl.defaultsFontSize'), 'defaultStyle.typography.fontSize', typo.fontSize, 'number', 'min="8" max="200"')}
            ${row(t('tpl.defaultsFontWeight'), 'defaultStyle.typography.fontWeight', typo.fontWeight, 'select', opts([['normal','Normal'],['bold','Bold'],['100','100'],['200','200'],['300','300'],['400','400'],['500','500'],['600','600'],['700','700'],['800','800'],['900','900']], typo.fontWeight))}
            ${row(t('tpl.defaultsTextTransform'), 'defaultStyle.typography.textTransform', typo.textTransform, 'select', opts([['none',t('tpl.transformNone')],['uppercase',t('tpl.transformUppercase')],['lowercase',t('tpl.transformLowercase')],['capitalize',t('tpl.transformCapitalize')]], typo.textTransform))}
        </div>

        <div class="${secClass}">
            ${secTitle(t('tpl.defaultsSubtitleTypography'))}
            ${row(t('tpl.defaultsTextColor'), 'defaultStyle.subtitleTypography.color', subTypo.color, 'color')}
            ${row(t('tpl.defaultsFontFamily'), 'defaultStyle.subtitleTypography.fontFamily', subTypo.fontFamily, 'text', t('tpl.fontFamilyPlaceholder'))}
            ${row(t('tpl.defaultsFontSize'), 'defaultStyle.subtitleTypography.fontSize', subTypo.fontSize, 'number', 'min="8" max="200"')}
            ${row(t('tpl.defaultsFontWeight'), 'defaultStyle.subtitleTypography.fontWeight', subTypo.fontWeight, 'select', opts([['normal','Normal'],['bold','Bold'],['100','100'],['300','300'],['500','500'],['700','700'],['900','900']], subTypo.fontWeight))}
        </div>

        <div class="${secClass}">
            ${secTitle(t('tpl.defaultsLayout'))}
            ${row(t('tpl.defaultsWidth'), 'defaultLayout.width', dl.width, 'number', 'min="0" max="3840"')}
            ${row(t('tpl.defaultsHeight'), 'defaultLayout.height', dl.height, 'number', 'min="0" max="2160"')}
            ${row(t('tpl.defaultsPosX'), 'defaultLayout.x', dl.x, 'number')}
            ${row(t('tpl.defaultsPosY'), 'defaultLayout.y', dl.y, 'number')}
            ${row(t('tpl.defaultsScale'), 'defaultLayout.scale', dl.scale, 'number', 'min="0.1" max="5" step="0.1"')}
            ${row(t('tpl.defaultsLayer'), 'defaultLayout.layer', dl.layer, 'number', 'min="0" max="100"')}
        </div>

        <div class="${secClass}">
            ${secTitle(t('tpl.defaultsAnimIn'))}
            ${row(t('tpl.defaultsAnimType'), 'defaultAnimation.in.type', animIn.type, 'select', opts([['slide','Slide'],['fade','Fade'],['zoom','Zoom'],['wipe','Wipe'],['none',t('tpl.animTypeNone')]], animIn.type))}
            ${row(t('tpl.defaultsAnimDirection'), 'defaultAnimation.in.direction', animIn.direction, 'select', opts([['left',t('tpl.dirLeft')],['right',t('tpl.dirRight')],['top',t('tpl.dirTop')],['bottom',t('tpl.dirBottom')]], animIn.direction))}
            ${row(t('tpl.defaultsDuration'), 'defaultAnimation.in.duration', animIn.duration, 'number', 'min="0" max="10" step="0.1"')}
            ${row(t('tpl.defaultsDelay'), 'defaultAnimation.in.delay', animIn.delay, 'number', 'min="0" max="10" step="0.1"')}
        </div>

        <div class="${secClass}">
            ${secTitle(t('tpl.defaultsAnimOut'))}
            ${row(t('tpl.defaultsAnimType'), 'defaultAnimation.out.type', animOut.type, 'select', opts([['slide','Slide'],['fade','Fade'],['zoom','Zoom'],['wipe','Wipe'],['none',t('tpl.animTypeNone')]], animOut.type))}
            ${row(t('tpl.defaultsAnimDirection'), 'defaultAnimation.out.direction', animOut.direction, 'select', opts([['left',t('tpl.dirLeft')],['right',t('tpl.dirRight')],['top',t('tpl.dirTop')],['bottom',t('tpl.dirBottom')]], animOut.direction))}
            ${row(t('tpl.defaultsDuration'), 'defaultAnimation.out.duration', animOut.duration, 'number', 'min="0" max="10" step="0.1"')}
            ${row(t('tpl.defaultsDelay'), 'defaultAnimation.out.delay', animOut.delay, 'number', 'min="0" max="10" step="0.1"')}
        </div>
    `;

    // Bind change events
    container.querySelectorAll('[data-default]').forEach(el => {
        const handler = () => {
            const path = el.getAttribute('data-default');
            let value = el.value;
            if (el.type === 'number') value = parseFloat(value) || 0;

            // Set value in template using dot path
            const parts = path.split('.');
            let obj = tpl;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
                obj = obj[parts[i]];
            }
            obj[parts[parts.length - 1]] = value;

            // Sync paired color inputs
            if (el.type === 'color') {
                const textInput = container.querySelector(`input[type="text"][data-default="${path}"]`);
                if (textInput && textInput !== el) textInput.value = value;
            } else if (el.type === 'text' && /^#[0-9a-f]{3,8}$/i.test(value)) {
                const colorInput = container.querySelector(`input[type="color"][data-default="${path}"]`);
                if (colorInput && colorInput !== el) colorInput.value = value.length === 4 ? value + value.slice(1) : value;
            }
        };
        el.addEventListener('change', handler);
        if (el.tagName === 'INPUT' && el.type !== 'color') el.addEventListener('input', handler);
    });
}

// ===========================================================
// 10. TEMPLATE SELECTOR MODAL
// ===========================================================
export function openTemplateSelectorModal() {
    const modal = document.getElementById('modal-template-selector');
    const list = document.getElementById('modal-tpl-list');
    modal.classList.remove('hidden');
    list.innerHTML = '';

    state.templates.forEach(tpl => {
        const card = document.createElement('div');
        card.className = 'cursor-pointer bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-blue-500 rounded-lg p-4 transition-all group';
        card.innerHTML = `
    <h4 class="font-bold text-sm text-white group-hover:text-blue-400 transition-colors" > ${tpl.name}</h4>
        <p class="text-[10px] font-mono text-gray-500 mt-1">${tpl.type} · ID: ${tpl.id}</p>
`;
        card.onclick = () => {
            createGraphicFromTemplate(tpl);
            modal.classList.add('hidden');
        };
        list.appendChild(card);
    });
}

export function createGraphicFromTemplate(templateIdOrTpl) {
    let tpl;
    if (typeof templateIdOrTpl === 'string') {
        tpl = state.templates.find(t => t.id === templateIdOrTpl);
    } else {
        tpl = templateIdOrTpl;
    }

    if (!tpl) return;

    console.log(`[CreateGraphic] Template: ${tpl.name}, defaultLayout:`, tpl.defaultLayout);

    const newG = {
        id: 'g-' + crypto.randomUUID(),
        templateId: tpl.id,
        type: tpl.type || 'LOWER_THIRD',
        name: tpl.name,
        visible: false,
        title: tpl.defaultFields?.title || tpl.name,
        titleHtml: tpl.defaultFields?.titleHtml || tpl.defaultFields?.title || tpl.name,
        subtitle: tpl.defaultFields?.subtitle || '',
        items: tpl.defaultFields?.items || [],
        speed: tpl.defaultFields?.speed !== undefined ? tpl.defaultFields.speed : 100,
        squashing: tpl.defaultFields?.squashing !== undefined ? tpl.defaultFields.squashing : false,
        useCodeOverride: tpl.defaultFields?.useCodeOverride || false,
        wiper: tpl.defaultFields?.wiper ? JSON.parse(JSON.stringify(tpl.defaultFields.wiper)) : undefined,
        fields: (() => {
            const f = tpl.defaultFields ? JSON.parse(JSON.stringify(tpl.defaultFields)) : {};
            delete f.title;
            delete f.titleHtml;
            delete f.subtitle;
            delete f.speed;
            delete f.squashing;
            delete f.items;
            delete f.useCodeOverride;
            delete f.wiper;
            // Initialize all ocgInputs with their defaults if not already present
            (tpl.ocgInputs || []).forEach(inp => {
                if (f[inp.id] === undefined) f[inp.id] = inp.default || '';
            });
            return f;
        })(),
        layout: {
            x: 100,
            y: 800,
            width: tpl.defaultLayout?.width || tpl.defaultFields?.['f-width'] || tpl.defaultFields?.['width'] || undefined,
            height: tpl.defaultLayout?.height || tpl.defaultFields?.['f-height'] || tpl.defaultFields?.['height'] || undefined,
            scale: 1,
            layer: 1,
            ...(tpl.defaultLayout || {})
        },
        animation: tpl.defaultAnimation ? JSON.parse(JSON.stringify(tpl.defaultAnimation)) : {
            in: { type: 'slide', direction: 'left', duration: 0.5, delay: 0, ease: 'ease-out' },
            out: { type: 'fade', direction: 'left', duration: 0.5, delay: 0, ease: 'ease-in' }
        },
        hotkey: null,
        style: tpl.defaultStyle ? JSON.parse(JSON.stringify(tpl.defaultStyle)) : {
            background: {
                type: 'solid',
                color: tpl.defaultFields?.primaryColor || '#0047AB',
                color2: tpl.defaultFields?.secondaryColor || '#000000',
                gradientAngle: 135,
                opacity: 1,
                borderColor: tpl.defaultFields?.accentColor || '#ffffff',
                borderWidth: 0,
                borderRadius: 0,
                subtitleBackgroundColor: tpl.defaultFields?.subtitleBackgroundColor || '#000000'
            },
            typography: {
                color: tpl.defaultFields?.titleColor || '#ffffff',
                fontFamily: 'Inter',
                fontSize: tpl.defaultFields?.titleSize || 30,
                fontWeight: tpl.defaultFields?.titleWeight || 'bold'
            },
            subtitleTypography: {
                color: tpl.defaultFields?.subtitleColor || '#eeeeee',
                fontFamily: 'Inter',
                fontSize: tpl.defaultFields?.subtitleSize || 20,
                fontWeight: tpl.defaultFields?.subtitleWeight || 'normal'
            }
        }
    };

    console.log(`[CreateGraphic] New graphic layout:`, newG.layout);
    state.graphics.push(newG);
    saveState();
    window._cgModules.renderShotbox();
    window._cgModules.setPreviewGraphic(structuredClone(newG));
    window._cgModules.openInspector(newG.id);
}
