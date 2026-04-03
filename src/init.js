// ======================================================
// src/init.js — Application bootstrap and global events
// ======================================================

import {
    state, setState, socket, previewGraphic, setPreviewGraphic_store,
    selectedGraphicId, setSelectedGraphicId, currentPage, setCurrentPage,
    currentTemplateId, setCurrentTemplateId, currentTemplateTab, setCurrentTemplateTab,
    codeEditorGraphicId, setCodeEditorGraphicId, inspectorAccordionStates,
    currentInspectorTab, setCurrentInspectorTab, DB_KEY, saveState, uiChannel, panelMode
} from './store.js';
import { escAttr } from './utils.js';
import { _aceInit, _aceSuppressChange } from './ace-editor.js';
import {
    setupMonitorScaling, setPreviewGraphic, refreshPreviewMonitor,
    refreshPreviewControls, updateProgramMonitor
} from './components/monitor.js';
import { renderShotbox, initShotboxDelegation } from './components/shotbox.js';
import { renderTemplateList, openTemplateEditor, openGraphicCodeEditor, _getGraphicForCodeEditor,
    updateTemplateEditorTab, _saveCurrentCodeEditorContent, saveCurrentTemplate,
    addFieldRow, importTemplate, importOCGTemplates, exportOCGTemplate,
    openTemplateSelectorModal } from './components/templates.js';
import { renderPresetSelect, bindPresetEvents } from './components/presets.js';
import { openInspector, closeInspector, renderInspectorBody } from './components/inspector.js';
import { bindWysiwygModalEvents } from './components/wysiwyg.js';
import { bindTickerEditorEvents } from './components/ticker.js';
import { switchPage } from './components/settings.js';
import { openHotkeyAssignModal, triggerGraphicHotkey, _hotkeyAssignActive, _globalPressedKeys } from './components/hotkeys.js';

let _globalEventsBound = false;

// BroadcastChannel message handler — runs once at module load
uiChannel.onmessage = (e) => {
    if (e.data.action === 'select_graphic') {
        const gfx = state.graphics.find(g => g.id === e.data.id);
        if (gfx) {
            setPreviewGraphic(structuredClone(gfx), true);
            openInspector(e.data.id);
        }
    } else if (e.data.action === 'preview_graphic_update') {
        setPreviewGraphic_store(e.data.previewGraphic);
        refreshPreviewMonitor(true);
    } else if (e.data.action === 'request_preview_state' && panelMode !== 'preview') {
        uiChannel.postMessage({ action: 'preview_graphic_update', previewGraphic });
    }
};

export async function init() {
    socket.on('initialState', (serverState) => {
        setState(serverState);
        renderShotbox();
        renderTemplateList();
        renderPresetSelect();
        if (!_globalEventsBound) {
            setupMonitorScaling();
            bindGlobalEvents();
            bindWysiwygModalEvents();
            bindTickerEditorEvents();
            bindPresetEvents();
            initShotboxDelegation();
            _globalEventsBound = true;
        }
        document.getElementById('loading-overlay').classList.add('hidden');

        // ==== STANDALONE PANELS SETUP ====
        if (panelMode === 'bank') {
            document.getElementById('preview-monitor-wrap').parentElement.style.display = 'none';
            const inspector = document.getElementById('inspector-panel');
            if (inspector) inspector.style.display = 'none';
        } else if (panelMode === 'inspector') {
            const header = document.getElementById('app-header');
            if (header) header.style.display = 'none';
            const strip = document.getElementById('header-show-strip');
            if (strip) strip.style.display = 'none';
            document.getElementById('dashboard-left').style.display = 'none';
            const inspector = document.getElementById('inspector-panel');
            if (inspector) {
                inspector.style.display = 'flex';
                inspector.classList.remove('w-72');
                inspector.classList.add('w-full');
            }
        } else if (panelMode === 'preview') {
            const header = document.getElementById('app-header');
            if (header) header.style.display = 'none';
            const strip = document.getElementById('header-show-strip');
            if (strip) strip.style.display = 'none';

            const programWrap = document.getElementById('program-monitor-wrap');
            if (programWrap) programWrap.style.display = 'none';
            const shotboxSection = document.querySelector('#dashboard-left > .flex.flex-col.flex-1');
            if (shotboxSection) shotboxSection.style.display = 'none';
            const inspector = document.getElementById('inspector-panel');
            if (inspector) inspector.style.display = 'none';

            const previewWrap = document.getElementById('preview-monitor-wrap');
            if (previewWrap) {
                const labelBar = document.getElementById('preview-label-bar');
                const controlsBar = document.getElementById('preview-controls-bar');
                if (labelBar) labelBar.style.display = 'none';
                if (controlsBar) controlsBar.style.display = 'none';

                previewWrap.classList.remove('w-1/2', 'lg:w-1/2');
                previewWrap.classList.add('w-full');
                previewWrap.style.flex = '1 1 0';
                previewWrap.style.minHeight = '0';
            }

            const monitorsRow = previewWrap?.parentElement;
            if (monitorsRow) {
                monitorsRow.classList.remove('shrink-0');
                monitorsRow.classList.add('flex-1', 'min-h-0');
                monitorsRow.style.padding = '0';
                monitorsRow.style.gap = '0';
            }

            const collapsibleWrap = document.getElementById('preview-monitor-collapsible');
            if (collapsibleWrap) {
                collapsibleWrap.style.flex = '1 1 0';
                collapsibleWrap.style.minHeight = '0';
                collapsibleWrap.style.display = 'flex';
                collapsibleWrap.style.flexDirection = 'column';
            }
            const monitorInner = document.getElementById('preview-monitor-inner');
            if (monitorInner) {
                monitorInner.classList.remove('aspect-video');
                monitorInner.style.flex = '1 1 0';
                monitorInner.style.minHeight = '0';
                monitorInner.style.border = 'none';
            }

            const dashLeft = document.getElementById('dashboard-left');
            if (dashLeft) {
                dashLeft.style.flex = '1 1 0';
                dashLeft.style.minHeight = '0';
            }

            document.body.style.backgroundColor = '#000';

            document.addEventListener('keydown', (e) => {
                if (e.key === 's' || e.key === 'S') {
                    document.querySelectorAll('.ebu-safe-area').forEach(el => el.classList.toggle('hidden'));
                }
            });

            const _requestPreview = () => uiChannel.postMessage({ action: 'request_preview_state' });
            _requestPreview();
            setTimeout(_requestPreview, 300);
            setTimeout(_requestPreview, 800);
            setTimeout(_requestPreview, 1500);
        }

        document.getElementById('btn-kill-all')?.addEventListener('click', () => {
            state.graphics.forEach(g => g.visible = false);
            saveState();
            renderShotbox();
            updateProgramMonitor();
        });

        function changeBg(color) {
            document.querySelectorAll('#preview-monitor-inner, #program-monitor-inner').forEach(m => {
                if (color === 'transparent') {
                    m.style.backgroundImage = 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)';
                    m.style.backgroundSize = '20px 20px';
                    m.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
                    m.style.backgroundColor = '#111';
                } else {
                    m.style.backgroundImage = 'none';
                    m.style.backgroundColor = color;
                }
            });
            const picker = document.getElementById('hex-bg-picker');
            const hexInput = document.getElementById('hex-bg');
            if (color !== 'transparent') {
                if (picker) picker.value = color;
                if (hexInput) hexInput.value = color;
            }
            socket.emit('set_background', color);
        }

        document.getElementById('hex-bg-picker')?.addEventListener('input', (e) => {
            document.getElementById('hex-bg').value = e.target.value;
            changeBg(e.target.value);
        });
        document.getElementById('hex-bg')?.addEventListener('change', (e) => {
            document.getElementById('hex-bg-picker').value = e.target.value;
            changeBg(e.target.value);
        });
        document.getElementById('btn-bg-set')?.addEventListener('click', () => {
            changeBg(document.getElementById('hex-bg').value);
        });
        document.getElementById('btn-bg-trans')?.addEventListener('click', () => {
            changeBg('transparent');
        });

        document.getElementById('btn-toggle-safe-area')?.addEventListener('click', (e) => {
            document.querySelectorAll('.ebu-safe-area').forEach(el => {
                el.classList.toggle('hidden');
            });
            e.currentTarget.classList.toggle('text-white');
            e.currentTarget.classList.toggle('bg-blue-600');
        });

        document.getElementById('btn-toggle-safe-area-program')?.addEventListener('click', (e) => {
            document.querySelectorAll('.ebu-safe-area').forEach(el => {
                el.classList.toggle('hidden');
            });
            e.currentTarget.classList.toggle('text-white');
            e.currentTarget.classList.toggle('bg-blue-600');
            const previewBtn = document.getElementById('btn-toggle-safe-area');
            if (previewBtn) {
                previewBtn.classList.toggle('text-white');
                previewBtn.classList.toggle('bg-blue-600');
            }
        });

        const btnImport = document.getElementById('btn-import-template');
        const tplFileInput = document.getElementById('tpl-file-input');
        if (btnImport) btnImport.onclick = () => tplFileInput.click();
        if (tplFileInput) tplFileInput.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) importTemplate(file);
        };

        const btnImportOCG = document.getElementById('btn-import-ocg-template');
        const ocgFileInput = document.getElementById('ocg-file-input');
        const btnExportOCG = document.getElementById('btn-export-ocg-template');

        if (btnImportOCG) btnImportOCG.onclick = () => ocgFileInput.click();
        if (ocgFileInput) ocgFileInput.onchange = (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                importOCGTemplates(files);
            }
        };
        if (btnExportOCG) btnExportOCG.onclick = () => {
             if (currentTemplateId) exportOCGTemplate(currentTemplateId);
        };
    });

    socket.on('stateUpdated', (newState) => {
        setState(newState);
        renderShotbox();
        renderTemplateList();
        renderPresetSelect();
        if (selectedGraphicId) {
            if (!window._draftGraphics[selectedGraphicId]) {
                openInspector(selectedGraphicId);
            }
        }
    });
}

function bindGlobalEvents() {
    const bind = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    // Navigation
    bind('nav-dashboard', 'click', () => switchPage('dashboard'));
    bind('nav-templates', 'click', () => switchPage('templates'));
    const navSbtn = document.getElementById('nav-settings');
    if (navSbtn) navSbtn.onclick = () => switchPage('settings');

    // Inspector Tabs
    const tabMain = document.getElementById('ins-tab-main');
    const tabAnim = document.getElementById('ins-tab-anim');
    const insTabActive = "flex-1 py-2 text-[10px] font-bold text-blue-400 border-b-2 border-blue-500 bg-gray-800/50 transition-colors";
    const insTabInactive = "flex-1 py-2 text-[10px] font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-300 transition-colors";
    function switchInsTab(tab) {
        setCurrentInspectorTab(tab);
        ['main', 'anim'].forEach(t => {
            document.getElementById(`ins-tab-content-${t}`)?.classList.toggle('hidden', t !== tab);
        });
        if (tabMain) tabMain.className = tab === 'main' ? insTabActive : insTabInactive;
        if (tabAnim) tabAnim.className = tab === 'anim' ? insTabActive : insTabInactive;
    }
    if (tabMain) tabMain.onclick = () => switchInsTab('main');
    if (tabAnim) tabAnim.onclick = () => {
        if (selectedGraphicId && inspectorAccordionStates[selectedGraphicId]) {
            inspectorAccordionStates[selectedGraphicId].animation = true;
            openInspector(selectedGraphicId);
        }
        switchInsTab('anim');
    };

    // Settings
    const wInput = document.getElementById('setting-res-width');
    const hInput = document.getElementById('setting-res-height');
    if (wInput) wInput.addEventListener('change', (e) => {
        if (!state.settings) state.settings = {};
        if (!state.settings.resolution) state.settings.resolution = {};
        state.settings.resolution.width = parseInt(e.target.value) || 1920;
        saveState();
    });
    if (hInput) hInput.addEventListener('change', (e) => {
        if (!state.settings) state.settings = {};
        if (!state.settings.resolution) state.settings.resolution = {};
        state.settings.resolution.height = parseInt(e.target.value) || 1080;
        saveState();
    });

    const fontDropdown = document.getElementById('setting-global-font-family');
    const fontCbContainer = document.getElementById('setting-global-font-graphics');

    if (fontDropdown) {
        fontDropdown.addEventListener('change', (e) => {
            if (!state.settings) state.settings = {};
            state.settings.globalFontFamily = e.target.value;
            saveState();
            if (previewGraphic && state.settings.globalFontGraphics?.includes(previewGraphic.id)) {
                refreshPreviewMonitor();
            }
        });
    }

    if (fontCbContainer) {
        fontCbContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('global-font-cb')) {
                if (!state.settings) state.settings = {};
                if (!state.settings.globalFontGraphics) state.settings.globalFontGraphics = [];
                const graphicId = e.target.value;
                const isChecked = e.target.checked;
                if (isChecked) {
                    if (!state.settings.globalFontGraphics.includes(graphicId)) {
                        state.settings.globalFontGraphics.push(graphicId);
                    }
                } else {
                    state.settings.globalFontGraphics = state.settings.globalFontGraphics.filter(id => id !== graphicId);
                }
                saveState();
                if (previewGraphic && previewGraphic.id === graphicId) {
                    refreshPreviewMonitor();
                }
            }
        });
    }

    const radiusInput = document.getElementById('setting-global-radius');
    const radiusCbContainer = document.getElementById('setting-global-radius-graphics');

    if (radiusInput) {
        radiusInput.addEventListener('change', (e) => {
            if (!state.settings) state.settings = {};
            state.settings.globalBorderRadius = parseInt(e.target.value) || 0;
            saveState();
            if (previewGraphic && state.settings.globalRadiusGraphics?.includes(previewGraphic.id)) {
                refreshPreviewMonitor();
            }
        });
    }

    if (radiusCbContainer) {
        radiusCbContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('global-radius-cb')) {
                if (!state.settings) state.settings = {};
                if (!state.settings.globalRadiusGraphics) state.settings.globalRadiusGraphics = [];
                const graphicId = e.target.value;
                const isChecked = e.target.checked;
                if (isChecked) {
                    if (!state.settings.globalRadiusGraphics.includes(graphicId)) {
                        state.settings.globalRadiusGraphics.push(graphicId);
                    }
                } else {
                    state.settings.globalRadiusGraphics = state.settings.globalRadiusGraphics.filter(id => id !== graphicId);
                }
                saveState();
                if (previewGraphic && previewGraphic.id === graphicId) {
                    refreshPreviewMonitor();
                }
            }
        });
    }

    const updateGlobalShadow = (field, value) => {
        if (!state.settings) state.settings = {};
        if (!state.settings.globalShadow) state.settings.globalShadow = { enabled: false, color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 0, offsetY: 2 };
        state.settings.globalShadow[field] = value;
        saveState();
        refreshPreviewMonitor();
    };

    const shadowEnabled = document.getElementById('setting-shadow-enabled');
    const shadowColor = document.getElementById('setting-shadow-color');
    const shadowColorHex = document.getElementById('setting-shadow-color-hex');
    const shadowBlur = document.getElementById('setting-shadow-blur');
    const shadowOffsetX = document.getElementById('setting-shadow-offset-x');
    const shadowOffsetY = document.getElementById('setting-shadow-offset-y');
    const shadowControls = document.getElementById('setting-shadow-controls');

    if (shadowEnabled) {
        shadowEnabled.addEventListener('change', (e) => {
            updateGlobalShadow('enabled', e.target.checked);
            if (shadowControls) {
                shadowControls.className = e.target.checked ? 'space-y-3 transition-opacity block' : 'space-y-3 opacity-50 pointer-events-none transition-opacity';
            }
        });
    }

    if (shadowColor && shadowColorHex) {
        shadowColor.addEventListener('input', (e) => {
            shadowColorHex.value = e.target.value;
            updateGlobalShadow('color', e.target.value);
        });
        shadowColorHex.addEventListener('change', (e) => {
            shadowColor.value = e.target.value;
            updateGlobalShadow('color', e.target.value);
        });
    }

    if (shadowBlur) shadowBlur.addEventListener('change', (e) => updateGlobalShadow('blur', parseInt(e.target.value) || 0));
    if (shadowOffsetX) shadowOffsetX.addEventListener('change', (e) => updateGlobalShadow('offsetX', parseInt(e.target.value) || 0));
    if (shadowOffsetY) shadowOffsetY.addEventListener('change', (e) => updateGlobalShadow('offsetY', parseInt(e.target.value) || 0));

    document.getElementById('reset-db-btn').onclick = async () => {
        if (!confirm('Zresetować DB do db.json? Wszystkie zmiany zostaną utracone.')) return;
        try {
            const res = await fetch('db.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!data || !data.templates) throw new Error('Nieprawidłowy format db.json');
            localStorage.removeItem(DB_KEY);
            setState(data);
            saveState();
            setSelectedGraphicId(null);
            setPreviewGraphic_store(null);
            closeInspector();
            renderShotbox();
            renderTemplateList();
            updateProgramMonitor();
        } catch (err) {
            alert(`Nie udało się zresetować bazy danych: ${err.message}`);
            console.error('[Reset DB] Error:', err);
        }
    };

    document.getElementById('btn-edit-preview').onclick = () => {
        if (!previewGraphic) return;
        openInspector(previewGraphic.id);
    };

    document.getElementById('btn-update-active').onclick = () => {
        if (!previewGraphic) return;
        window.syncDraftGraphic(previewGraphic.id);
    };

    document.getElementById('btn-take-preview').onclick = () => {
        if (!previewGraphic) return;

        if (window._draftGraphics[previewGraphic.id]) {
            const draft = window._draftGraphics[previewGraphic.id];
            const idx = state.graphics.findIndex(g => g.id === draft.id);
            if (idx !== -1) state.graphics[idx] = structuredClone(draft);
            delete window._draftGraphics[previewGraphic.id];
        }

        const g = state.graphics.find(g => g.id === previewGraphic.id);
        if (g) {
            if (!g.visible) g.visible = true;
            else g.visible = false;
            previewGraphic.visible = g.visible;
            saveState();
            renderShotbox();
            refreshPreviewControls();
        }
    };

    document.getElementById('btn-clear-program').onclick = () => {
        state.graphics.forEach(g => { if (g.visible) g.visible = false; });
        saveState();
        renderShotbox();
        updateProgramMonitor();
    };

    bind('btn-clear-bank', 'click', () => {
        if (confirm('Czy na pewno chcesz usunąć WSZYSTKIE elementy z banku grafik?')) {
            if (confirm('Jesteś absolutnie pewien? Tej operacji nie można prosto cofnąć.')) {
                state.graphics = [];
                setSelectedGraphicId(null);
                setPreviewGraphic_store(null);
                closeInspector();
                saveState();
                renderShotbox();
                refreshPreviewMonitor();
                updateProgramMonitor();
            }
        }
    });

    document.getElementById('btn-new-graphic').onclick = openTemplateSelectorModal;
    document.getElementById('modal-tpl-close').onclick = () => document.getElementById('modal-template-selector').classList.add('hidden');

    document.getElementById('inspector-type-select').onchange = (e) => {
        const g = state.graphics.find(g => g.id === selectedGraphicId);
        if (!g) return;
        g.type = e.target.value;
        saveState();
        openInspector(g.id);
    };

    document.getElementById('btn-save-graphic').onclick = () => {
        if (!previewGraphic) return;

        const draft = window._draftGraphics[previewGraphic.id];
        const g = state.graphics.find(x => x.id === previewGraphic.id);

        if (g && g.visible) {
            const btn = document.getElementById('btn-save-graphic');
            btn.textContent = 'SCHOWANE W SZKICU (UŻYJ SYNCHR.)';
            setTimeout(() => {
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> ZAPISZ ZMIANY`;
            }, 2000);
            return;
        }

        if (draft) {
            const idx = state.graphics.findIndex(x => x.id === draft.id);
            if (idx !== -1) {
                const saved = structuredClone(draft);
                delete saved._codeTab;
                state.graphics[idx] = saved;
                state.graphics[idx].visible = false;
                delete window._draftGraphics[draft.id];
            }
        } else if (g) {
            Object.assign(g, previewGraphic);
            delete g._codeTab;
            g.visible = false;
        }

        saveState();
        renderShotbox();
        const btn = document.getElementById('btn-save-graphic');
        btn.textContent = '✓ Zapisano!';
        setTimeout(() => {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> ZAPISZ ZMIANY`;
        }, 2000);
    };

    document.getElementById('btn-ins-save-template').onclick = () => {
        if (!selectedGraphicId) return;
        const g = state.graphics.find(gfx => gfx.id === selectedGraphicId);
        if (!g) return;
        const tpl = state.templates.find(t => t.id === g.templateId);
        if (!tpl) {
            alert('Nie znaleziono źródłowego szablonu.');
            return;
        }
        const newTpl = JSON.parse(JSON.stringify(tpl));
        newTpl.id = crypto.randomUUID();
        newTpl.name = g.name + ' (Szablon)';

        newTpl.type = g.type || newTpl.type;
        if (g.useCodeOverride) {
            newTpl.html_template = g.html_override || newTpl.html_template;
            newTpl.css_template = g.css_override || newTpl.css_template;
            newTpl.js_template = g.js_override || newTpl.js_template;
        }

        newTpl.defaultFields = newTpl.defaultFields || {};
        if (g.fields) Object.assign(newTpl.defaultFields, JSON.parse(JSON.stringify(g.fields)));

        if (g.title !== undefined) newTpl.defaultFields.title = g.title;
        if (g.titleHtml !== undefined) newTpl.defaultFields.titleHtml = g.titleHtml;
        if (g.subtitle !== undefined) newTpl.defaultFields.subtitle = g.subtitle;
        if (g.speed !== undefined) newTpl.defaultFields.speed = g.speed;
        if (g.squashing !== undefined) newTpl.defaultFields.squashing = g.squashing;
        if (g.items !== undefined) newTpl.defaultFields.items = JSON.parse(JSON.stringify(g.items));
        if (g.useCodeOverride !== undefined) newTpl.defaultFields.useCodeOverride = g.useCodeOverride;
        if (g.wiper !== undefined) newTpl.defaultFields.wiper = JSON.parse(JSON.stringify(g.wiper));

        if (g.style) newTpl.defaultStyle = JSON.parse(JSON.stringify(g.style));
        if (g.animation) newTpl.defaultAnimation = JSON.parse(JSON.stringify(g.animation));
        if (g.layout) newTpl.defaultLayout = JSON.parse(JSON.stringify(g.layout));

        state.templates.push(newTpl);
        saveState();
        renderTemplateList();

        const btn = document.getElementById('btn-ins-save-template');
        btn.innerHTML = '<span>✓ ZAPISANO</span>';
        setTimeout(() => {
            btn.innerHTML = '<span>ZAPISZ JAKO</span><span>SZABLON</span>';
        }, 2000);
    };

    document.getElementById('btn-ins-edit-code').onclick = () => {
        if (!selectedGraphicId) return;
        openGraphicCodeEditor(selectedGraphicId);
    };

    document.getElementById('btn-ins-export-json').onclick = () => {
        if (!selectedGraphicId) return;
        const g = state.graphics.find(gfx => gfx.id === selectedGraphicId);
        if (!g) return;
        const tpl = state.templates.find(t => t.id === g.templateId);
        if (!tpl) {
            alert('Nie znaleziono źródłowego szablonu.');
            return;
        }
        const exportTpl = JSON.parse(JSON.stringify(tpl));
        exportTpl.id = crypto.randomUUID();
        exportTpl.name = g.name + ' (Eksport)';

        exportTpl.type = g.type || exportTpl.type;
        if (g.useCodeOverride) {
            exportTpl.html_template = g.html_override || exportTpl.html_template;
            exportTpl.css_template = g.css_override || exportTpl.css_template;
            exportTpl.js_template = g.js_override || exportTpl.js_template;
        }

        exportTpl.defaultFields = exportTpl.defaultFields || {};
        if (g.fields) Object.assign(exportTpl.defaultFields, JSON.parse(JSON.stringify(g.fields)));

        if (g.title !== undefined) exportTpl.defaultFields.title = g.title;
        if (g.titleHtml !== undefined) exportTpl.defaultFields.titleHtml = g.titleHtml;
        if (g.subtitle !== undefined) exportTpl.defaultFields.subtitle = g.subtitle;
        if (g.speed !== undefined) exportTpl.defaultFields.speed = g.speed;
        if (g.squashing !== undefined) exportTpl.defaultFields.squashing = g.squashing;
        if (g.items !== undefined) exportTpl.defaultFields.items = JSON.parse(JSON.stringify(g.items));
        if (g.useCodeOverride !== undefined) exportTpl.defaultFields.useCodeOverride = g.useCodeOverride;
        if (g.wiper !== undefined) exportTpl.defaultFields.wiper = JSON.parse(JSON.stringify(g.wiper));

        if (g.style) exportTpl.defaultStyle = JSON.parse(JSON.stringify(g.style));
        if (g.animation) exportTpl.defaultAnimation = JSON.parse(JSON.stringify(g.animation));
        if (g.layout) exportTpl.defaultLayout = JSON.parse(JSON.stringify(g.layout));

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportTpl, null, 2));
        const el = document.createElement('a');
        el.setAttribute("href", dataStr);
        el.setAttribute("download", `szablon_${g.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`);
        document.body.appendChild(el);
        el.click();
        el.remove();
    };

    document.getElementById('btn-delete-graphic-ins').onclick = () => {
        if (!selectedGraphicId) return;
        const g = state.graphics.find(gfx => gfx.id === selectedGraphicId);
        if (!g) return;

        if (confirm(`Czy na pewno chcesz usunąć grafikę "${g.name}"?`)) {
            state.graphics = state.graphics.filter(gfx => gfx.id !== selectedGraphicId);
            const deletedId = selectedGraphicId;
            setSelectedGraphicId(null);
            closeInspector();

            if (previewGraphic?.id === deletedId) {
                setPreviewGraphic(null);
            }

            saveState();
            renderShotbox();
            updateProgramMonitor();
        }
    };

    document.getElementById('btn-new-template').onclick = () => {
        const newTpl = {
            id: crypto.randomUUID(),
            name: 'Nowy Szablon',
            type: 'LOWER_THIRD',
            html_template: '<div class="lt-container">\n  <h1>{{{TITLE}}}</h1>\n</div>',
            css_template: '#{{ID}} h1 { color: {{PRIMARY_COLOR}}; }',
            js_template: '(() => {\n  const root = document.getElementById("{{ID}}");\n  root.__slt_show = () => { root.style.opacity = 1; };\n  root.__slt_hide = () => { root.style.opacity = 0; };\n})();',
            defaultFields: { title: 'Sample Title', primaryColor: '#ffffff' },
            version: 1
        };
        state.templates.push(newTpl);
        saveState();
        renderTemplateList();
        openTemplateEditor(newTpl.id);
    };

    const btnImportTemplate = document.getElementById('btn-import-template');
    const tplFileInput = document.getElementById('tpl-file-input');

    btnImportTemplate.onclick = () => {
        tplFileInput.click();
    };

    tplFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = JSON.parse(evt.target.result);
                const tpls = Array.isArray(parsed) ? parsed : [parsed];
                tpls.forEach(t => {
                    if (!t.id) t.id = crypto.randomUUID();
                    const existing = state.templates.findIndex(x => x.id === t.id);
                    if (existing >= 0) state.templates[existing] = t;
                    else state.templates.push(t);
                });
                saveState();
                renderTemplateList();
                alert('Szablony zaimportowane pomyślnie!');
            } catch (err) {
                alert('Błąd parsowania JSON szablonu: ' + err.message);
            }
            tplFileInput.value = '';
        };
        reader.readAsText(file);
    });

    document.getElementById('btn-export-template').onclick = () => {
        if (!currentTemplateId) {
             alert('Wybierz najpierw szablon z listy!');
             return;
        }
        const tpl = state.templates.find(t => t.id === currentTemplateId);
        if (!tpl) return;

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tpl, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `szablon_${tpl.name.replace(/\s+/g, '_').toLowerCase()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    bind('btn-save-template', 'click', saveCurrentTemplate);

    bind('btn-delete-template', 'click', () => {
        if (!currentTemplateId) return;
        const tpl = state.templates.find(t => t.id === currentTemplateId);
        if (!tpl || !confirm(`Usunąć szablon "${tpl.name}"?`)) return;
        state.templates = state.templates.filter(t => t.id !== currentTemplateId);
        setCurrentTemplateId(null);
        saveState();
        renderTemplateList();
        document.getElementById('tpl-editor-main').classList.add('hidden');
        document.getElementById('tpl-editor-main').classList.remove('flex');
        document.getElementById('tpl-editor-empty').classList.remove('hidden');
    });

    document.querySelectorAll('.tpl-tab').forEach(tab => {
        tab.onclick = () => {
            _saveCurrentCodeEditorContent();
            setCurrentTemplateTab(tab.getAttribute('data-tab'));
            updateTemplateEditorTab();
        };
    });

    const overrideToggle = document.getElementById('tpl-graphic-override-toggle');
    if (overrideToggle) {
        overrideToggle.onchange = () => {
            const graphic = _getGraphicForCodeEditor();
            if (!graphic) return;
            const tpl = state.templates.find(t => t.id === graphic.templateId);
            graphic.useCodeOverride = overrideToggle.checked;
            if (overrideToggle.checked && !graphic.html_override && !graphic.css_override && !graphic.js_override) {
                graphic.html_override = tpl?.html_template || '';
                graphic.css_override = tpl?.css_template || '';
                graphic.js_override = tpl?.js_template || '';
            }
            window._draftGraphics[graphic.id] = structuredClone(graphic);
            if (previewGraphic?.id === graphic.id) {
                Object.assign(previewGraphic, graphic);
                refreshPreviewMonitor();
            }
            updateTemplateEditorTab();
        };
    }
    const btnExitGraphicCode = document.getElementById('btn-exit-graphic-code');
    if (btnExitGraphicCode) {
        btnExitGraphicCode.onclick = () => {
            _saveCurrentCodeEditorContent();
            setCodeEditorGraphicId(null);
            if (currentTemplateId) {
                openTemplateEditor(currentTemplateId);
            }
        };
    }

    const btnAddFieldRow = document.getElementById('btn-add-field-row');
    if (btnAddFieldRow) btnAddFieldRow.onclick = () => addFieldRow();

    function _onCodeEditorChange(editorValue) {
        if (currentTemplateTab === 'vars') return;

        const graphic = _getGraphicForCodeEditor();

        if (graphic) {
            if (!graphic.useCodeOverride) return;
            const fieldMap = { html: 'html_override', css: 'css_override', js: 'js_override' };
            const field = fieldMap[currentTemplateTab];
            if (!field) return;
            graphic[field] = editorValue;
            window._draftGraphics[graphic.id] = structuredClone(graphic);
            if (previewGraphic?.id === graphic.id) {
                previewGraphic[field] = editorValue;
                previewGraphic.useCodeOverride = true;
                refreshPreviewMonitor();
            }
        } else {
            if (!currentTemplateId) return;
            const tpl = state.templates.find(t => t.id === currentTemplateId);
            if (!tpl) return;
            const fieldMap = { html: 'html_template', css: 'css_template', js: 'js_template' };
            const field = fieldMap[currentTemplateTab];
            if (!field) return;
            tpl[field] = editorValue;
        }
        clearTimeout(window._tplSaveTimer);
        window._tplSaveTimer = setTimeout(() => saveState(), 800);
    }

    const _aceEd = _aceInit();
    if (_aceEd) {
        _aceEd.on('change', () => {
            if (_aceSuppressChange) return;
            _onCodeEditorChange(_aceEd.getValue());
        });
    }

    document.getElementById('tpl-name-input').oninput = (e) => {
        if (!currentTemplateId) return;
        const tpl = state.templates.find(t => t.id === currentTemplateId);
        if (tpl) tpl.name = e.target.value;
    };

    const closeInsBtn = document.getElementById('btn-close-inspector');
    if (closeInsBtn) {
        closeInsBtn.onclick = closeInspector;
    }

    const btnExportDb = document.getElementById('btn-export-db');
    const btnImportDbTrigger = document.getElementById('btn-import-db-trigger');
    const dbFileInput = document.getElementById('db-file-input');

    if (btnExportDb && btnImportDbTrigger && dbFileInput) {
        btnExportDb.onclick = () => {
            if (!confirm('Czy na pewno chcesz pobrać aktualny stan bazy danych (Szablony, Elementy Graficzne i Ustawienia)?')) return;
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `db_backup_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        };

        btnImportDbTrigger.onclick = () => dbFileInput.click();

        dbFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!confirm('UWAGA! Import bazy spowoduje nadpisanie WSZYSTKICH aktualnych grafik i szablonów. Czy na pewno chcesz kontynuować?')) {
                dbFileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.templates) && Array.isArray(parsed.graphics)) {
                        setState(parsed);
                        socket.emit('updateState', state);
                        init();
                        alert('Baza Danych została poprawnie zaimportowana!');
                    } else {
                        throw new Error('Nieprawidłowy plik Bazy Danych');
                    }
                } catch (err) {
                    alert('Błąd importowania bazy: ' + err.message);
                }
                dbFileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    // ===========================================================
    // KEYBOARD SHORTCUTS
    // ===========================================================
    document.addEventListener('keydown', (e) => {
        if (_hotkeyAssignActive) return;

        const tag = e.target.tagName;
        const isEditable = e.target.isContentEditable;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;

        if (e.target.closest && e.target.closest('.ace_editor')) return;

        const modals = document.querySelectorAll('.fixed:not(.hidden)');
        for (const m of modals) {
            if (m.id && m.id.startsWith('modal-') && !m.classList.contains('hidden')) return;
        }

        if (triggerGraphicHotkey(e)) return;

        const key = e.key;
        const ctrl = e.ctrlKey || e.metaKey;

        if (key === 'F1' || (key === ' ' && !ctrl)) {
            e.preventDefault();
            document.getElementById('btn-take-preview')?.click();
            return;
        }

        if (key === 'F2') {
            e.preventDefault();
            document.getElementById('btn-update-active')?.click();
            return;
        }

        if (key === 'Escape') {
            e.preventDefault();
            document.getElementById('btn-kill-all')?.click();
            return;
        }

        if (key === 'Delete' && !ctrl) {
            e.preventDefault();
            document.getElementById('btn-delete-graphic-ins')?.click();
            return;
        }

        if (key === 'ArrowUp' || key === 'ArrowDown') {
            e.preventDefault();
            const visibleCards = state.graphics;
            if (!visibleCards.length) return;
            const currentIdx = visibleCards.findIndex(g => g.id === selectedGraphicId);
            let nextIdx;
            if (key === 'ArrowUp') {
                nextIdx = currentIdx <= 0 ? visibleCards.length - 1 : currentIdx - 1;
            } else {
                nextIdx = currentIdx >= visibleCards.length - 1 ? 0 : currentIdx + 1;
            }
            const nextGraphic = visibleCards[nextIdx];
            if (nextGraphic) {
                setPreviewGraphic(structuredClone(nextGraphic));
                openInspector(nextGraphic.id);
            }
            return;
        }

        if (key === 'Tab' && !ctrl) {
            e.preventDefault();
            switchPage(currentPage === 'dashboard' ? 'templates' : 'dashboard');
            return;
        }

        if (key === 'b' || key === 'B') {
            e.preventDefault();
            changeBg(document.getElementById('hex-bg')?.value || '#000000');
            return;
        }

        if (key === 't' || key === 'T') {
            e.preventDefault();
            changeBg('transparent');
            return;
        }

        if (key === '?' || (key === '/' && e.shiftKey)) {
            e.preventDefault();
            _toggleShortcutsHelp();
            return;
        }
    });

    document.addEventListener('keyup', (e) => {
        _globalPressedKeys.delete(e.key);
    });

    function _toggleShortcutsHelp() {
        let overlay = document.getElementById('shortcuts-help-overlay');
        if (overlay) {
            overlay.remove();
            return;
        }
        overlay = document.createElement('div');
        overlay.id = 'shortcuts-help-overlay';
        overlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/70';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `
            <div class="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-white font-bold text-lg tracking-wide">Skróty Klawiszowe</h2>
                    <button onclick="document.getElementById('shortcuts-help-overlay').remove()" class="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
                </div>
                <div class="space-y-1 text-sm">
                    <div class="flex justify-between py-1.5 border-b border-gray-800">
                        <span class="text-gray-300">TAKE (Wejdź / Ściągnij)</span>
                        <span class="text-blue-400 font-mono font-bold">F1 / Space</span>
                    </div>
                    <div class="flex justify-between py-1.5 border-b border-gray-800">
                        <span class="text-gray-300">Synchronizuj (Update Active)</span>
                        <span class="text-blue-400 font-mono font-bold">F2</span>
                    </div>
                    <div class="flex justify-between py-1.5 border-b border-gray-800">
                        <span class="text-gray-300">Wyczyść Program (Kill All)</span>
                        <span class="text-blue-400 font-mono font-bold">Escape</span>
                    </div>
                    <div class="flex justify-between py-1.5 border-b border-gray-800">
                        <span class="text-gray-300">Usuń wybraną grafikę</span>
                        <span class="text-blue-400 font-mono font-bold">Delete</span>
                    </div>
                    <div class="flex justify-between py-1.5 border-b border-gray-800">
                        <span class="text-gray-300">Poprzednia / Następna grafika</span>
                        <span class="text-blue-400 font-mono font-bold">↑ / ↓</span>
                    </div>
                    <div class="flex justify-between py-1.5 border-b border-gray-800">
                        <span class="text-gray-300">Dashboard / Szablony</span>
                        <span class="text-blue-400 font-mono font-bold">Tab</span>
                    </div>
                    <div class="flex justify-between py-1.5 border-b border-gray-800">
                        <span class="text-gray-300">Ustaw tło (wybrany kolor)</span>
                        <span class="text-blue-400 font-mono font-bold">B</span>
                    </div>
                    <div class="flex justify-between py-1.5 border-b border-gray-800">
                        <span class="text-gray-300">Tło przezroczyste / OBS</span>
                        <span class="text-blue-400 font-mono font-bold">T</span>
                    </div>
                    <div class="flex justify-between py-1.5 border-b border-gray-800">
                        <span class="text-gray-300">Pokaż tę pomoc</span>
                        <span class="text-blue-400 font-mono font-bold">?</span>
                    </div>
                </div>
                ${state.graphics.some(g => g.hotkey) ? `
                <div class="mt-3 pt-3 border-t border-gray-700">
                    <p class="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">Skróty grafik</p>
                    <div class="space-y-1 text-sm">
                        ${state.graphics.filter(g => g.hotkey).map(g => `
                            <div class="flex justify-between py-1 border-b border-gray-800/50">
                                <span class="text-gray-300 truncate mr-2">${escAttr(g.name)}</span>
                                <span class="text-purple-400 font-mono font-bold shrink-0">${escAttr(g.hotkey.label)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                <p class="text-gray-600 text-xs mt-4 text-center">Skróty nie działają podczas edycji pól tekstowych</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}
