// ======================================================
// CG Control Pro — Main Application Logic
// Vanilla JS port of VinciFlow Studio
// ======================================================

const socket = io();
let state = { templates: [], graphics: [], groups: [], settings: {} };

const draftsProxyHandler = {
    set(target, prop, val) {
        target[prop] = val;
        try { localStorage.setItem('cg_drafts', JSON.stringify(target)); } catch(e){}
        return true;
    },
    deleteProperty(target, prop) {
        delete target[prop];
        try { localStorage.setItem('cg_drafts', JSON.stringify(target)); } catch(e){}
        return true;
    }
};
let initialDrafts = {};
try { initialDrafts = JSON.parse(localStorage.getItem('cg_drafts')) || {}; } catch(e){}
window._draftGraphics = new Proxy(initialDrafts, draftsProxyHandler);

const urlParams = new URLSearchParams(window.location.search);
const panelMode = urlParams.get('panel'); // 'bank' | 'inspector' | null
const uiChannel = new BroadcastChannel('cg_ui_sync');

let selectedGraphicId = null;   // graphic being inspected
let previewGraphic = null;      // copy of graphic in preview monitor

let currentPage = 'dashboard'; // 'dashboard' | 'templates'
let currentTemplateId = null;
let currentTemplateTab = 'html';
let inspectorAccordionStates = {}; // graphicId -> { accordionId -> isOpen }
let currentInspectorTab = 'main'; // Tracks active tab in inspector
const DB_KEY = 'cg_state_backup';

uiChannel.onmessage = (e) => {
    if (e.data.action === 'select_graphic') {
        const gfx = state.graphics.find(g => g.id === e.data.id);
        if (gfx) {
            setPreviewGraphic(JSON.parse(JSON.stringify(gfx)), true);
            openInspector(e.data.id);
        }
    } else if (e.data.action === 'preview_graphic_update') {
        previewGraphic = e.data.previewGraphic;
        refreshPreviewMonitor(true);
    }
};

// ===========================================================
// 1. BOOT
// ===========================================================
async function init() {
    socket.on('initialState', (serverState) => {
        state = serverState;
        renderShotbox();
        renderTemplateList();
        setupMonitorScaling();
        bindGlobalEvents();
        bindWysiwygModalEvents();
        bindTickerEditorEvents();
        document.getElementById('loading-overlay').classList.add('hidden');

        // ==== STANDALONE PANELS SETUP ====
        if (panelMode === 'bank') {
            document.querySelector('header').style.display = 'none';
            document.getElementById('preview-monitor-wrap').parentElement.style.display = 'none';
            const inspector = document.getElementById('inspector-panel');
            if (inspector) inspector.style.display = 'none';
        } else if (panelMode === 'inspector') {
            document.querySelector('header').style.display = 'none';
            document.getElementById('dashboard-left').style.display = 'none';
            const inspector = document.getElementById('inspector-panel');
            if (inspector) {
                inspector.classList.remove('hidden', 'w-72');
                inspector.classList.add('w-full');
            }
        }

        // --- NEW GLOBAL ACTIONS ---
        document.getElementById('btn-kill-all')?.addEventListener('click', () => {
            state.graphics.forEach(g => g.visible = false);
            saveState();
            renderShotbox();
            updateProgramMonitor();
        });

        document.getElementById('btn-bg-black')?.addEventListener('click', () => {
            socket.emit('set_background', 'black');
        });

        document.getElementById('btn-bg-trans')?.addEventListener('click', () => {
            socket.emit('set_background', 'transparent');
        });
        // -------------------------

        document.getElementById('btn-toggle-safe-area')?.addEventListener('click', (e) => {
            document.querySelectorAll('.ebu-safe-area').forEach(el => {
                el.classList.toggle('hidden');
            });
            e.currentTarget.classList.toggle('text-white');
            e.currentTarget.classList.toggle('bg-blue-600');
        });

        const btnImport = document.getElementById('btn-import-template');
        const tplFileInput = document.getElementById('tpl-file-input');
        if (btnImport) btnImport.onclick = () => tplFileInput.click();
        if (tplFileInput) tplFileInput.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) importTemplate(file);
        };

        // Bind OCG Import/Export
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
        state = newState;
        renderShotbox();
        renderTemplateList(); // Keep template list in sync
        if (selectedGraphicId) {
            if (!window._draftGraphics[selectedGraphicId]) {
                openInspector(selectedGraphicId);
            }
        }
    });
}
// 2. STATE
// ===========================================================
function saveState() {
    if (!state || !state.templates || state.templates.length === 0) {
        console.warn("[!] saveState blocked: State appears to be empty or uninitialized.");
        return;
    }
    socket.emit('updateState', state);
}

// --- Helper do wysyłania plików na serwer ---
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });
    if (!resp.ok) throw new Error('Upload failed');
    return await resp.json(); // { url: "/uploads/..." }
}

// ===========================================================
// 3. NAVIGATION
// ===========================================================
function switchPage(page) {
    currentPage = page;
    const dash = document.getElementById('page-dashboard');
    const tpls = document.getElementById('page-templates');
    const sets = document.getElementById('page-settings');
    const navD = document.getElementById('nav-dashboard');
    const navT = document.getElementById('nav-templates');
    const navS = document.getElementById('nav-settings');

    const activeClass = 'nav-tab px-3 py-1.5 rounded font-bold text-blue-400 bg-blue-600/10 border border-blue-600/20 text-xs';
    const inactiveClass = 'nav-tab px-3 py-1.5 rounded font-medium text-gray-400 hover:text-white transition-colors text-xs';

    if (page === 'dashboard') {
        dash.classList.remove('hidden');
        tpls.classList.add('hidden');
        if (sets) sets.classList.add('hidden');
        navD.className = activeClass;
        navT.className = inactiveClass;
        if (navS) navS.className = inactiveClass;
    } else if (page === 'templates') {
        dash.classList.add('hidden');
        tpls.classList.remove('hidden');
        if (sets) sets.classList.add('hidden');
        navD.className = inactiveClass;
        navT.className = activeClass;
        if (navS) navS.className = inactiveClass;
        renderTemplateList();
    } else if (page === 'settings') {
        dash.classList.add('hidden');
        tpls.classList.add('hidden');
        if (sets) sets.classList.remove('hidden');
        navD.className = inactiveClass;
        navT.className = inactiveClass;
        if (navS) navS.className = activeClass;
        renderSettings();
    }
}

function renderSettings() {
    const wInput = document.getElementById('setting-res-width');
    const hInput = document.getElementById('setting-res-height');
    if (!wInput || !hInput) return;

    wInput.value = state.settings?.resolution?.width || 1920;
    hInput.value = state.settings?.resolution?.height || 1080;

    // Font settings
    const fontDropdown = document.getElementById('setting-global-font-family');
    const fontGraphicsContainer = document.getElementById('setting-global-font-graphics');

    if (fontDropdown) {
        fontDropdown.value = state.settings?.globalFontFamily || 'Inter';
    }

    // Shadow settings
    const shadowEnabled = document.getElementById('setting-shadow-enabled');
    const shadowColor = document.getElementById('setting-shadow-color');
    const shadowColorHex = document.getElementById('setting-shadow-color-hex');
    const shadowBlur = document.getElementById('setting-shadow-blur');
    const shadowOffsetX = document.getElementById('setting-shadow-offset-x');
    const shadowOffsetY = document.getElementById('setting-shadow-offset-y');
    const shadowControls = document.getElementById('setting-shadow-controls');

    const globalShadow = state.settings?.globalShadow || { enabled: false, color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 0, offsetY: 2 };

    if (shadowEnabled) {
        shadowEnabled.checked = !!globalShadow.enabled;
        if (shadowControls) {
            shadowControls.className = shadowEnabled.checked ? 'space-y-3 transition-opacity block' : 'space-y-3 opacity-50 pointer-events-none transition-opacity';
        }
    }
    if (shadowColor) shadowColor.value = globalShadow.color;
    if (shadowColorHex) shadowColorHex.value = globalShadow.color;
    if (shadowBlur) shadowBlur.value = globalShadow.blur;
    if (shadowOffsetX) shadowOffsetX.value = globalShadow.offsetX;
    if (shadowOffsetY) shadowOffsetY.value = globalShadow.offsetY;

    if (fontGraphicsContainer) {
        fontGraphicsContainer.innerHTML = '';
        const globalGraphics = state.settings?.globalFontGraphics || [];

        if (state.graphics.length === 0) {
            fontGraphicsContainer.innerHTML = '<div class="text-[10px] text-gray-500 italic p-2">Brak grafik w Banku Grafik</div>';
        } else {
            state.graphics.forEach(g => {
                const isChecked = globalGraphics.includes(g.id);
                const label = document.createElement('label');
                label.className = 'flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded';
                label.innerHTML = `
                    <input type="checkbox" class="global-font-cb w-3 h-3 text-blue-500 rounded bg-gray-900 border-gray-700" value="${g.id}" ${isChecked ? 'checked' : ''}>
                    <span class="text-xs text-gray-300 font-medium">${g.name}</span>
                `;
                fontGraphicsContainer.appendChild(label);
            });
        }
    }

    const radiusInput = document.getElementById('setting-global-radius');
    const radiusGraphicsContainer = document.getElementById('setting-global-radius-graphics');

    if (radiusInput) {
        radiusInput.value = state.settings?.globalBorderRadius || 0;
    }

    if (radiusGraphicsContainer) {
        radiusGraphicsContainer.innerHTML = '';
        const globalRadiusGraphics = state.settings?.globalRadiusGraphics || [];

        if (state.graphics.length === 0) {
            radiusGraphicsContainer.innerHTML = '<div class="text-[10px] text-gray-500 italic p-2">Brak grafik w Banku Grafik</div>';
        } else {
            state.graphics.forEach(g => {
                const isChecked = globalRadiusGraphics.includes(g.id);
                const label = document.createElement('label');
                label.className = 'flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded';
                label.innerHTML = `
                    <input type="checkbox" class="global-radius-cb w-3 h-3 text-blue-500 rounded bg-gray-900 border-gray-700" value="${g.id}" ${isChecked ? 'checked' : ''}>
                    <span class="text-xs text-gray-300 font-medium">${g.name}</span>
                `;
                radiusGraphicsContainer.appendChild(label);
            });
        }
    }
}

// module-level ref so refreshPreviewMonitor can force a rescale
let _previewDoScale = null;

function setupMonitorScaling() {
    const outer = document.getElementById('preview-canvas-outer');
    const canvasWrap = document.getElementById('preview-canvas-wrap');
    if (!outer || !canvasWrap) return;

    _previewDoScale = () => {
        // Now that preview-canvas-outer is relative and inside a flex container,
        // its size represents the ACTUAL available space for the video.
        const ow = outer.clientWidth;
        const oh = outer.clientHeight;
        if (!ow || !oh) return;

        const scale = Math.min(ow / 1920, oh / 1080);
        const scaledW = 1920 * scale;
        const scaledH = 1080 * scale;
        const offX = (ow - scaledW) / 2;
        const offY = (oh - scaledH) / 2;

        canvasWrap.style.transform = `translate(${offX}px, ${offY}px) scale(${scale})`;
    };

    const ro = new ResizeObserver(_previewDoScale);
    ro.observe(outer);
    setTimeout(_previewDoScale, 100);
}

// ===========================================================
// 5. SHOTBOX (with copy & groups)
// ===========================================================

// Ensure groups array exists
function ensureGroups() {
    if (!state.groups) state.groups = [];
}

// --- Copy Graphic ---
function copyGraphic(graphicId) {
    const src = state.graphics.find(g => g.id === graphicId);
    if (!src) return;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = crypto.randomUUID();
    copy.name = (src.name || 'Grafika') + ' (kopia)';
    copy.visible = false;
    // Insert right after source
    const idx = state.graphics.indexOf(src);
    state.graphics.splice(idx + 1, 0, copy);
    saveState();
    renderShotbox();
    openInspector(copy.id);
}

// --- Group helpers ---
const GROUP_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

function createGroup(name) {
    ensureGroups();
    const grp = {
        id: crypto.randomUUID(),
        name: name || `Grupa ${state.groups.length + 1}`,
        color: GROUP_COLORS[state.groups.length % GROUP_COLORS.length]
    };
    state.groups.push(grp);
    saveState();
    return grp;
}

function assignToGroup(graphicId, groupId) {
    const g = state.graphics.find(g => g.id === graphicId);
    if (!g) return;
    g.groupId = groupId || null;
    saveState();
    renderShotbox();
}

function groupTakeAll(groupId, newVisible) {
    state.graphics.filter(g => g.groupId === groupId).forEach(g => {
        g.visible = newVisible;
    });
    saveState();
    renderShotbox();
    updateProgramMonitor();
}

function getGroupForGraphic(graphic) {
    ensureGroups();
    if (!graphic.groupId) return null;
    return state.groups.find(g => g.id === graphic.groupId) || null;
}

// Global toggle state
if (typeof window._groupCollapseState === 'undefined') window._groupCollapseState = {};

// --- Render Shotbox ---
function renderShotbox() {
    ensureGroups();
    const grid = document.getElementById('shotbox-grid');
    grid.innerHTML = '';

    const groupedItemsMap = {};
    const ungroupedItems = [];

    state.graphics.forEach(g => {
        if (g.groupId) {
            if (!groupedItemsMap[g.groupId]) groupedItemsMap[g.groupId] = [];
            groupedItemsMap[g.groupId].push(g);
        } else {
            ungroupedItems.push(g);
        }
    });

    const createCardElement = (graphic) => {
        const tpl = state.templates.find(t => t.id === graphic.templateId);
        const isActive = graphic.visible;
        const isPreview = previewGraphic?.id === graphic.id;
        const grp = getGroupForGraphic(graphic);

        const card = document.createElement('div');
        card.className = `shotbox-card cursor-pointer rounded border p-2 relative group flex flex-col gap-2 transition-all duration-200
            ${isActive ? 'border-red-600 bg-red-900/20 shadow-[0_0_15px_rgba(229,57,53,0.3)] ring-1 ring-red-500' :
                isPreview ? 'border-yellow-500 bg-yellow-900/10 shadow-[0_0_10px_rgba(251,192,45,0.2)]' :
                    'border-gray-800 bg-[#111] hover:border-gray-600'}`;

        if (grp) {
            card.style.borderTopWidth = '3px';
            card.style.borderTopColor = grp.color;
        }

        const actionBtns = `
            <div class="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button data-copy-id="${graphic.id}" title="Kopiuj" class="w-5 h-5 rounded flex items-center justify-center bg-gray-800 hover:bg-blue-900/60 text-gray-500 hover:text-blue-400 text-[10px] leading-none">📋</button>
                <button data-delete-id="${graphic.id}" title="Usuń" class="w-5 h-5 rounded flex items-center justify-center bg-gray-800 hover:bg-red-900/60 text-gray-500 hover:text-red-400 text-xs leading-none">&times;</button>
            </div>`;

        const groupOptions = state.groups.map(g =>
            `<option value="${g.id}" ${graphic.groupId === g.id ? 'selected' : ''}>${g.name}</option>`
        ).join('');

        let primaryText = graphic.name;
        if (tpl && tpl.ocgInputs?.length > 0) {
            const titleInput = tpl.ocgInputs.find(i => i.id === 'TITLE') || tpl.ocgInputs.find(i => i.id === 'WIPER_TEXT') || tpl.ocgInputs[0];
            const val = graphic.fields?.[titleInput.id];
            if (val) primaryText = String(val).replace(/<[^>]+>/g, '');
        } else if (graphic.title && graphic.type !== 'TICKER') {
            primaryText = graphic.title.replace(/<[^>]+>/g, '');
        }

        card.innerHTML = `
            ${actionBtns}
            <div class="flex justify-between items-start mb-1">
                <div class="flex flex-col min-w-0">
                    <span class="text-[10px] font-black text-white truncate uppercase tracking-tight" title="${escAttr(graphic.name)}">${escAttr(primaryText || graphic.name)}</span>
                    <span class="text-[8px] text-gray-500 font-mono truncate uppercase">${tpl ? tpl.type : 'NONE'} // ${escAttr(graphic.name)}</span>
                </div>
                ${isActive ? `<div class="flex items-center gap-1 bg-red-600 px-1 rounded shadow-[0_0_8px_rgba(229,57,53,0.5)]"><span class="text-[8px] font-black text-white italic">LIVE</span></div>` : ''}
            </div>

            <div class="flex gap-1 mt-auto">
                <button data-take-id="${graphic.id}" class="flex-[2] text-[10px] py-1.5 rounded font-black uppercase transition-all shadow-md
                    ${isActive ? 'bg-red-600 text-white border-t border-red-400 animate-pulse' : 'bg-[#2a2a2a] text-gray-400 hover:bg-red-700 hover:text-white border-t border-gray-700'}">
                    TAKE
                </button>
                <button data-preview-id="${graphic.id}" class="flex-1 text-[10px] py-1.5 rounded font-black uppercase transition-all border-t
                    ${isPreview ? 'bg-blue-600 text-white border-blue-400' : 'bg-[#1a1a1a] text-gray-500 hover:bg-blue-800 hover:text-white border-gray-800'}">
                    PREV
                </button>
                ${isActive ? `
                <button data-off-id="${graphic.id}" class="flex-1 text-[10px] py-1.5 rounded font-black uppercase bg-black text-red-500 border border-red-900/50 hover:bg-red-900 hover:text-white transition-all">
                    OFF
                </button>` : ''}
                <button onclick="window._openGraphicInspector('${graphic.id}')" title="Ustawienia grafiki" class="w-7 shrink-0 flex items-center justify-center py-1.5 rounded bg-[#1a1a2a] hover:bg-blue-900/60 text-gray-500 hover:text-blue-300 border border-gray-800 hover:border-blue-700 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
            </div>

            <div class="flex gap-1 mt-1">
                 ${graphic.type === 'TICKER' ? `
                    <button onclick="openTickerEditor('${graphic.id}')" class="flex-1 bg-orange-950/30 hover:bg-orange-900/50 text-[8px] font-black text-orange-500 py-1 rounded border border-orange-900/40 uppercase tracking-tighter transition-all">Szybka Edycja</button>
                 ` : `
                    <button onclick="openWysiwygModal('${graphic.id}')" class="flex-1 bg-gray-800 hover:bg-gray-700 text-[8px] font-bold text-gray-400 py-1 rounded border border-gray-700 uppercase tracking-tighter">Edytuj Treść</button>
                 `}
                 <select data-group-assign="${graphic.id}" class="flex-[1.5] bg-black border border-gray-800 rounded text-[8px] text-gray-500 py-1 px-1 focus:outline-none focus:border-blue-500" title="Grupa">
                    <option value="">— NO GROUP —</option>
                    ${groupOptions}
                    <option value="__new__">＋ NEW GROUP…</option>
                </select>
            </div>
            ${window._draftGraphics[graphic.id] ? `
            <div class="flex gap-1 mt-1 p-1 bg-yellow-900/40 border border-yellow-700/50 rounded animate-pulse">
                <button onclick="window.syncDraftGraphic('${graphic.id}')" class="flex-[2] bg-green-700 hover:bg-green-600 text-white text-[9px] font-black uppercase py-1 rounded shadow-md border-t border-green-500">
                    SYNC NA ANTENĘ
                </button>
                <button onclick="window.revertDraftGraphic('${graphic.id}')" class="flex-[1] bg-red-900/80 hover:bg-red-700 text-red-200 text-[8px] font-bold uppercase py-1 rounded border-t border-red-800">
                    ODRZUĆ
                </button>
            </div>
            ` : ''}
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('select')) return;
            const gfx = window._draftGraphics[graphic.id] || state.graphics.find(g => g.id === graphic.id);
            if (gfx) {
                setPreviewGraphic(JSON.parse(JSON.stringify(gfx)));
                if (panelMode !== 'inspector') {
                    uiChannel.postMessage({ action: 'select_graphic', id: graphic.id });
                }
            }
        });

        return card;
    };

    state.groups.forEach(grp => {
        const groupGraphics = groupedItemsMap[grp.id] || [];
        if (groupGraphics.length === 0) return;

        const anyOn = groupGraphics.some(g => g.visible);
        const isCollapsed = window._groupCollapseState[grp.id];

        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'col-span-3 bg-[#111] border border-gray-800 rounded-lg flex flex-col transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.5)]';
        groupWrapper.style.borderLeft = `4px solid ${grp.color || '#555'}`;
        groupWrapper.setAttribute('data-group-container-id', grp.id);

        const header = document.createElement('div');
        header.className = 'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800/80 transition-colors shrink-0';
        header.style.background = grp.color + '18';
        
        const chevronRot = isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        const chevronIcon = `<svg style="transform:${chevronRot}; transition: transform 0.2s" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

        header.innerHTML = `
            <div class="flex items-center gap-2 flex-1 min-w-0" data-group-toggle="${grp.id}">
                ${chevronIcon}
                <span class="text-[11px] font-black uppercase tracking-wider truncate" style="color:${grp.color || '#aaa'}">${grp.name || 'Grupa'}</span>
                <span class="text-[9px] text-gray-500 font-mono tracking-tighter bg-black/40 px-1.5 py-0.5 rounded border border-gray-800/50 shadow-inner">${groupGraphics.length} EL.</span>
            </div>
            <button data-group-take="${grp.id}" class="text-[9px] px-3 py-1 rounded font-bold uppercase transition-all shadow-md shrink-0
                ${anyOn ? 'bg-red-600 text-white border-t border-red-400 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.4)]' : 'bg-[#2a2a2a] text-gray-400 hover:bg-red-700 hover:text-white border-t border-gray-700'}">
                ${anyOn ? 'WSZYSTKIE OFF' : 'WSZYSTKIE ON'}
            </button>
        `;

        header.querySelector('[data-group-toggle]').addEventListener('click', (e) => {
            window._groupCollapseState[grp.id] = !window._groupCollapseState[grp.id];
            renderShotbox();
        });

        groupWrapper.appendChild(header);

        const innerGrid = document.createElement('div');
        innerGrid.className = 'group-inner-grid grid grid-cols-3 gap-2 p-2 pt-2 transition-all duration-300 min-h-[10px]';
        if (isCollapsed) {
            innerGrid.style.display = 'none';
        }

        groupGraphics.forEach(graphic => {
            innerGrid.appendChild(createCardElement(graphic));
        });

        groupWrapper.appendChild(innerGrid);
        grid.appendChild(groupWrapper);
    });

    ungroupedItems.forEach(graphic => {
        grid.appendChild(createCardElement(graphic));
    });

    // ---- Bind all shotbox events ----

    grid.querySelectorAll('[data-preview-id]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const g = state.graphics.find(g => g.id === btn.getAttribute('data-preview-id'));
            if (g) setPreviewGraphic(JSON.parse(JSON.stringify(g)));
        });
    });

    grid.querySelectorAll('[data-take-id]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.getAttribute('data-take-id');
            const g = state.graphics.find(g => g.id === id);
            if (g) {
                g.visible = !g.visible;
                saveState();
                renderShotbox();
                updateProgramMonitor();
                if (previewGraphic?.id === id) {
                    previewGraphic.visible = g.visible;
                    refreshPreviewControls();
                }
                if (selectedGraphicId === id) {
                    openInspector(id);
                }
            }
        });
    });

    grid.querySelectorAll('[data-off-id]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.getAttribute('data-off-id');
            const g = state.graphics.find(gx => gx.id === id);
            if (g && g.visible) {
                g.visible = false;
                saveState();
                renderShotbox();
                updateProgramMonitor();
                if (previewGraphic?.id === id) {
                    previewGraphic.visible = false;
                    refreshPreviewControls();
                }
                if (selectedGraphicId === id) {
                    openInspector(id);
                }
            }
        });
    });

    grid.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-delete-id');
            const g = state.graphics.find(gx => gx.id === id);
            const name = g ? g.name : 'tę grafikę';
            if (confirm(`Czy na pewno chcesz usunąć grafikę "${name}"?`)) {
                state.graphics = state.graphics.filter(g => g.id !== id);
                if (selectedGraphicId === id) {
                    selectedGraphicId = null;
                    closeInspector();
                }
                if (previewGraphic?.id === id) {
                    setPreviewGraphic(null);
                }
                saveState();
                renderShotbox();
                updateProgramMonitor();
            }
        };
    });

    grid.querySelectorAll('[data-copy-id]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            copyGraphic(btn.getAttribute('data-copy-id'));
        });
    });

    grid.querySelectorAll('[data-group-take]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const gid = btn.getAttribute('data-group-take');
            const anyOn = state.graphics.filter(g => g.groupId === gid).some(g => g.visible);
            groupTakeAll(gid, !anyOn);
        });
    });

    grid.querySelectorAll('[data-group-assign]').forEach(sel => {
        sel.addEventListener('change', e => {
            e.stopPropagation();
            const gfxId = sel.getAttribute('data-group-assign');
            const val = sel.value;
            if (val === '__new__') {
                const name = prompt('Nazwa nowej grupy:');
                if (!name) { renderShotbox(); return; }
                const grp = createGroup(name);
                assignToGroup(gfxId, grp.id);
            } else {
                assignToGroup(gfxId, val || null);
            }
        });
    });

    if (window.Sortable) {
        if (window._shotboxSortables) {
            window._shotboxSortables.forEach(instance => instance.destroy());
        }
        window._shotboxSortables = [];

        const handleSortEnd = () => {
             const cardNodes = Array.from(grid.querySelectorAll('.shotbox-card'));
             const newOrderIds = [];

             cardNodes.forEach(card => {
                  const delBtn = card.querySelector('[data-delete-id]');
                  const id = delBtn ? delBtn.getAttribute('data-delete-id') : null;
                  if (id) {
                      newOrderIds.push(id);
                      const gfx = state.graphics.find(g => g.id === id);
                      if (gfx) {
                          const wrapper = card.closest('[data-group-container-id]');
                          gfx.groupId = wrapper ? wrapper.getAttribute('data-group-container-id') : null;
                      }
                  }
             });

             const missedGraphics = state.graphics.filter(g => !newOrderIds.includes(g.id));
             const orderedGraphics = [];
             newOrderIds.forEach(id => {
                 const item = state.graphics.find(g => g.id === id);
                 if (item) orderedGraphics.push(item);
             });

             state.graphics = [...orderedGraphics, ...missedGraphics];
             saveState();
             renderShotbox();
        };

        window._shotboxSortables.push(Sortable.create(grid, {
             animation: 150,
             ghostClass: 'opacity-50',
             group: 'shotbox-drag',
             onEnd: handleSortEnd
        }));

        grid.querySelectorAll('.group-inner-grid').forEach(inner => {
             window._shotboxSortables.push(Sortable.create(inner, {
                 animation: 150,
                 ghostClass: 'opacity-50',
                 group: 'shotbox-drag',
                 onEnd: handleSortEnd
             }));
        });
    }

    updateProgramMonitor();
}

// ===========================================================
// 6. PREVIEW MONITOR
// ===========================================================
function setPreviewGraphic(graphic, skipBroadcast = false) {
    previewGraphic = graphic;
    refreshPreviewMonitor(skipBroadcast);
    refreshPreviewControls();
    renderShotbox();
}

function refreshPreviewMonitor(skipBroadcast = false) {
    if (!skipBroadcast && typeof uiChannel !== 'undefined') {
        uiChannel.postMessage({ action: 'preview_graphic_update', previewGraphic });
    }
    const canvas = document.getElementById('preview-canvas');
    const empty = document.getElementById('preview-empty');
    const label = document.getElementById('preview-next-label');
    const nameLabel = document.getElementById('preview-name');

    if (!previewGraphic) {
        if (canvas) canvas.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
        if (label) label.textContent = '---';
        if (nameLabel) nameLabel.textContent = '---';
        return;
    }

    if (empty) empty.classList.add('hidden');
    if (label) label.textContent = previewGraphic.name;
    if (nameLabel) nameLabel.textContent = previewGraphic.name;

    const tpl = state.templates.find(t => t.id === previewGraphic.templateId);
    if (!tpl) {
        if (canvas) canvas.innerHTML = `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#666;font-family:monospace">Szablon nie znaleziony</div>`;
        return;
    }

    if (window.__cgRenderer && canvas) {
        window.__cgRenderer.renderPreview(canvas, [{ ...previewGraphic, visible: true }], state.templates, state.settings);
        // Force rescale after render so the canvas wrap is correctly sized/positioned
        if (_previewDoScale) requestAnimationFrame(_previewDoScale);
    } else if (canvas) {
        canvas.innerHTML = `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#555;font-family:monospace;font-size:12px">Renderer niedostępny</div>`;
    }

}

window.syncDraftGraphic = function(id) {
    const draft = window._draftGraphics[id];
    if (draft) {
        const idx = state.graphics.findIndex(g => g.id === id);
        if (idx !== -1) {
            const isVisible = state.graphics[idx].visible;
            state.graphics[idx] = JSON.parse(JSON.stringify(draft));
            state.graphics[idx].visible = isVisible;
            delete window._draftGraphics[id];
            saveState();
            renderShotbox();
            if (selectedGraphicId === id) refreshPreviewControls();
        }
    }
};

window.revertDraftGraphic = function(id) {
    if (window._draftGraphics[id]) {
        delete window._draftGraphics[id];
        renderShotbox();
        if (selectedGraphicId === id) {
            openInspector(id);
        }
    }
};

window._openGraphicInspector = function(id) {
    const g = window._draftGraphics[id] || state.graphics.find(x => x.id === id);
    if (!g) return;
    if (panelMode === 'bank') {
        // Standalone bank mode — open/focus a dedicated inspector window, then tell it to select the graphic
        window.open('/?panel=inspector', 'cg_inspector', 'width=380,height=900');
        setTimeout(() => {
            uiChannel.postMessage({ action: 'select_graphic', id });
        }, 900);
    } else {
        setPreviewGraphic(JSON.parse(JSON.stringify(g)));
        openInspector(id);
    }
};

function refreshPreviewControls() {
    const hasPreview = !!previewGraphic;
    document.getElementById('btn-edit-preview').disabled = !hasPreview;
    document.getElementById('btn-update-active').disabled = !hasPreview;
    document.getElementById('btn-take-preview').disabled = !hasPreview;

    if (hasPreview) {
        const takeBtn = document.getElementById('btn-take-preview');
        if (previewGraphic.visible) {
            takeBtn.textContent = 'ŚCIĄGNIJ (TAKE OFF)';
            takeBtn.className = 'px-4 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold uppercase shadow-lg shadow-red-900/30 transition-all active:scale-95';
        } else {
            takeBtn.textContent = 'WEJDŹ (TAKE)';
            takeBtn.className = 'px-4 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] font-bold uppercase shadow-lg shadow-green-900/30 transition-all active:scale-95';
        }
    }
}

// ===========================================================
// 7. PROGRAM MONITOR — Label updates only, iframe renders
// ===========================================================
function updateProgramMonitor() {
    const layersLabel = document.getElementById('program-layers-label');
    const layersCount = document.getElementById('program-layers-count');
    const onAirLabel = document.getElementById('on-air-label');
    const programEmpty = document.getElementById('program-empty');

    const activeGraphics = state.graphics.filter(g => g.visible);
    const n = activeGraphics.length;

    if (n === 0) {
        layersLabel?.classList.add('hidden');
        onAirLabel.textContent = 'NA ŻYWO: 0 WARSTW';
        programEmpty?.classList.remove('hidden');
    } else {
        layersLabel?.classList.remove('hidden');
        if (layersCount) layersCount.textContent = n;
        onAirLabel.textContent = `NA ŻYWO: ${n} AKTYWNE`;
        programEmpty?.classList.add('hidden');
    }
}

// ===========================================================
// 8. INSPECTOR PANEL
// ===========================================================
function closeInspector() {
    document.getElementById('inspector-panel').classList.add('hidden');
    document.getElementById('inspector-empty').classList.remove('hidden');
    document.getElementById('inspector-content').classList.add('hidden');
    document.getElementById('inspector-content').classList.remove('flex');
    selectedGraphicId = null;
}

function openInspector(id) {
    selectedGraphicId = id;
    const graphicRaw = window._draftGraphics[id] || state.graphics.find(g => g.id === id);
    if (!graphicRaw) return;

    // Fallback: if graphic doesn't have an explicit type, get it from the template
    const graphic = JSON.parse(JSON.stringify(graphicRaw));
    if (!graphic.type) {
        const tpl = state.templates.find(t => t.id === graphic.templateId);
        if (tpl) graphic.type = tpl.type;
    }

    // AUTO-PREVIEW: always show/refresh the selected graphic in PREVIEW monitor during editing
    previewGraphic = JSON.parse(JSON.stringify(graphic));
    refreshPreviewMonitor();
    refreshPreviewControls();

    document.getElementById('inspector-panel').classList.remove('hidden');
    document.getElementById('inspector-empty').classList.add('hidden');
    document.getElementById('inspector-content').classList.remove('hidden');
    document.getElementById('inspector-content').classList.add('flex');

    const typeSelect = document.getElementById('inspector-type-select');

    if (!inspectorAccordionStates[id]) {
        inspectorAccordionStates[id] = { content: true, tickerSettings: true, appearance: false, layout: false, animation: false };
    }

    renderInspectorBody(graphic);

    // Sync tab button styles
    const tabMain = document.getElementById('ins-tab-main');
    const tabAnim = document.getElementById('ins-tab-anim');
    if (tabMain && tabAnim) {
        if (currentInspectorTab === 'main') {
            tabMain.className = "flex-1 py-2 text-[10px] font-bold text-blue-400 border-b-2 border-blue-500 bg-gray-800/50 transition-colors";
            tabAnim.className = "flex-1 py-2 text-[10px] font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-300 transition-colors";
        } else {
            tabAnim.className = "flex-1 py-2 text-[10px] font-bold text-blue-400 border-b-2 border-blue-500 bg-gray-800/50 transition-colors";
            tabMain.className = "flex-1 py-2 text-[10px] font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-300 transition-colors";
        }
    }
}

function renderInspectorBody(graphic) {
    const body = document.getElementById('inspector-body');
    const tpl = state.templates.find(t => t.id === graphic.templateId);



    body.innerHTML = `
        <div id="ins-tab-content-main" class="${currentInspectorTab === 'main' ? '' : 'hidden '}flex-1 flex flex-col shrink-0">
            <div class="accordion border-b border-gray-800">
                <button class="accordion-toggle w-full flex items-center justify-between p-3 text-[10px] font-bold text-gray-400 bg-gray-900 hover:bg-gray-800 transition-colors" data-accordion="content">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                        ZAWARTOŚĆ
                    </span>
                    <span class="accordion-arrow">${inspectorAccordionStates[graphic.id]?.content ? '−' : '+'}</span>
                </button>
                <div class="accordion-content ${inspectorAccordionStates[graphic.id]?.content ? 'open' : ''} bg-gray-850/50 p-3 space-y-3">
                    <div>
                        ${ctrlLabel('Nazwa')}
                        <input type="text" data-field="name" value="${escAttr(graphic.name)}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                    </div>

                    ${tpl && (tpl.ocgInputs || []).length > 0 ? `
                    <!-- OCG Variables Panel in ZAWARTOŚĆ -->
                    <div class="border-t border-gray-800 pt-3 mt-1">
                        <div class="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                            POLA SZABLONU
                        </div>
                        ${(tpl.ocgInputs || []).map(inp => {
                            const val = graphic.fields?.[inp.id] ?? (graphic[inp.id.toLowerCase()] ?? inp.default ?? '');
                            if (inp.type === 'richtext') {
                                return `
                                <div class="mb-3">
                                    ${ctrlLabel(inp.label)}
                                    <div class="relative">
                                        <textarea
                                            data-field="fields.${inp.id}"
                                            rows="3"
                                            placeholder="${escAttr(inp.label)}"
                                            class="w-full bg-gray-800 border border-gray-700 rounded p-2 pr-8 text-xs text-white leading-relaxed focus:border-blue-500 focus:outline-none font-mono resize-none"
                                        >${escAttr(String(val))}</textarea>
                                        <button data-ocg-wysiwyg="${inp.id}"
                                            title="Edytuj w edytorze WYSIWYG"
                                            style="position:absolute;top:5px;right:5px;width:22px;height:22px;background:#1e3a5f;border:1px solid #3b82f6;border-radius:4px;color:#60a5fa;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">&#9999;</button>
                                    </div>
                                </div>`;
                            } else {
                                return `
                                <div class="mb-3">
                                    ${ctrlLabel(inp.label)}
                                    <input type="text"
                                        data-field="fields.${inp.id}"
                                        value="${escAttr(String(val))}"
                                        placeholder="${escAttr(inp.label)}"
                                        class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                                </div>`;
                            }
                        }).join('')}
                    </div>
                    ` : `
                    ${graphic.type === 'LOWER_THIRD' ? `
                        <div>
                            ${ctrlLabel('Tytuł')}
                            <div style="background:#111827;border:1px solid #374151;border-radius:6px;padding:10px 12px;min-height:44px;cursor:pointer;position:relative;" id="title-preview-box">
                                <div style="color:#fff;font-size:13px;line-height:1.4;max-height:80px;overflow:hidden;" id="title-preview-content">${graphic.titleHtml || graphic.title || '<span style="color:#6b7280;font-style:italic;">Kliknij aby edytować…</span>'}</div>
                                <button id="btn-open-wysiwyg" title="Edytuj tekst" style="position:absolute;top:6px;right:6px;width:26px;height:26px;background:#1e3a5f;border:1px solid #3b82f6;border-radius:4px;color:#60a5fa;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;">&#9999;</button>
                            </div>
                        </div>

                        <div class="mt-3">
                            ${ctrlLabel('Podtytuł / Gość (Tylko belki dwupoziomowe)')}
                            <input type="text" data-field="subtitle" value="${escAttr(graphic.subtitle || '')}" placeholder="Podtytuł, stanowisko..." class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                        </div>

                        ${['republika-composite', 'republika-lower-third', 'belka-exp-graphic', '528dc35a-546a-4e7f-8da7-a0c365f81680'].includes(graphic.templateId) ? `
                        <div class="border-t border-gray-800 pt-3 mt-1">
                            <div class="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Grafika boczna</div>
                            <div>
                                ${ctrlLabel('URL obrazka')}
                                <input type="text" data-field="sideImage" value="${escAttr(graphic.sideImage || '')}" placeholder="https://... lub puste = brak" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                            </div>
                            <div class="mt-2">
                                ${ctrlLabel('Wgraj z pliku')}
                                <input type="file" id="side-image-upload" accept="image/*" class="w-full text-[10px] text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30">
                            </div>
                            ${graphic.sideImage ? `
                            <div class="mt-2 relative">
                                <img src="${graphic.sideImage}" class="w-full rounded border border-gray-700 object-cover" style="max-height:60px">
                                <button id="btn-remove-side-image" class="absolute top-1 right-1 w-5 h-5 bg-red-900/80 hover:bg-red-700 text-white rounded flex items-center justify-center text-xs">&times;</button>
                            </div>` : ''}
                        </div>
                        ` : ''}
                    ` : ''}
                    `}

                    ${graphic.type === 'TICKER' ? `
                        <div class="mb-4">
                            ${ctrlLabel('Tekst etykiety (Etykieta boczna)')}
                            <input type="text" data-field="introText" value="${escAttr(graphic.introText || '')}" placeholder="np. PILNE lub TYLKO U NAS" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                        </div>

                        <div class="mb-4">
                            <button onclick="openTickerEditor('${graphic.id}')" class="w-full bg-orange-950/40 hover:bg-orange-900/60 text-orange-500 py-3 rounded border border-orange-900/50 uppercase tracking-wider font-bold transition-all shadow-lg shadow-orange-900/20 text-xs flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                OTWÓRZ SZYBKĄ EDYCJĘ WIADOMOŚCI
                            </button>
                        </div>
                    ` : ''}

                    ${graphic.type === 'IMAGE' ? `
                        <div>
                            ${ctrlLabel('URL Obrazka')}
                            <input type="text" data-field="url" value="${escAttr(graphic.url)}" placeholder="https://..." class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                        </div>
                        <div>
                            ${ctrlLabel('Wgraj z pliku')}
                            <input type="file" id="image-upload" accept="image/*" class="w-full text-[10px] text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30">
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-2">
                            <div>${ctrlLabel('Szerokość')}<input type="number" data-field="layout.width" value="${graphic.layout?.width || ''}" placeholder="150" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                            <div>${ctrlLabel('Wysokość')}<input type="number" data-field="layout.height" value="${graphic.layout?.height || ''}" placeholder="80" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                        </div>
                        ${graphic.url ? `<img src="${graphic.url}" class="w-full rounded border border-gray-700 object-contain" style="max-height:100px">` : ''}
                    ` : ''}
                </div>
            </div>

            ${graphic.type === 'TICKER' ? `
            <div class="accordion border-b border-gray-800">
                <button class="accordion-toggle w-full flex items-center justify-between p-3 text-[10px] font-bold text-gray-400 bg-gray-900 hover:bg-gray-800 transition-colors" data-accordion="tickerSettings">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 18 6-6 6 6"/><path d="m5 6 6 6 6-6"/></svg>
                        TICKER USTAWIENIA
                    </span>
                    <span class="accordion-arrow">${inspectorAccordionStates[graphic.id]?.tickerSettings ? '−' : '+'}</span>
                </button>
                <div class="accordion-content ${inspectorAccordionStates[graphic.id]?.tickerSettings ? 'open' : ''} bg-gray-850/50 p-3 space-y-3">
                    ${tpl?.features?.ticker_mode ? `
                    <div>
                        ${ctrlLabel('Tryb Tickera')}
                        <select data-field="tickerMode" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white appearance-none">
                            <option value="whip" ${(graphic.tickerMode || 'whip') === 'whip' ? 'selected' : ''}>Whip (Z wycieraczką)</option>
                            <option value="horizontal" ${graphic.tickerMode === 'horizontal' ? 'selected' : ''}>Poziomy (Przewijany)</option>
                            <option value="vertical" ${graphic.tickerMode === 'vertical' ? 'selected' : ''}>Pionowy</option>
                        </select>
                    </div>
                    ` : ''}
                    <div>
                        ${ctrlLabel((graphic.tickerMode === 'vertical' || tpl?.features?.vertical) ? 'Czas wyświetlania jednej wiadomości (s)' : 'Prędkość paska (px/s)')}
                        <input type="number" data-field="speed" value="${graphic.speed || ((graphic.tickerMode === 'vertical' || tpl?.features?.vertical) ? 5 : 100)}" min="${(graphic.tickerMode === 'vertical' || tpl?.features?.vertical) ? 1 : 10}" step="${(graphic.tickerMode === 'vertical' || tpl?.features?.vertical) ? 0.5 : 10}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                    </div>

                    ${tpl?.features?.separator ? `
                        <div>
                            ${ctrlLabel('Styl separatora')}
                            <select data-field="separatorStyle" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white appearance-none">
                                <option value="skewed" ${(graphic.separatorStyle || 'skewed') === 'skewed' ? 'selected' : ''}>Skośna kreska (Republika)</option>
                                <option value="dot" ${graphic.separatorStyle === 'dot' ? 'selected' : ''}>Kropka</option>
                                <option value="square" ${graphic.separatorStyle === 'square' ? 'selected' : ''}>Kwadrat</option>
                                <option value="pipe" ${graphic.separatorStyle === 'pipe' ? 'selected' : ''}>Pionowa kreska</option>
                                <option value="none" ${graphic.separatorStyle === 'none' ? 'selected' : ''}>Brak</option>
                            </select>
                        </div>
                    ` : ''}

                    ${tpl?.features?.wiper ? `
                         <div class="border-t border-gray-800 pt-3 mt-1">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Wiper (Pasek Pilny)</span>
                                <label class="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" data-field="wiper.show" ${(graphic.wiper?.show !== false) ? 'checked' : ''} class="w-4 h-4 bg-gray-800 border-gray-600 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer">
                                    <span class="text-[9px] text-gray-300 font-bold uppercase">Pokaż etykietę (Wiper)</span>
                                </label>
                            </div>
                            
                            <div class="mb-3">
                                ${ctrlLabel('Tło Etykiety Wipera')}
                                <div class="grid grid-cols-2 gap-2 mb-2">
                                    <div>
                                        <div class="text-[9px] text-gray-500 mb-1">Kolor 1 / Podstawa</div>
                                        ${colorPickerHtml('wiper.bgColor', graphic.wiper?.bgColor || '')}
                                    </div>
                                    <div>
                                        <div class="text-[9px] text-gray-500 mb-1">Kolor 2 (Gradient)</div>
                                        ${colorPickerHtml('wiper.color2', graphic.wiper?.color2 || '')}
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <div class="text-[9px] text-gray-500 mb-1">Kąt gradientu</div>
                                        <input type="number" data-field="wiper.gradientAngle" value="${graphic.wiper?.gradientAngle || 90}" class="w-full bg-gray-800 border border-gray-700 rounded p-1 text-[10px] text-white">
                                    </div>
                                    <div class="flex items-end">
                                        <label class="flex items-center gap-2 cursor-pointer select-none">
                                            <input type="checkbox" data-field="wiper.useGradient" ${graphic.wiper?.useGradient ? 'checked' : ''} class="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0">
                                            <span class="text-[10px] text-gray-400">Włącz gradient</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                    ${ctrlLabel('Kolor Tekstu')}
                                    ${colorPickerHtml('wiper.textColor', graphic.wiper?.textColor || '')}
                                </div>
                                <div>
                                    ${ctrlLabel('Rozmiar (px)')}
                                    <input type="number" data-field="wiper.fontSize" value="${graphic.wiper?.fontSize || ''}" placeholder="35" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                    ${ctrlLabel('Grubość')}
                                    <select data-field="wiper.fontWeight" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white appearance-none">
                                        <option value="normal" ${(graphic.wiper?.fontWeight || '900') === 'normal' ? 'selected' : ''}>Normalna (400)</option>
                                        <option value="bold" ${graphic.wiper?.fontWeight === 'bold' ? 'selected' : ''}>Pogrubiona (700)</option>
                                        <option value="800" ${graphic.wiper?.fontWeight === '800' ? 'selected' : ''}>Extra-Bold (800)</option>
                                        <option value="900" ${(graphic.wiper?.fontWeight || '900') === '900' ? 'selected' : ''}>Black (900)</option>
                                    </select>
                                </div>
                                <div>
                                    ${ctrlLabel('Odstępy (px)')}
                                    <input type="number" data-field="wiper.letterSpacing" value="${graphic.wiper?.letterSpacing ?? 1}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                                </div>
                            </div>

                            <div class="mb-2">
                                ${ctrlLabel('Krój Czcionki Wipera (Kategorii)')}
                                <select data-field="wiper.fontFamily" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white appearance-none">
                                    <option value="">Domyślna układu</option>
                                    <option value="Arial" ${graphic.wiper?.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                                    <option value="Roboto Condensed" ${graphic.wiper?.fontFamily === 'Roboto Condensed' ? 'selected' : ''}>Roboto Condensed</option>
                                    <option value="Bahnschrift" ${graphic.wiper?.fontFamily === 'Bahnschrift' ? 'selected' : ''}>Bahnschrift</option>
                                    <option value="Inter" ${graphic.wiper?.fontFamily === 'Inter' ? 'selected' : ''}>Inter</option>
                                    <option value="Helvetica" ${graphic.wiper?.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                                    <option value="Impact" ${graphic.wiper?.fontFamily === 'Impact' ? 'selected' : ''}>Impact</option>
                                    <option value="monospace" ${graphic.wiper?.fontFamily === 'monospace' ? 'selected' : ''}>Monospace</option>
                                </select>
                            </div>

                        </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}


            <div class="accordion border-b border-gray-800">
                <button class="accordion-toggle w-full flex items-center justify-between p-3 text-[10px] font-bold text-gray-400 bg-gray-900 hover:bg-gray-800 transition-colors" data-accordion="appearance">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
                        WYGLĄD
                    </span>
                    <span class="accordion-arrow">${inspectorAccordionStates[graphic.id]?.appearance ? '−' : '+'}</span>
                </button>
                <div class="accordion-content ${inspectorAccordionStates[graphic.id]?.appearance ? 'open' : ''} bg-gray-850/50 p-3 space-y-3">
                    <div class="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tło i Belki</div>
                    <div>
                        ${ctrlLabel('Typ Tła')}
                        <select data-field="style.background.type" class="w-full bg-gray-800 border border-gray-700 rounded p-1 text-[10px] text-blue-400 focus:outline-none focus:border-blue-500">
                            <option value="solid" ${(graphic.style?.background?.type || 'solid') === 'solid' ? 'selected' : ''}>Jednolite (Solid)</option>
                            <option value="gradient" ${graphic.style?.background?.type === 'gradient' ? 'selected' : ''}>Gradientowe</option>
                            <option value="transparent" ${graphic.style?.background?.type === 'transparent' ? 'selected' : ''}>Transparentne (Brak tła)</option>
                        </select>
                    </div>
                    <div ${graphic.style?.background?.type === 'transparent' ? 'style="display:none"' : ''}>
                        <div>
                            ${ctrlLabel('Kolor Tła')}
                            ${colorPickerHtml('style.background.color', graphic.style?.background?.color || '#1e3a8a')}
                        </div>
                        ${graphic.style?.background?.type === 'gradient' ? `
                        <div>
                            ${ctrlLabel('Kolor Tła 2')}
                            ${colorPickerHtml('style.background.color2', graphic.style?.background?.color2 || '#3b82f6')}
                        </div>
                        <div>
                            ${ctrlLabel('Kąt Gradientu')}
                            <input type="number" data-field="style.background.gradientAngle" value="${graphic.style?.background?.gradientAngle ?? 135}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                        </div>` : ''}
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            ${ctrlLabel('Zaokrąglenie')}
                            <input type="number" data-field="style.background.borderRadius" value="${graphic.style?.background?.borderRadius ?? 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                        </div>
                        <div>
                            ${ctrlLabel('Obramowanie (px)')}
                            <input type="number" data-field="style.background.borderWidth" value="${graphic.style?.background?.borderWidth ?? 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                        </div>
                    </div>
                    <div>
                        ${ctrlLabel('Kolor Akcentu / Tła Podtytułu (Kolor 2)')}
                        ${colorPickerHtml('style.background.borderColor', graphic.style?.background?.borderColor || '#3b82f6')}
                    </div>
                    <div>
                        ${ctrlLabel(`Ogólna Przezroczystość: ${Math.round((graphic.style?.opacity ?? 1) * 100)}%`)}
                        <input type="range" data-field="style.opacity" value="${graphic.style?.opacity ?? 1}" min="0" max="1" step="0.05" class="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500">
                    </div>
                    </div>

                    <div class="border-t border-gray-800 pt-3 mt-2">
                        <div class="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Typografia</div>
                        
                        <div class="flex items-center gap-2 mb-3">
                            <label class="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" data-field="style.typography.squatEnabled" ${graphic.style?.typography?.squatEnabled !== false ? 'checked' : ''} class="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0">
                                <span class="text-[10px] text-gray-400">Automatyczne ściskanie tekstu</span>
                            </label>
                        </div>

                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <div>
                                ${ctrlLabel('Kolor Tytułu')}
                                ${colorPickerHtml('style.typography.color', graphic.style?.typography?.color || '#ffffff')}
                            </div>
                            <div>
                                ${ctrlLabel('Kolor Podtytułu')}
                                ${colorPickerHtml('style.subtitleTypography.color', graphic.style?.subtitleTypography?.color || '#eeeeee')}
                            </div>
                        </div>
                        ${graphic.type === 'TICKER' ? `
                        <div class="mb-2">
                            ${ctrlLabel('Krój Czcionki Treści (Wiadomości)')}
                            <select data-field="style.typography.fontFamily" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white appearance-none">
                                <option value="Roboto Condensed" ${(graphic.style?.typography?.fontFamily || '') === 'Roboto Condensed' ? 'selected' : ''}>Roboto Condensed</option>
                                <option value="Bahnschrift" ${(graphic.style?.typography?.fontFamily || '') === 'Bahnschrift' ? 'selected' : ''}>Bahnschrift</option>
                                <option value="Inter" ${(graphic.style?.typography?.fontFamily || '') === 'Inter' ? 'selected' : ''}>Inter</option>
                                <option value="Arial" ${(graphic.style?.typography?.fontFamily || '') === 'Arial' ? 'selected' : ''}>Arial</option>
                                <option value="Helvetica" ${(graphic.style?.typography?.fontFamily || '') === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
                                <option value="Times New Roman" ${(graphic.style?.typography?.fontFamily || '') === 'Times New Roman' ? 'selected' : ''}>Times New Roman</option>
                                <option value="Georgia" ${(graphic.style?.typography?.fontFamily || '') === 'Georgia' ? 'selected' : ''}>Georgia</option>
                                <option value="monospace" ${(graphic.style?.typography?.fontFamily || '') === 'monospace' ? 'selected' : ''}>Monospace</option>
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <div>
                                ${ctrlLabel('Rozmiar (px)')}
                                <input type="number" data-field="style.typography.fontSize" value="${graphic.style?.typography?.fontSize || 30}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                            </div>
                            <div>
                                ${ctrlLabel('Grubość')}
                                <select data-field="style.typography.fontWeight" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white appearance-none">
                                    <option value="normal" ${(graphic.style?.typography?.fontWeight || 'normal') === 'normal' ? 'selected' : ''}>Normalna (400)</option>
                                    <option value="bold" ${graphic.style?.typography?.fontWeight === 'bold' ? 'selected' : ''}>Pogrubiona (700)</option>
                                    <option value="100" ${graphic.style?.typography?.fontWeight === '100' ? 'selected' : ''}>Thin (100)</option>
                                    <option value="300" ${graphic.style?.typography?.fontWeight === '300' ? 'selected' : ''}>Light (300)</option>
                                    <option value="500" ${graphic.style?.typography?.fontWeight === '500' ? 'selected' : ''}>Medium (500)</option>
                                    <option value="600" ${graphic.style?.typography?.fontWeight === '600' ? 'selected' : ''}>Semi-Bold (600)</option>
                                    <option value="800" ${graphic.style?.typography?.fontWeight === '800' ? 'selected' : ''}>Extra-Bold (800)</option>
                                    <option value="900" ${graphic.style?.typography?.fontWeight === '900' ? 'selected' : ''}>Black (900)</option>
                                </select>
                            </div>
                        </div>
                        <div class="mb-2">
                            ${ctrlLabel('Przesunięcie Y (px)')}
                            <input type="number" data-field="style.typography.paddingY" value="${graphic.style?.typography?.paddingY || 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>


            <div class="accordion border-b border-gray-800">
                <button class="accordion-toggle w-full flex items-center justify-between p-3 text-[10px] font-bold text-gray-400 bg-gray-900 hover:bg-gray-800 transition-colors" data-accordion="layout">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                        POZYCJA I WYMIARY
                    </span>
                    <span class="accordion-arrow">${inspectorAccordionStates[graphic.id]?.layout ? '−' : '+'}</span>
                </button>
                <div class="accordion-content ${inspectorAccordionStates[graphic.id]?.layout ? 'open' : ''} bg-gray-850/50 p-3">
                    <div class="mb-3 space-y-2">
                        <div>
                            ${ctrlLabel('Pozycja oparta na stronach')}
                            <select data-field="layout.side" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white appearance-none">
                                <option value="custom" ${(!graphic.layout?.side || graphic.layout.side === 'custom') ? 'selected' : ''}>Niestandardowa (XY)</option>
                                <option value="top-left" ${graphic.layout?.side === 'top-left' ? 'selected' : ''}>Góra - Lewo</option>
                                <option value="top-center" ${graphic.layout?.side === 'top-center' ? 'selected' : ''}>Góra - Środek</option>
                                <option value="top-right" ${graphic.layout?.side === 'top-right' ? 'selected' : ''}>Góra - Prawo</option>
                                <option value="center-left" ${graphic.layout?.side === 'center-left' ? 'selected' : ''}>Środek - Lewo</option>
                                <option value="center" ${graphic.layout?.side === 'center' ? 'selected' : ''}>Środek (Centrum)</option>
                                <option value="center-right" ${graphic.layout?.side === 'center-right' ? 'selected' : ''}>Środek - Prawo</option>
                                <option value="bottom-left" ${graphic.layout?.side === 'bottom-left' ? 'selected' : ''}>Dół - Lewo</option>
                                <option value="bottom-center" ${graphic.layout?.side === 'bottom-center' ? 'selected' : ''}>Dół - Środek</option>
                                <option value="bottom-right" ${graphic.layout?.side === 'bottom-right' ? 'selected' : ''}>Dół - Prawo</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2" id="layout-custom-xy" style="${(!graphic.layout?.side || graphic.layout.side === 'custom') ? '' : 'opacity: 0.5; pointer-events: none;'}">
                        <div>${ctrlLabel('Pozycja X')}<input type="number" data-field="layout.x" value="${graphic.layout?.x ?? 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                        <div>${ctrlLabel('Pozycja Y')}<input type="number" data-field="layout.y" value="${graphic.layout?.y ?? 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 mt-2" id="layout-margins" style="${(graphic.layout?.side && graphic.layout.side !== 'custom') ? '' : 'opacity: 0.5; pointer-events: none;'}">
                        <div>${ctrlLabel('Margines X (px)')}<input type="number" data-field="layout.marginX" value="${graphic.layout?.marginX ?? 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                        <div>${ctrlLabel('Margines Y (px)')}<input type="number" data-field="layout.marginY" value="${graphic.layout?.marginY ?? 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div>${ctrlLabel('Szerokość')}<input type="text" data-field="layout.width" value="${graphic.layout?.width || ''}" placeholder="Auto" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                        <div>${ctrlLabel('Wysokość')}<input type="text" data-field="layout.height" value="${graphic.layout?.height || ''}" placeholder="Auto" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                        <div>${ctrlLabel('Warstwa (Z-Index)')}<input type="number" data-field="layout.layer" value="${graphic.layout?.layer ?? 1}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                        <div>${ctrlLabel('Skala')}<input type="number" data-field="layout.scale" value="${graphic.layout?.scale ?? 1}" step="0.1" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                    </div>

                    <div class="border-t border-gray-800 pt-3 mt-3">
                        <div class="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Powiązania (Dokowanie)</div>
                        <div class="space-y-4">
                            <div>
                                ${ctrlLabel('Przyklej po osi Y (Góra/Dół zależy od celu)')}
                                <div class="text-[10px] text-gray-500 mb-1">Przytrzymaj Ctrl, aby wybrać wiele elementów</div>
                                <select multiple data-field="layout.attachedToGraphicId" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-[10px] focus:border-blue-500 focus:outline-none text-white h-24">
                                    <option value="" ${(!graphic.layout?.attachedToGraphicId || (Array.isArray(graphic.layout.attachedToGraphicId) && graphic.layout.attachedToGraphicId.length === 0)) ? 'selected' : ''}>Brak (Niezależna pozycja Y)</option>
                                    ${state.graphics.filter(g => g.id !== graphic.id).map(g => `<option value="${g.id}" ${(Array.isArray(graphic.layout?.attachedToGraphicId) ? graphic.layout.attachedToGraphicId.includes(g.id) : graphic.layout?.attachedToGraphicId === g.id) ? 'selected' : ''}>[${g.name}] ${g.title || 'Bez tytułu'}</option>`).join('')}
                                </select>
                                <div class="mt-2">
                                    ${ctrlLabel('Przesunięcie Y gdy Cel jest na żywo (px)')}
                                    <input type="number" data-field="layout.attachOffsetY" value="${graphic.layout?.attachOffsetY ?? 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                                </div>
                            </div>
                            
                            <div class="border-t border-gray-800 pt-2">
                                ${ctrlLabel('Przyklej po osi X (Lewo/Prawo zależy od celu)')}
                                <div class="text-[10px] text-gray-500 mb-1">Przytrzymaj Ctrl, aby wybrać wiele elementów</div>
                                <select multiple data-field="layout.attachedToGraphicIdX" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-[10px] focus:border-blue-500 focus:outline-none text-white h-24">
                                    <option value="" ${(!graphic.layout?.attachedToGraphicIdX || (Array.isArray(graphic.layout.attachedToGraphicIdX) && graphic.layout.attachedToGraphicIdX.length === 0)) ? 'selected' : ''}>Brak (Niezależna pozycja X)</option>
                                    ${state.graphics.filter(g => g.id !== graphic.id).map(g => `<option value="${g.id}" ${(Array.isArray(graphic.layout?.attachedToGraphicIdX) ? graphic.layout.attachedToGraphicIdX.includes(g.id) : graphic.layout?.attachedToGraphicIdX === g.id) ? 'selected' : ''}>[${g.name}] ${g.title || 'Bez tytułu'}</option>`).join('')}
                                </select>
                                <div class="mt-2">
                                    ${ctrlLabel('Przesunięcie X gdy Cel jest na żywo (px)')}
                                    <input type="number" data-field="layout.attachOffsetX" value="${graphic.layout?.attachOffsetX ?? 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                                </div>
                            </div>

                            <div class="text-[10px] text-gray-500 mt-1">Przykład: -100px u góry podniesie element do góry. -100px na dole przesunie go w lewo. Element gładko wyląduje z powrotem na swojej bazowej pozycji, kiedy wszystkie docelowe grafiki (cele) znikną z ekranu.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="ins-tab-content-anim" class="${currentInspectorTab === 'anim' ? '' : 'hidden '}flex-1 flex flex-col shrink-0">
            <div class="accordion border-b border-gray-800">
                <button class="accordion-toggle w-full flex items-center justify-between p-3 text-[10px] font-bold text-gray-400 bg-gray-900 hover:bg-gray-800 transition-colors" data-accordion="animation">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        ANIMACJA
                    </span>
                    <span class="accordion-arrow">${inspectorAccordionStates[graphic.id]?.animation ? '−' : '+'}</span>
                </button>
                <div class="accordion-content ${inspectorAccordionStates[graphic.id]?.animation ? 'open' : ''} bg-gray-850/50 p-3 space-y-4">
                    <div>
                        <div class="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-2">Wejście (IN)</div>
                        <div class="space-y-2">
                            ${ctrlLabel('Typ')}
                            ${animTypeSelect('animation.in.type', graphic.animation?.in?.type || 'slide', 'in')}
                            ${directionBtns('animation.in.direction', graphic.animation?.in?.direction || 'left', 'blue', graphic.animation?.in?.type || 'slide')}
                            <div class="grid grid-cols-2 gap-2">
                                <div>${ctrlLabel('Czas (s)')}<input type="number" data-field="animation.in.duration" value="${graphic.animation?.in?.duration ?? 0.5}" step="0.05" min="0" max="5" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                                <div>${ctrlLabel('Opóźnienie (s)')}<input type="number" data-field="animation.in.delay" value="${graphic.animation?.in?.delay ?? 0}" step="0.05" min="0" max="10" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                            </div>
                            ${ctrlLabel('Krzywa (Easing)')}
                            ${easingSelect('animation.in.ease', graphic.animation?.in?.ease || 'ease-out')}
                        </div>
                    </div>

                    <div class="border-t border-gray-800 pt-4">
                        <div class="text-[9px] font-bold text-orange-400 uppercase tracking-wider mb-2">Wyjście (OUT)</div>
                        <div class="space-y-2">
                            ${ctrlLabel('Typ')}
                            ${animTypeSelect('animation.out.type', graphic.animation?.out?.type || 'fade', 'out')}
                            ${directionBtns('animation.out.direction', graphic.animation?.out?.direction || 'left', 'orange', graphic.animation?.out?.type || 'fade')}
                            <div class="grid grid-cols-2 gap-2">
                                <div>${ctrlLabel('Czas (s)')}<input type="number" data-field="animation.out.duration" value="${graphic.animation?.out?.duration ?? 0.3}" step="0.05" min="0" max="5" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                                <div>${ctrlLabel('Opóźnienie (s)')}<input type="number" data-field="animation.out.delay" value="${graphic.animation?.out?.delay ?? 0}" step="0.05" min="0" max="10" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                            </div>
                            ${ctrlLabel('Krzywa (Easing)')}
                            ${easingSelect('animation.out.ease', graphic.animation?.out?.ease || 'ease-in', true)}
                        </div>
                    </div>

                    <div class="border-t border-gray-800 pt-4">
                        <div class="text-[9px] font-bold text-green-400 uppercase tracking-wider mb-2">Tekst Wejście (TEXT IN)</div>
                        <div class="space-y-2">
                            ${ctrlLabel('Typ')}
                            <select data-field="animation.text.type" class="w-full bg-gray-800 border border-gray-700 rounded h-7 text-[10px] px-2 focus:border-blue-500 focus:outline-none">
                                <option value="none" ${(!graphic.animation?.text?.type || graphic.animation.text.type === 'none') ? 'selected' : ''}>✕ Brak (Pojawia się z belką)</option>
                                <option value="reveal" ${graphic.animation?.text?.type === 'reveal' ? 'selected' : ''}>Odsłonięcie (Reveal / Typewriter)</option>
                                <option value="fade" ${graphic.animation?.text?.type === 'fade' ? 'selected' : ''}>Zanikanie (Fade Letters)</option>
                                <option value="blur" ${graphic.animation?.text?.type === 'blur' ? 'selected' : ''}>Rozmycie (Blur In)</option>
                                <option value="scale" ${graphic.animation?.text?.type === 'scale' ? 'selected' : ''}>Skalowanie (Scale)</option>
                                <option value="slide-up" ${graphic.animation?.text?.type === 'slide-up' ? 'selected' : ''}>Wjazd od dołu (Slide Up)</option>
                                <option value="slide-down" ${graphic.animation?.text?.type === 'slide-down' ? 'selected' : ''}>Wjazd od góry (Slide Down)</option>
                                <option value="slide-left" ${graphic.animation?.text?.type === 'slide-left' ? 'selected' : ''}>Wjazd od prawej (Slide Left)</option>
                                <option value="slide-right" ${graphic.animation?.text?.type === 'slide-right' ? 'selected' : ''}>Wjazd od lewej (Slide Right)</option>
                            </select>
                            
                            <div class="flex items-center gap-2 mt-2 mb-2">
                                <input type="checkbox" id="sync-text-in-${graphic.id}" data-field="animation.textSync" ${graphic.animation?.textSync ? 'checked' : ''} class="w-3 h-3 bg-gray-800 border-gray-600 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer">
                                <label for="sync-text-in-${graphic.id}" class="text-[9px] text-gray-300 font-bold uppercase cursor-pointer">Rozpocznij po wejściu belki (Sekwencyjnie)</label>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>${ctrlLabel('Czas (s)')}<input type="number" data-field="animation.text.duration" value="${graphic.animation?.text?.duration ?? 1.0}" step="0.1" min="0" max="5" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                                <div>${ctrlLabel('Opóźnienie (s)')}<input type="number" data-field="animation.text.delay" value="${graphic.animation?.text?.delay ?? 0.2}" step="0.1" min="0" max="5" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                            </div>
                            <div>
                                ${ctrlLabel('Stagger (Opóźnienie między elementami)')}
                                <input type="number" data-field="animation.text.stagger" value="${graphic.animation?.text?.stagger ?? 0.1}" step="0.05" min="0" max="2" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                            </div>
                        </div>
                    </div>

                    <div class="border-t border-gray-800 pt-4">
                        <div class="text-[9px] font-bold text-red-400 uppercase tracking-wider mb-2">Tekst Wyjście (TEXT OUT)</div>
                        <div class="space-y-2">
                            ${ctrlLabel('Typ')}
                            <select data-field="animation.textOut.type" class="w-full bg-gray-800 border border-gray-700 rounded h-7 text-[10px] px-2 focus:border-blue-500 focus:outline-none">
                                <option value="none" ${(!graphic.animation?.textOut?.type || graphic.animation.textOut.type === 'none') ? 'selected' : ''}>✕ Brak (Razem z belką / Sztywne ucięcie)</option>
                                <option value="fade" ${graphic.animation?.textOut?.type === 'fade' ? 'selected' : ''}>Zanikanie (Fade)</option>
                                <option value="blurOut" ${graphic.animation?.textOut?.type === 'blurOut' ? 'selected' : ''}>Rozmycie (Blur Out)</option>
                                <option value="scale" ${graphic.animation?.textOut?.type === 'scale' ? 'selected' : ''}>Skalowanie (Scale)</option>
                                <option value="slide-up" ${graphic.animation?.textOut?.type === 'slide-up' ? 'selected' : ''}>Zjazd do góry (Slide Up)</option>
                                <option value="slide-down" ${graphic.animation?.textOut?.type === 'slide-down' ? 'selected' : ''}>Zjazd do dołu (Slide Down)</option>
                                <option value="slide-left" ${graphic.animation?.textOut?.type === 'slide-left' ? 'selected' : ''}>Zjazd w lewo (Slide Left)</option>
                                <option value="slide-right" ${graphic.animation?.textOut?.type === 'slide-right' ? 'selected' : ''}>Zjazd w prawo (Slide Right)</option>
                                <option value="hide" ${graphic.animation?.textOut?.type === 'hide' ? 'selected' : ''}>Zasłonięcie (Hide / Clip)</option>
                            </select>
                            
                            <div class="flex items-center gap-2 mt-2 mb-2">
                                <input type="checkbox" id="sync-text-out-${graphic.id}" data-field="animation.textOut.syncWithBase" ${graphic.animation?.textOut?.syncWithBase ? 'checked' : ''} class="w-3 h-3 bg-gray-800 border-gray-600 rounded text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer">
                                <label for="sync-text-out-${graphic.id}" class="text-[9px] text-gray-300 font-bold uppercase cursor-pointer">Rozpocznij przed wyjściem belki (Sekwencyjnie)</label>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-2">
                                <div>${ctrlLabel('Czas (s)')}<input type="number" data-field="animation.textOut.duration" value="${graphic.animation?.textOut?.duration ?? 0.5}" step="0.1" min="0" max="5" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                                <div>${ctrlLabel('Opóźnienie (s)')}<input type="number" data-field="animation.textOut.delay" value="${graphic.animation?.textOut?.delay ?? 0}" step="0.1" min="0" max="5" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                            </div>
                            <div>
                                ${ctrlLabel('Stagger')}
                                <input type="number" data-field="animation.textOut.stagger" value="${graphic.animation?.textOut?.stagger ?? 0}" step="0.05" min="0" max="2" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                            </div>
                        </div>
                    </div>


                    ${tpl?.features?.wiper ? `
                    <div class="border-t border-gray-800 pt-4">
                        <div class="flex items-center justify-between mb-2">
                            <div class="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Efekt Błysku (Gleam)</div>
                            <label class="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" data-field="wiper.gleamEnabled" ${graphic.wiper?.gleamEnabled !== false ? 'checked' : ''} class="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0">
                                <span class="text-[9px] text-gray-500">Włącz</span>
                            </label>
                        </div>
                        <div class="space-y-3">
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    ${ctrlLabel('Kolor Błysku')}
                                    ${colorPickerHtml('wiper.gleamColor', graphic.wiper?.gleamColor || '#ffffff')}
                                </div>
                                <div>
                                    ${ctrlLabel('Czas trwania (s)')}
                                    <input type="number" data-field="wiper.gleamDuration" value="${graphic.wiper?.gleamDuration || 2}" step="0.1" min="0.5" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                                </div>
                            </div>
                            <div class="grid grid-cols-3 gap-2">
                                <div>
                                    ${ctrlLabel('Wys. (px)')}
                                    <input type="number" data-field="wiper.gleamHeight" value="${graphic.wiper?.gleamHeight || 100}" min="1" max="500" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                                </div>
                                <div>
                                    ${ctrlLabel('Częstotl. (s)')}
                                    <input type="number" data-field="wiper.gleamFrequency" value="${graphic.wiper?.gleamFrequency || 3}" step="0.1" min="0" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white" title="Przerwa między błyskami">
                                </div>
                                <div>
                                    ${ctrlLabel('Szer. (%)')}
                                    <input type="number" data-field="wiper.gleamWidth" value="${graphic.wiper?.gleamWidth || 150}" min="10" max="1000" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white" title="Szerokość błysku">
                                </div>
                            </div>
                            <div>
                                ${ctrlLabel(`Przezroczystość Błysku: ${Math.round((graphic.wiper?.gleamOpacity ?? 0.4) * 100)}%`)}
                                <input type="range" data-field="wiper.gleamOpacity" value="${graphic.wiper?.gleamOpacity ?? 0.4}" min="0" max="1" step="0.05" class="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500">
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <div class="border-t border-gray-800 pt-3">
                        <button id="btn-preview-anim" class="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-[10px] font-bold transition-colors">
                            ▶ Podgląd animacji wejścia
                        </button>
                    </div>
                    <div class="h-16"></div> <!-- Spacer for color picker accessibility -->
                </div>
            </div>

            ${tpl?.ocgInputs?.length ? `
            <div class="accordion border-b border-gray-800">
                <button class="accordion-toggle w-full flex items-center justify-between p-3 text-[10px] font-bold text-orange-400 bg-gray-900 hover:bg-gray-800 transition-colors" data-accordion="ocgFields">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        PARAMETRY OCG (NIESTANDARDOWE)
                    </span>
                    <span class="accordion-arrow">${inspectorAccordionStates[graphic.id]?.ocgFields ? '−' : '+'}</span>
                </button>
                <div class="accordion-content ${inspectorAccordionStates[graphic.id]?.ocgFields ? 'open' : ''} bg-gray-850/50 p-3 space-y-4">
                    ${tpl.ocgInputs.map(input => {
                        const val = graphic.fields?.[input.id] ?? input.default ?? '';
                        return `
                        <div>
                            ${ctrlLabel(input.label || input.id)}
                            ${input.type === 'list' ? `
                                <div class="space-y-1 bg-gray-900 border border-gray-800 rounded p-1 mb-2 max-h-48 overflow-y-auto" id="ocg-list-${input.id}-${graphic.id}">
                                    ${(Array.isArray(val) ? val : []).map((item, idx) => `
                                        <div class="flex items-center gap-1 group">
                                            <input type="text" value="${escAttr(item)}" onchange="window.updateOcgField('${graphic.id}', '${input.id}', ${idx}, this.value)" class="flex-1 bg-gray-800 border border-gray-700 rounded p-1 text-[10px] focus:border-blue-500 focus:outline-none text-white">
                                            <button onclick="window.removeOcgField('${graphic.id}', '${input.id}', ${idx})" class="w-6 h-6 rounded flex items-center justify-center bg-gray-800 hover:bg-red-900/60 text-gray-500 hover:text-red-400 text-xs shrink-0">&times;</button>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="flex gap-1">
                                    <input type="text" id="new-ocg-val-${input.id}-${graphic.id}" placeholder="Dodaj element..." class="flex-1 bg-gray-800 border border-gray-700 rounded p-1 text-[10px] focus:border-blue-500 focus:outline-none text-white" onkeydown="if(event.key === 'Enter') window.addOcgField('${graphic.id}', '${input.id}')">
                                    <button onclick="window.addOcgField('${graphic.id}', '${input.id}')" class="px-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold h-6 flex items-center justify-center">DODAJ</button>
                                </div>
                            ` : input.type === 'richtext' ? `
                                <textarea data-field="fields.${input.id}" rows="4" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white font-mono leading-tight">${escAttr(val)}</textarea>
                            ` : `
                                <input type="text" data-field="fields.${input.id}" value="${escAttr(val)}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                            `}
                        </div>`;
                    }).join('')}
                </div>
            </div>
            ` : ''}
        </div>
`;

    // --- Bind all inputs ---
    body.querySelectorAll('[data-field]').forEach(el => {
        el.addEventListener('change', () => handleInspectorChange(el, graphic));
        if (el.tagName === 'INPUT' && el.type !== 'file' && el.type !== 'color') {
            el.addEventListener('input', () => handleInspectorChange(el, graphic));
        }
        if (el.tagName === 'TEXTAREA') {
            el.addEventListener('input', () => handleInspectorChange(el, graphic));
        }
    });

    // Color picker sync
    body.querySelectorAll('.color-hex-input').forEach(hexInput => {
        const fieldPath = hexInput.getAttribute('data-field');
        const colInput = body.querySelector(`input[type="color"][data-field= "${fieldPath}"]`);
        if (colInput) {
            colInput.addEventListener('input', () => { hexInput.value = colInput.value; });
            hexInput.addEventListener('input', () => {
                if (/^#[0-9a-f]{6}$/i.test(hexInput.value)) {
                    colInput.value = hexInput.value;
                }
            });
        }
    });

    // Image upload
    const imageUpload = body.querySelector('#image-upload');
    if (imageUpload) {
        imageUpload.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (file) {
                try {
                    const res = await uploadFile(file);
                    let g = window._draftGraphics[graphic.id] || state.graphics.find(g => g.id === graphic.id);
                    if (g) {
                        g = JSON.parse(JSON.stringify(g));
                        g.url = res.url;
                        window._draftGraphics[graphic.id] = g;
                        if (previewGraphic?.id === graphic.id) Object.assign(previewGraphic, g);
                        refreshPreviewMonitor();
                        renderShotbox();
                        openInspector(graphic.id);
                    }
                } catch (err) {
                    console.error("[!] Upload error:", err);
                    alert("Wystąpił błąd podczas wgrywania pliku.");
                }
            }
        });
    }

    // Side image upload (republika-composite)
    const sideImageUpload = body.querySelector('#side-image-upload');
    if (sideImageUpload) {
        sideImageUpload.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (file) {
                try {
                    const res = await uploadFile(file);
                    let g = window._draftGraphics[graphic.id] || state.graphics.find(g => g.id === graphic.id);
                    if (g) {
                        g = JSON.parse(JSON.stringify(g));
                        g.sideImage = res.url;
                        window._draftGraphics[graphic.id] = g;
                        if (previewGraphic?.id === graphic.id) Object.assign(previewGraphic, g);
                        refreshPreviewMonitor();
                        renderShotbox();
                        openInspector(graphic.id);
                    }
                } catch (err) {
                    console.error("[!] Side image upload error:", err);
                    alert("Wystąpił błąd podczas wgrywania grafiki bocznej.");
                }
            }
        });
    }

    // Remove side image
    const removeSideBtn = body.querySelector('#btn-remove-side-image');
    if (removeSideBtn) {
        removeSideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let g = window._draftGraphics[graphic.id] || state.graphics.find(g => g.id === graphic.id);
            if (g) {
                g = JSON.parse(JSON.stringify(g));
                g.sideImage = '';
                window._draftGraphics[graphic.id] = g;
                if (previewGraphic?.id === graphic.id) Object.assign(previewGraphic, g);
                refreshPreviewMonitor();
                renderShotbox();
                openInspector(graphic.id);
            }
        });
    }

    // Direction buttons (animation)
    body.querySelectorAll('[data-dir-field]').forEach(btn => {
        btn.addEventListener('click', () => {
            let g = window._draftGraphics[selectedGraphicId] || state.graphics.find(g => g.id === selectedGraphicId);
            if (!g) return;
            g = JSON.parse(JSON.stringify(g));
            deepSet(g, btn.getAttribute('data-dir-field'), btn.getAttribute('data-dir-value'));
            window._draftGraphics[selectedGraphicId] = g;
            if (previewGraphic?.id === selectedGraphicId) Object.assign(previewGraphic, g);
            refreshPreviewMonitor();
            renderShotbox();
            openInspector(g.id); // re-render to update button states
        });
    });

    // ---- Open Title WYSIWYG modal button ----
    const openWysiwygBtn = body.querySelector('#btn-open-wysiwyg');
    const titleBox = body.querySelector('#title-preview-box');
    if (openWysiwygBtn) {
        const handler = (e) => { e.stopPropagation(); openWysiwygModal(graphic.id); };
        openWysiwygBtn.addEventListener('click', handler);
        if (titleBox) titleBox.addEventListener('click', handler);
    }

    // ---- OCG richtext WYSIWYG buttons (data-ocg-wysiwyg) ----
    body.querySelectorAll('[data-ocg-wysiwyg]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const fieldId = btn.getAttribute('data-ocg-wysiwyg');
            const g = state.graphics.find(gx => gx.id === graphic.id);
            if (!g) return;
            const currentVal = g.fields?.[fieldId] ?? '';
            openWysiwygModalForField(g.id, fieldId, currentVal);
        });
    });

    // ---- Accordion toggles ----
    body.querySelectorAll('.accordion-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-accordion');
            const content = btn.nextElementSibling;
            const arrow = btn.querySelector('.accordion-arrow');
            const isOpen = content.classList.contains('open');
            content.classList.toggle('open', !isOpen);
            arrow.textContent = isOpen ? '+' : '−';
            // Save state
            if (inspectorAccordionStates[graphic.id]) {
                inspectorAccordionStates[graphic.id][id] = !isOpen;
            }
        });
    });

    // Preview animation
    const previewAnimBtn = body.querySelector('#btn-preview-anim');
    if (previewAnimBtn) {
        previewAnimBtn.addEventListener('click', () => {
            if (!previewGraphic) return;
            const old = previewGraphic.visible;
            previewGraphic.visible = false;
            refreshPreviewMonitor();
            setTimeout(() => {
                previewGraphic.visible = true;
                refreshPreviewMonitor();
            }, 120);
        });
    }
}

function handleInspectorChange(el, graphic) {
    if (!previewGraphic || previewGraphic.id !== graphic.id) return;
    const g = previewGraphic;

    const field = el.getAttribute('data-field');
    let value = el.value;

    // Special cases
    if (el.type === 'checkbox') {
        value = el.checked;
    } else if (el.multiple) {
        value = Array.from(el.selectedOptions).map(opt => opt.value).filter(val => val !== "");
    } else if (field === 'items') {
        value = value.split('\n').filter(s => s.trim() !== '');
    } else if (el.type === 'number') {
        value = parseFloat(value) || 0;
    } else if (field === 'titleHtml') {
        g.title = el.value.replace(/<[^>]+>/g, ''); // strip html for title
        g.titleHtml = el.value;
        refreshPreviewMonitor();
        return;
    }

    deepSet(g, field, value);
    
    // Sync to legacy properties
    if (field === 'fields.TITLE') {
        g.title = (value || '').replace(/<[^>]+>/g, '');
        g.titleHtml = value;
    } else if (field === 'fields.SUBTITLE') {
        g.subtitle = (value || '').replace(/<[^>]+>/g, '');
    }

    refreshPreviewMonitor();
    
    // Commit to persistent draft
    window._draftGraphics[graphic.id] = JSON.parse(JSON.stringify(g));

    // Re-render inspector when background type changes (shows/hides gradient fields) or layout side changes
    if (field === 'style.background.type' || field === 'layout.side') {
        renderInspectorBody(previewGraphic);
        return;
    }
}

// ===========================================================
// WYSIWYG Helper
// ===========================================================
// Normalize HTML: flatten redundant nested spans (same CSS property)
function _wmNormalizeHtml(root) {
    // 1. Convert <font> tags to spans
    root.querySelectorAll('font').forEach(fontEl => {
        const span = document.createElement('span');
        if (fontEl.getAttribute('face')) span.style.fontFamily = fontEl.getAttribute('face');
        if (fontEl.getAttribute('color')) span.style.color = fontEl.getAttribute('color');
        if (fontEl.getAttribute('size')) {
            const sizeMap = { '1': '10px', '2': '13px', '3': '16px', '4': '18px', '5': '24px', '6': '32px', '7': '48px' };
            span.style.fontSize = sizeMap[fontEl.getAttribute('size')] || '18px';
        }
        span.innerHTML = fontEl.innerHTML;
        fontEl.replaceWith(span);
    });

    // 2. Merge outer span styles into inner span when inner span only has text
    let changed = true;
    while (changed) {
        changed = false;
        root.querySelectorAll('span').forEach(outer => {
            if (outer.childNodes.length === 1 && outer.firstChild?.tagName === 'SPAN') {
                const inner = outer.firstChild;
                // Merge outer style into inner (inner wins on conflict)
                outer.style.cssText.split(';').forEach(rule => {
                    const [prop, val] = rule.split(':').map(s => s.trim());
                    if (prop && val && !inner.style[prop]) {
                        inner.style[prop] = val;
                    }
                });
                outer.replaceWith(inner);
                changed = true;
            }
        });
    }

    // 3. Compact background styles (if highlight is used, ensure display:inline-block for padding/radius)
    root.querySelectorAll('span').forEach(span => {
        if (span.style.backgroundColor && span.style.backgroundColor !== 'transparent') {
            if (!span.style.display || span.style.display === 'inline') {
                span.style.display = 'inline-block';
                span.style.padding = span.style.padding || '0 8px';
                span.style.borderRadius = span.style.borderRadius || '4px';
            }
        }
    });

    // 4. Strip empty spans
    root.querySelectorAll('span').forEach(span => {
        if (span.innerHTML === '' || span.innerHTML === '&nbsp;') span.remove();
    });

    // 5. Convert block-level divs/p to <br> separators
    root.querySelectorAll('div,p').forEach(block => {
        if (block.parentElement === root) {
            const frag = document.createDocumentFragment();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = block.innerHTML;
            while (tempDiv.firstChild) frag.appendChild(tempDiv.firstChild);
            if (block.nextSibling) {
                frag.appendChild(document.createElement('br'));
            }
            block.replaceWith(frag);
        }
    });
}

function saveWysiwyg(editorEl, graphicId) {
    if (!previewGraphic || previewGraphic.id !== graphicId) return;
    const g = previewGraphic;

    // Normalize and sanitize HTML before saving
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorEl.innerHTML;
    _wmNormalizeHtml(tempDiv);
    const html = tempDiv.innerHTML;

    if (_wmTargetField) {
        if (!g.fields) g.fields = {};
        g.fields[_wmTargetField] = html;
        if (_wmTargetField === 'TITLE') {
            g.titleHtml = html;
            g.title = editorEl.textContent || editorEl.innerText || '';
        } else if (_wmTargetField === 'SUBTITLE') {
            g.subtitle = editorEl.textContent || editorEl.innerText || '';
        }
    } else {
        if (g.type === 'TICKER') {
            const rawItems = html.split(/<br\s*\/?>|<\/?div>|<\/?p>/i);
            g.items = rawItems.filter(s => s.replace(/&nbsp;/g, '').trim() !== '');
            if (selectedGraphicId === g.id) {
                renderInspectorBody(previewGraphic);
            }
        } else {
            g.titleHtml = html;
            g.title = editorEl.textContent || editorEl.innerText || '';
            const previewBox = document.getElementById('title-preview-content');
            if (previewBox) previewBox.innerHTML = html || '<span style="color:#6b7280;font-style:italic;">Kliknij aby edytować…</span>';
        }
    }
    
    window._draftGraphics[g.id] = JSON.parse(JSON.stringify(g));
    refreshPreviewMonitor();
    
    clearTimeout(window._shotboxSyncTimer);
    window._shotboxSyncTimer = setTimeout(() => renderShotbox(), 300);
}

// Helpers for Ticker Messages Manager UI
window.updateTickerMessage = function(graphicId, index, value, field = 'text') {
    if (!previewGraphic || previewGraphic.id !== graphicId || !previewGraphic.items) return;
    
    let item = previewGraphic.items[index];
    if (typeof item === 'string') {
        item = { text: item, category: "" };
    } else {
        item = { ...item };
    }
    
    if (field === 'text') item.text = value;
    else if (field === 'category') item.category = value;
    
    previewGraphic.items[index] = item;
    refreshPreviewMonitor();
};

window.removeTickerMessage = function(graphicId, index) {
    if (!previewGraphic || previewGraphic.id !== graphicId || !previewGraphic.items) return;
    previewGraphic.items.splice(index, 1);
    refreshPreviewMonitor();
    if (selectedGraphicId === graphicId) renderInspectorBody(previewGraphic);
};

window.addTickerMessage = function(graphicId) {
    if (!previewGraphic || previewGraphic.id !== graphicId) return;
    const input = document.getElementById(`new-ticker-msg-${graphicId}`);
    const catInput = document.getElementById(`new-ticker-cat-${graphicId}`);
    if (!input || !input.value.trim()) return;
    if (!previewGraphic.items) previewGraphic.items = [];
    
    previewGraphic.items.push({
        text: input.value.trim(),
        category: catInput ? catInput.value.trim() : ""
    });
    
    refreshPreviewMonitor();
    if (selectedGraphicId === graphicId) renderInspectorBody(previewGraphic);
    setTimeout(() => {
        const resetInput = document.getElementById(`new-ticker-msg-${graphicId}`);
        if(resetInput) resetInput.focus();
    }, 50);
};

// --- OCG Field Helpers ---
window.updateOcgField = function(graphicId, fieldId, index, value) {
    if (!previewGraphic || previewGraphic.id !== graphicId || !previewGraphic.fields || !Array.isArray(previewGraphic.fields[fieldId])) return;
    previewGraphic.fields[fieldId][index] = value;
    refreshPreviewMonitor();
};

window.removeOcgField = function(graphicId, fieldId, index) {
    if (!previewGraphic || previewGraphic.id !== graphicId || !previewGraphic.fields || !Array.isArray(previewGraphic.fields[fieldId])) return;
    previewGraphic.fields[fieldId].splice(index, 1);
    refreshPreviewMonitor();
    if (selectedGraphicId === graphicId) renderInspectorBody(previewGraphic);
};

window.addOcgField = function(graphicId, fieldId) {
    if (!previewGraphic || previewGraphic.id !== graphicId) return;
    const input = document.getElementById(`new-ocg-val-${fieldId}-${graphicId}`);
    if (!input || !input.value.trim()) return;
    
    if (!previewGraphic.fields) previewGraphic.fields = {};
    if (!Array.isArray(previewGraphic.fields[fieldId])) previewGraphic.fields[fieldId] = [];
    
    previewGraphic.fields[fieldId].push(input.value.trim());
    refreshPreviewMonitor();
    if (selectedGraphicId === graphicId) renderInspectorBody(previewGraphic);
    setTimeout(() => {
        const resetInput = document.getElementById(`new-ocg-val-${fieldId}-${graphicId}`);
        if(resetInput) resetInput.focus();
    }, 50);
};


// ===========================================================
// WYSIWYG MODAL
// ===========================================================
let _wmGraphicId = null;
let _wmTargetField = null;
let _wmRo = null;
let _wmSavedHtml = null;

function openWysiwygModal(graphicId) {
    const g = window._draftGraphics[graphicId] || state.graphics.find(g => g.id === graphicId);
    if (!g) return;
    // Ensure previewGraphic is set for live drafting
    if (!previewGraphic || previewGraphic.id !== graphicId) {
        previewGraphic = JSON.parse(JSON.stringify(g));
        refreshPreviewMonitor();
        refreshPreviewControls();
    }
    _wmGraphicId = graphicId;
    _wmTargetField = null; // Clear target field (legacy mode)
    if (g.type === 'TICKER') {
        _wmSavedHtml = (g.items || []).join('<br>');
    } else {
        const tpl = state.templates.find(t => t.id === g.templateId);
        _wmSavedHtml = g.titleHtml || (g.titleLines && g.titleLines.length > 0 ? g.titleLines.map(l => `<div style="font-size:${l.fontSize || 48}px;font-weight:${l.fontWeight || '800'};color:${l.color || '#fff'};font-family:'${l.fontFamily || 'Inter'}',sans-serif;text-transform:${l.textTransform || 'uppercase'}" > ${l.text}</div> `).join('') : (g.title || tpl?.defaultFields?.title || ''));
    }

    _wmOpenModal(g);
}

function openWysiwygModalForField(graphicId, fieldId, currentHtml) {
    const g = window._draftGraphics[graphicId] || state.graphics.find(g => g.id === graphicId);
    if (!g) return;
    if (!previewGraphic || previewGraphic.id !== graphicId) {
        previewGraphic = JSON.parse(JSON.stringify(g));
        refreshPreviewMonitor();
        refreshPreviewControls();
    }
    _wmGraphicId = graphicId;
    _wmTargetField = fieldId;
    _wmSavedHtml = currentHtml || '';

    _wmOpenModal(g);
}

function _wmOpenModal(g) {
    const modal = document.getElementById('modal-wysiwyg');
    const editor = document.getElementById('wm-editor');
    const bgInput = document.getElementById('wm-bg');
    const titleEl = document.getElementById('wysiwyg-modal-title');

    modal.classList.remove('hidden');
    if (titleEl) titleEl.textContent = g.name;
    editor.innerHTML = _wmSavedHtml;

    // Set editor base font from graphic's typography settings so new typing uses the right font
    const defaultFont = g.style?.typography?.fontFamily || 'Bahnschrift';
    const defaultFontSize = (g.style?.typography?.fontSize || 48) + 'px';
    const defaultLineHeight = g.style?.typography?.lineHeight || '1.1';

    editor.style.fontFamily = defaultFont;
    editor.style.fontSize = defaultFontSize;
    editor.style.lineHeight = defaultLineHeight;
    editor.style.textTransform = g.style?.typography?.textTransform || 'none';

    // Sync toolbar state
    const _syncToolbar = () => {
        const fontSel = document.getElementById('wm-font');
        const weightSel = document.getElementById('wm-weight');
        const sizeSel = document.getElementById('wm-size');
        const trackSel = document.getElementById('wm-tracking');
        const lhSel = document.getElementById('wm-line-height');
        const padInput = document.getElementById('wm-padding');
        const radInput = document.getElementById('wm-radius');

        if (!fontSel || !sizeSel) return;

        // Reset to base editor style if no specific span is selected
        fontSel.value = defaultFont;
        sizeSel.value = parseInt(defaultFontSize) || 48;
        if (weightSel) weightSel.value = g.style?.typography?.fontWeight || '400';
        if (lhSel) lhSel.value = defaultLineHeight;

        const styledEl = editor.querySelector('span[style]');
        if (styledEl) {
            if (styledEl.style.fontFamily && fontSel) {
                const ff = styledEl.style.fontFamily.replace(/['",]/g, '').trim();
                const matchOpt = [...fontSel.options].find(o => o.value.toLowerCase() === ff.toLowerCase() || o.text.toLowerCase() === ff.toLowerCase());
                if (matchOpt) fontSel.value = matchOpt.value;
            }
            if (styledEl.style.fontWeight && weightSel) {
                weightSel.value = styledEl.style.fontWeight;
            }
            if (styledEl.style.fontSize && sizeSel) {
                sizeSel.value = parseInt(styledEl.style.fontSize);
            }
            if (styledEl.style.letterSpacing && trackSel) {
                trackSel.value = styledEl.style.letterSpacing;
            }
            if (styledEl.style.padding && padInput) {
                padInput.value = parseInt(styledEl.style.padding) || 0;
            }
            if (styledEl.style.borderRadius && radInput) {
                radInput.value = parseInt(styledEl.style.borderRadius) || 0;
            }
        }
    };
    setTimeout(_syncToolbar, 50);

    const bgColor = g.style?.background?.color || '#0047ab';
    if (bgInput) bgInput.value = bgColor;
    const previewCanvas = document.getElementById('wm-preview-canvas');
    if (previewCanvas) previewCanvas.style.background = bgColor;

    // Scale modal preview — wrap is absolutely centred inside outer (overflow:hidden)
    const outer = document.getElementById('wm-preview-outer');
    const wrap = document.getElementById('wm-preview-wrap');
    if (outer && wrap && previewCanvas) {
        wrap.style.position = 'absolute';
        const doScale = () => {
            const ow = outer.offsetWidth || outer.clientWidth;
            const oh = outer.offsetHeight || outer.clientHeight;
            if (!ow || !oh) return;
            const scale = Math.min(ow / 1920, oh / 1080);
            const scaledW = Math.round(1920 * scale);
            const scaledH = Math.round(1080 * scale);
            wrap.style.width = scaledW + 'px';
            wrap.style.height = scaledH + 'px';
            wrap.style.left = Math.round((ow - scaledW) / 2) + 'px';
            wrap.style.top = Math.round((oh - scaledH) / 2) + 'px';
            previewCanvas.style.transform = `scale(${scale})`;
            previewCanvas.style.transformOrigin = 'top left';
        };
        if (_wmRo) _wmRo.disconnect();
        _wmRo = new ResizeObserver(doScale);
        _wmRo.observe(outer);
        setTimeout(doScale, 80);
    }
    setTimeout(() => { editor.focus(); _wmRefreshPreview(); }, 80);
}

let _wmDebounceTimer = null;
function _wmRefreshPreview(instant = true) {
    clearTimeout(_wmDebounceTimer);
    _wmDebounceTimer = setTimeout(() => {
        if (!_wmGraphicId) return;
        const canvas = document.getElementById('wm-preview-canvas');
        const editor = document.getElementById('wm-editor');
        if (!canvas || !editor || !window.__cgRenderer) return;
        const g = window._draftGraphics[_wmGraphicId] || state.graphics.find(g => g.id === _wmGraphicId);
        if (!g) return;
        const tempG = JSON.parse(JSON.stringify(g));

        if (_wmTargetField) {
            if (!tempG.fields) tempG.fields = {};
            tempG.fields[_wmTargetField] = editor.innerHTML;
            if (_wmTargetField === 'TITLE') {
                tempG.titleHtml = editor.innerHTML;
                tempG.title = editor.textContent;
            } else if (_wmTargetField === 'SUBTITLE') {
                tempG.subtitle = editor.textContent;
            }
        } else {
            if (tempG.type === 'TICKER') {
                const rawItems = editor.innerHTML.split(/<br\s*\/?>|<\/?div>|<\/?p>/i);
                tempG.items = rawItems.filter(s => s.replace(/&nbsp;/g, '').trim() !== '');
            } else {
                tempG.titleHtml = editor.innerHTML;
                tempG.title = editor.textContent;
            }
        }

        tempG.visible = true;
        window.__cgRenderer.renderPreview(canvas, [tempG], state.templates, state.settings, { instant: instant });
    }, 150); // fast 150ms debounce
}

function _wmClose(save) {
    const editor = document.getElementById('wm-editor');
    const modal = document.getElementById('modal-wysiwyg');
    if (!editor) return;
    if (save && _wmGraphicId) {
        saveWysiwyg(editor, _wmGraphicId);
    } else if (!save && _wmGraphicId) {
        // If they cancel, we just leave the draft as it was (from autosave drafting)
    }
    modal.classList.add('hidden');
    if (_wmRo) { _wmRo.disconnect(); _wmRo = null; }
    _wmGraphicId = null;
    _wmTargetField = null;
    
    // Refresh inspector correctly to show new html in richtext boxes
    if (save && selectedGraphicId) {
        openInspector(selectedGraphicId);
    }
}

function bindWysiwygModalEvents() {
    const editor = document.getElementById('wm-editor');
    if (!editor) return;

    document.querySelectorAll('#wm-toolbar [data-cmd]').forEach(btn => {
        btn.addEventListener('mousedown', e => {
            e.preventDefault();
            editor.focus();
            document.execCommand(btn.getAttribute('data-cmd'), false, null);
            _wmRefreshPreview();
        });
    });

    document.getElementById('wm-font')?.addEventListener('change', e => {
        editor.focus();
        _wmApplyStyleToSelection('fontFamily', e.target.value);
        _wmRefreshPreview();
    });

    document.getElementById('wm-weight')?.addEventListener('change', e => {
        editor.focus();
        _wmApplyStyleToSelection('fontWeight', e.target.value);
        _wmRefreshPreview();
    });

    document.getElementById('wm-size')?.addEventListener('change', e => {
        editor.focus();
        _wmApplyStyleToSelection('fontSize', e.target.value + 'px');
        _wmRefreshPreview();
    });

    document.getElementById('wm-tracking')?.addEventListener('change', e => {
        editor.focus();
        _wmApplyStyleToSelection('letterSpacing', e.target.value);
        _wmRefreshPreview();
    });

    document.querySelectorAll('#wm-toolbar [data-transform]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            editor.focus();
            _wmApplyStyleToSelection('textTransform', btn.getAttribute('data-transform'));
            _wmRefreshPreview();
        });
    });

    document.getElementById('wm-padding')?.addEventListener('input', e => {
        editor.focus();
        _wmApplyStyleToSelection('padding', `0 ${e.target.value}px`);
        _wmRefreshPreview();
    });

    document.getElementById('wm-radius')?.addEventListener('input', e => {
        editor.focus();
        _wmApplyStyleToSelection('borderRadius', `${e.target.value}px`);
        _wmRefreshPreview();
    });

    document.getElementById('wm-line-height')?.addEventListener('change', e => {
        editor.focus();
        _wmApplyLineHeight(e.target.value);
        _wmRefreshPreview();
    });

    document.getElementById('wm-color')?.addEventListener('input', e => {
        editor.focus();
        document.execCommand('foreColor', false, e.target.value);
        _wmRefreshPreview();
    });

    document.getElementById('wm-highlight')?.addEventListener('input', e => {
        editor.focus();
        _wmApplyStyleToSelection('backgroundColor', e.target.value);
        _wmApplyStyleToSelection('display', 'inline-block');
        _wmRefreshPreview();
    });

    document.getElementById('wm-bg')?.addEventListener('input', e => {
        const c = document.getElementById('wm-preview-canvas');
        if (c) c.style.background = e.target.value;
    });

    document.getElementById('wm-clear-all')?.addEventListener('click', () => {
        if (confirm('Czy na pewno chcesz wyczyścić całe formatowanie tekstu?')) {
            editor.focus();
            _wmClearAllFormatting();
            _wmRefreshPreview();
        }
    });

    document.getElementById('toggle-html-view')?.addEventListener('click', () => {
        const src = document.getElementById('wm-html-source');
        const btn = document.getElementById('toggle-html-view');
        if (src.style.display === 'none') { src.value = editor.innerHTML; src.style.display = 'block'; btn.textContent = '▼ Ukryj źródło HTML'; }
        else { editor.innerHTML = src.value; src.style.display = 'none'; btn.textContent = '▶ Pokaż źródło HTML'; _wmRefreshPreview(); }
    });

    editor.addEventListener('input', () => {
        _wmRefreshPreview();
        // Save to DRAFT ONLY — never touch state.graphics directly
        if (_wmGraphicId && previewGraphic && previewGraphic.id === _wmGraphicId) {
            const g = previewGraphic;
            if (_wmTargetField) {
                if (!g.fields) g.fields = {};
                g.fields[_wmTargetField] = editor.innerHTML;
                if (_wmTargetField === 'TITLE') {
                    g.titleHtml = editor.innerHTML;
                    g.title = editor.innerHTML.replace(/<[^>]+>/g, '');
                } else if (_wmTargetField === 'SUBTITLE') {
                    g.subtitle = editor.innerHTML.replace(/<[^>]+>/g, '');
                }
            } else {
                if (g.type === 'TICKER') {
                    const rawItems = editor.innerHTML.split(/<br\s*\/?>|<\/?div>|<\/?p>/i);
                    g.items = rawItems.filter(s => s.replace(/&nbsp;/g, '').trim() !== '');
                } else {
                    g.titleHtml = editor.innerHTML;
                    g.title = editor.innerHTML.replace(/<[^>]+>/g, '');
                }
            }
            // Store in draft — debounced so we're not thrashing
            clearTimeout(window._wysiwygDraftTimer);
            window._wysiwygDraftTimer = setTimeout(() => {
                window._draftGraphics[g.id] = JSON.parse(JSON.stringify(g));
                renderShotbox();
            }, 600);
        }
    });

    editor.addEventListener('keyup', () => {
        const src = document.getElementById('wm-html-source');
        if (src?.style.display !== 'none') src.value = editor.innerHTML;
    });
    // Intercept Enter key: insert <br> instead of letting browser create <div>/<p> blocks
    editor.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const br = document.createElement('br');
            range.insertNode(br);
            // Move cursor after the <br>
            range.setStartAfter(br);
            range.setEndAfter(br);
            sel.removeAllRanges();
            sel.addRange(range);
            _wmRefreshPreview();
        }
    });

    document.getElementById('wysiwyg-save')?.addEventListener('click', () => _wmClose(true));
    document.getElementById('wysiwyg-cancel')?.addEventListener('click', () => _wmClose(false));
    document.getElementById('wysiwyg-modal-close')?.addEventListener('click', () => _wmClose(false));
}

function _wmApplyLineHeight(lh) {
    const editor = document.getElementById('wm-editor');
    if (!editor) return;

    editor.style.lineHeight = lh;

    // Persist to graphic style immediately so it survives refresh/save
    if (_wmGraphicId) {
        const g = state.graphics.find(g => g.id === _wmGraphicId);
        if (g) {
            if (!g.style) g.style = {};
            if (!g.style.typography) g.style.typography = {};
            g.style.typography.lineHeight = lh;
        }
    }

    // Also apply to any existing block-level children (if any)
    editor.querySelectorAll('div, p').forEach(el => {
        el.style.lineHeight = lh;
    });
}

function _wmApplyStyleToSelection(property, value) {
    const editor = document.getElementById('wm-editor');
    const selection = window.getSelection();

    // Helper: get the camelCase property name for a CSS property
    const toCamel = p => p.replace(/-([a-z])/g, (_, l) => l.toUpperCase());
    const propCamel = toCamel(property);

    const range = selection.getRangeAt(0);

    // If selection is collapsed, only apply to whole content if it's completely empty
    if (range.collapsed) {
        if (editor.textContent.trim() === '') {
            editor.style[propCamel] = value;
            return;
        }
        // Otherwise do nothing - user should select text
        return;
    }

    // Check if the selection exactly matches an existing span ancestor
    let ancestor = range.commonAncestorContainer;
    if (ancestor.nodeType === Node.TEXT_NODE) ancestor = ancestor.parentNode;

    let existingSpan = null;
    let el = ancestor;
    while (el && el !== editor) {
        if (el.tagName === 'SPAN' && el.style[propCamel]) {
            // Check if this span's content is exactly what is selected
            const spanRange = document.createRange();
            spanRange.selectNodeContents(el);
            if (range.compareBoundaryPoints(Range.START_TO_START, spanRange) === 0 &&
                range.compareBoundaryPoints(Range.END_TO_END, spanRange) === 0) {
                existingSpan = el;
                break;
            }
        }
        el = el.parentNode;
    }

    if (existingSpan) {
        existingSpan.style[propCamel] = value;
        existingSpan.querySelectorAll('span').forEach(child => {
            child.style[propCamel] = value;
        });
        return;
    }

    // Wrap selection in a new span with the style
    const span = document.createElement('span');
    span.style[propCamel] = value;

    try {
        range.surroundContents(span);
    } catch (e) {
        // Range crosses element boundaries — extract and re-wrap
        const fragment = range.extractContents();
        // If the fragment only contains one span child, update it instead of nesting
        if (fragment.childNodes.length === 1 && fragment.firstChild.tagName === 'SPAN') {
            fragment.firstChild.style[propCamel] = value;
            range.insertNode(fragment);
        } else {
            span.appendChild(fragment);
            range.insertNode(span);
        }
    }

    selection.removeAllRanges();
}

function _wmClearAllFormatting() {
    const editor = document.getElementById('wm-editor');
    if (!editor) return;

    // 1. execCommand removeFormat clears bold/italic/etc
    document.execCommand('removeFormat', false, null);

    // 2. Custom clear: recursively strip all <span> and <font> tags while keeping text
    const stripTags = (root) => {
        const children = [...root.childNodes];
        children.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'SPAN' || node.tagName === 'FONT') {
                    // Extract text contents and replace the tag
                    const frag = document.createDocumentFragment();
                    while (node.firstChild) frag.appendChild(node.firstChild);
                    node.replaceWith(frag);
                    // Continue stripping on the new children
                    stripTags(root);
                } else if (node.hasChildNodes()) {
                    stripTags(node);
                }
            }
        });
    };

    stripTags(editor);

    // 3. Reset editor base styles to defaults
    editor.style.fontWeight = 'normal';
    editor.style.fontStyle = 'normal';
    editor.style.textDecoration = 'none';
    editor.style.backgroundColor = 'transparent';
    editor.style.letterSpacing = 'normal';
    editor.style.textTransform = 'none';
    editor.style.padding = '0';
    editor.style.borderRadius = '0';
    editor.style.display = 'block';
}

// ===========================================================
// 9. TEMPLATE EDITOR
// ===========================================================
function renderTemplateList() {
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
                <button data-export-id="${tpl.id}" title="Eksportuj do JSON" class="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-600/20 text-blue-400 rounded transition-all">
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
function exportTemplate(id) {
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) return;

    const dataStr = JSON.stringify(tpl, null, 2);
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
function importTemplate(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!imported.name || (!imported.html_template && !imported.css_template)) {
                alert('Nieprawidłowy format pliku szablonu.');
                return;
            }
            const newTpl = { ...imported, id: crypto.randomUUID(), name: imported.name + ' (Imported)' };
            state.templates.push(newTpl);
            saveState();
            renderTemplateList();
            openTemplateEditor(newTpl.id);
            alert('Szablon został pomyślnie zaimportowany!');
        } catch (err) {
            console.error('Import error:', err);
            alert('Błąd podczas importowania pliku JSON.');
        }
    };
    reader.readAsText(file);
}

async function importOCGTemplates(files) {
    let count = 0;

    const readFileAsText = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const text = await readFileAsText(file);
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
                        const regex = new RegExp(`(<[^>]*id=["']${input.id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}["'][^>]*>)(\\s*)(<\\/[^>]+>)`, 'g');
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
                                newRules = newRules.replace(new RegExp(`width:\\s*${w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')};?`, 'gi'), 'width: var(--v-width, 100%);');
                            } else {
                                newRules = newRules.replace(/width:\s*100%;?/gi, 'width: var(--v-width, 100%);');
                            }
                            if (h && pxH !== null && pxH !== 1080) {
                                newRules = newRules.replace(new RegExp(`height:\\s*${h.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')};?`, 'gi'), 'height: var(--v-height, 100%);');
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
            alert(`Zaimportowano ${count} szablonów OCG! Automatyczne poprawki kompatybilności zostały zastosowane.`);
        } else {
            alert('Nie znaleziono prawidłowych szablonów OCG w wybranych plikach.');
        }
    } catch (err) {
        console.error('OCG Import error:', err);
        alert('Błąd podczas importowania plików OCG JSON.');
    }
}

function exportOCGTemplate(templateId) {
    const tpl = state.templates.find(t => t.id === templateId);
    if (!tpl) return;

    const ocgTpl = {
        id: tpl.id,
        name: tpl.name.replace(' (OCG)', ''),
        type: tpl.type,
        html: tpl.html_template,
        css: tpl.css_template,
        js: tpl.js_template,
        inputs: tpl.ocgInputs || []
    };

    // If it doesn't have ocgInputs but has defaultFields, try to infer?
    // For now, only export what was imported as OCG or manually added as OCG-compatible.
    
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

function openTemplateEditor(id) {
    currentTemplateId = id;
    const tpl = state.templates.find(t => t.id === id);
    if (!tpl) return;

    renderTemplateList();

    document.getElementById('tpl-editor-empty').classList.add('hidden');
    const main = document.getElementById('tpl-editor-main');
    main.classList.remove('hidden');
    main.classList.add('flex');

    document.getElementById('tpl-name-input').value = tpl.name;
    currentTemplateTab = currentTemplateTab || 'html';
    updateTemplateEditorTab();
}

function updateTemplateEditorTab() {
    const tpl = state.templates.find(t => t.id === currentTemplateId);
    if (!tpl) return;

    const editor = document.getElementById('tpl-code-editor');
    const builderWrapper = document.getElementById('fields-builder-wrapper');

    if (currentTemplateTab === 'vars') {
        // Show builder, hide textarea
        editor.classList.add('hidden');
        if (builderWrapper) {
            builderWrapper.classList.remove('hidden');
            builderWrapper.classList.add('flex');
        }
        renderFieldsBuilder(tpl);
    } else {
        // Show textarea, hide builder
        editor.classList.remove('hidden');
        if (builderWrapper) {
            builderWrapper.classList.add('hidden');
            builderWrapper.classList.remove('flex');
        }

        const valMap = { html: tpl.html_template, css: tpl.css_template, js: tpl.js_template };
        editor.value = valMap[currentTemplateTab] || '';

        const colorMap = { html: '#fde68a', css: '#93c5fd', js: '#fdba74' };
        editor.style.color = colorMap[currentTemplateTab];
    }

    // Update tab styles
    document.querySelectorAll('.tpl-tab').forEach(tab => {
        const t = tab.getAttribute('data-tab');
        tab.classList.remove('active');
        if (t === currentTemplateTab) tab.classList.add('active');
    });
}

function saveCurrentTemplate() {
    const tpl = state.templates.find(t => t.id === currentTemplateId);
    if (!tpl) return;
    const nameInput = document.getElementById('tpl-name-input');
    tpl.name = nameInput.value || tpl.name;

    if (currentTemplateTab === 'vars') {
        // Collect rows from the fields builder
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
        const editor = document.getElementById('tpl-code-editor');
        const fieldMap = { html: 'html_template', css: 'css_template', js: 'js_template' };
        tpl[fieldMap[currentTemplateTab]] = editor.value;
    }

    saveState();
    renderTemplateList();

    const btn = document.getElementById('btn-save-template');
    btn.textContent = '✓ Zapisano!';
    btn.classList.replace('bg-blue-600', 'bg-green-600');
    setTimeout(() => {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Zapisz`;
        btn.classList.replace('bg-green-600', 'bg-blue-600');
    }, 2000);
}

// ===========================================================
// 9a. FIELDS BUILDER (Variable Definition System)
// ===========================================================
function renderFieldsBuilder(tpl) {
    const container = document.getElementById('fields-builder-container');
    if (!container) return;
    container.innerHTML = '';
    const inputs = tpl.ocgInputs || [];
    inputs.forEach(inp => addFieldRow(inp.id, inp.label, inp.default, inp.type));
    refreshFieldsBuilderEmptyState();
}

function addFieldRow(idVal = '', labelVal = '', defVal = '', typeVal = 'text') {
    const container = document.getElementById('fields-builder-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'field-builder-row grid gap-2 items-center bg-[#111827] border border-gray-800 rounded px-3 py-2 hover:border-gray-700 transition-colors';
    row.style.gridTemplateColumns = '1fr 1.3fr 2fr 1fr auto';

    const typeOptions = [
        { value: 'text',     label: 'Krótki tekst' },
        { value: 'richtext', label: 'Edytor tekstu' },
        { value: 'list',     label: 'Lista (JSON)' },
    ];
    const typeSelectHtml = typeOptions.map(o =>
        `<option value="${o.value}" ${typeVal === o.value ? 'selected' : ''}>${o.label}</option>`
    ).join('');

    row.innerHTML = `
        <input type="text" class="f-id w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] font-mono text-yellow-300 focus:outline-none focus:border-yellow-500 placeholder-gray-600" placeholder="np. f-tytul" value="${escAttr(idVal)}">
        <input type="text" class="f-label w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] text-gray-200 focus:outline-none focus:border-blue-500 placeholder-gray-600" placeholder="Wyświetlana nazwa" value="${escAttr(labelVal)}">
        <input type="text" class="f-def w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] text-gray-400 focus:outline-none focus:border-blue-500 placeholder-gray-600" placeholder="Wartość domyślna" value="${escAttr(defVal)}">
        <select class="f-type w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-[10px] text-blue-400 focus:outline-none focus:border-blue-500 appearance-none">${typeSelectHtml}</select>
        <button class="field-row-delete w-7 h-7 rounded flex items-center justify-center bg-red-900/30 hover:bg-red-700 text-red-400 hover:text-white border border-red-900/50 transition-all text-sm shrink-0" title="Usuń zmienną">&times;</button>
    `;

    row.querySelector('.field-row-delete').addEventListener('click', () => {
        row.remove();
        refreshFieldsBuilderEmptyState();
    });

    container.appendChild(row);
    refreshFieldsBuilderEmptyState();
}

function refreshFieldsBuilderEmptyState() {
    const container = document.getElementById('fields-builder-container');
    const emptyMsg = document.getElementById('fields-builder-empty');
    if (!container || !emptyMsg) return;
    const hasRows = container.querySelectorAll('.field-builder-row').length > 0;
    emptyMsg.classList.toggle('hidden', hasRows);
    container.classList.toggle('hidden', !hasRows);
}

// ===========================================================
// 10. TEMPLATE SELECTOR MODAL
// ===========================================================
function openTemplateSelectorModal() {
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

function createGraphicFromTemplate(templateIdOrTpl) {
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
        titleHtml: tpl.defaultFields?.title || tpl.name,
        subtitle: tpl.defaultFields?.subtitle || '',
        items: tpl.defaultFields?.items || [],
        speed: tpl.defaultFields?.speed !== undefined ? tpl.defaultFields.speed : 100,
        fields: (() => {
            const f = tpl.defaultFields ? JSON.parse(JSON.stringify(tpl.defaultFields)) : {};
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
    renderShotbox();
    setPreviewGraphic(JSON.parse(JSON.stringify(newG)));
    openInspector(newG.id);
}

// ===========================================================
// 11. HELPER FUNCTIONS
// ===========================================================
function ctrlLabel(text) {
    return `<label class="block text-[9px] text-gray-500 uppercase font-semibold mb-1" > ${text}</label> `;
}

function colorPickerHtml(field, value) {
    return `<div class="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded p-1" >
    <input type="color" data-field="${field}" value="${value}" class="h-6 w-8 rounded bg-transparent cursor-pointer border-none p-0 shrink-0">
        <input type="text" data-field="${field}" value="${value}" class="color-hex-input bg-transparent text-[10px] font-mono flex-1 focus:outline-none text-gray-300 min-w-0">
        </div>`;
}

function animTypeSelect(field, value, animDir = '') {
    const opts = [
        ['slide', '⇔ Przesunięcie (Slide)'],
        ['fade', '◐ Zanikanie (Fade)'],
        ['zoom', '⊕ Zoom'],
        ['wipe', '▶ Wipe'],
        ['none', '✕ Brak (Cut)'],
    ];
    // onchange re-opens inspector so direction buttons update
    const onChange = animDir ? `onchange="(function(sel){var g=window._draftGraphics[selectedGraphicId]||state.graphics.find(g=>g.id===selectedGraphicId);if(g){g=JSON.parse(JSON.stringify(g));deepSet(g, '${field}', sel.value);window._draftGraphics[selectedGraphicId]=g;if(previewGraphic?.id===selectedGraphicId)Object.assign(previewGraphic,g);window.refreshPreviewMonitor();window.renderShotbox();window.openInspector(g.id);};})(this)"` : '';
    return `<select data-field="${field}" ${onChange} class="w-full bg-gray-800 border border-gray-700 rounded h-7 text-[10px] px-2 focus:border-blue-500 focus:outline-none">
            ${opts.map(([v, l]) => `<option value="${v}" ${value === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>`;
}

function directionBtns(field, value, color, animType) {
    const dirs = [['left', '←'], ['right', '→'], ['top', '↑'], ['bottom', '↓']];
    const colorMap = {
        blue: { active: 'background:#2563eb;border-color:#3b82f6;color:#fff;', inactive: 'background:#1f2937;border-color:#374151;color:#9ca3af;' },
        orange: { active: 'background:#c2410c;border-color:#f97316;color:#fff;', inactive: 'background:#1f2937;border-color:#374151;color:#9ca3af;' },
        green: { active: 'background:#15803d;border-color:#22c55e;color:#fff;', inactive: 'background:#1f2937;border-color:#374151;color:#9ca3af;' },
    };
    const c = colorMap[color] || colorMap.blue;
    const hasDirection = !animType || ['slide', 'wipe'].includes(animType);
    const wrapStyle = hasDirection
        ? 'display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:4px;'
        : 'display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:4px;opacity:0.3;pointer-events:none;';
    return `<div style="${wrapStyle}">
            ${dirs.map(([v, l]) => `<button data-dir-field="${field}" data-dir-value="${v}" style="height:28px;border-radius:4px;font-size:14px;font-weight:bold;border:1px solid;cursor:pointer;transition:all .1s;${value === v ? c.active : c.inactive}">${l}</button>`).join('')}
        </div>`;
}

function easingSelect(field, value, isOut = false) {
    const opts = [
        ['linear', 'Linear'],
        ['ease-out', 'Ease Out' + (!isOut ? ' ✓' : '')],
        ['ease-in', 'Ease In' + (isOut ? ' ✓' : '')],
        ['ease-in-out', 'Ease In-Out'],
        ['cubic-bezier(0.2, 0.8, 0.2, 1)', 'Smooth'],
        ['cubic-bezier(0.34, 1.56, 0.64, 1)', 'Spring — z odbiciem'],
        ['cubic-bezier(0.68, -0.55, 0.27, 1.55)', 'Bounce'],
        ['steps(4, end)', 'Steps'],
    ];
    return `<select data-field="${field}" class="w-full bg-gray-800 border border-gray-700 rounded h-7 text-[10px] px-2 focus:border-blue-500 focus:outline-none">
            ${opts.map(([v, l]) => `<option value="${v}" ${value === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>`;
}

function escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function deepSet(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

// Simple preview renderer (calls renderer.js logic)
// renderer.js exposes window.__cgRenderer after loading
function ensurePreviewRenderer() {
    if (!window.__cgRenderer) {
        // fallback noop
        window.__cgRenderer = { renderPreview: () => { } };
    }
}

// ===========================================================
// 12. GLOBAL EVENT BINDINGS
// ===========================================================
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
    if (tabMain && tabAnim) {
        tabMain.onclick = () => {
            currentInspectorTab = 'main';
            document.getElementById('ins-tab-content-main')?.classList.remove('hidden');
            document.getElementById('ins-tab-content-anim')?.classList.add('hidden');
            tabMain.className = "flex-1 py-2 text-[10px] font-bold text-blue-400 border-b-2 border-blue-500 bg-gray-800/50 transition-colors";
            tabAnim.className = "flex-1 py-2 text-[10px] font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-300 transition-colors";
        };
        tabAnim.onclick = () => {
            currentInspectorTab = 'anim';
            if (selectedGraphicId && inspectorAccordionStates[selectedGraphicId]) {
                inspectorAccordionStates[selectedGraphicId].animation = true;
                openInspector(selectedGraphicId);
            }
            document.getElementById('ins-tab-content-main')?.classList.add('hidden');
            document.getElementById('ins-tab-content-anim')?.classList.remove('hidden');
            tabAnim.className = "flex-1 py-2 text-[10px] font-bold text-blue-400 border-b-2 border-blue-500 bg-gray-800/50 transition-colors";
            tabMain.className = "flex-1 py-2 text-[10px] font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-300 transition-colors";
        };
    }

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

            // Force a preview refresh if global font overrides the currently previewed graphic
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

    // Shadow Events
    const updateGlobalShadow = (field, value) => {
        if (!state.settings) state.settings = {};
        if (!state.settings.globalShadow) state.settings.globalShadow = { enabled: false, color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 0, offsetY: 2 };
        state.settings.globalShadow[field] = value;
        saveState();
        refreshPreviewMonitor(); // global shadow applies to all, so always refresh preview
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


    // Reset DB
    document.getElementById('reset-db-btn').onclick = async () => {
        if (!confirm('Zresetować DB do db.json? Wszystkie zmiany zostaną utracone.')) return;
        localStorage.removeItem(DB_KEY);
        const res = await fetch('db.json');
        state = await res.json();
        saveState();
        selectedGraphicId = null; previewGraphic = null;
        closeInspector();
        renderShotbox();
        renderTemplateList();
        updateProgramMonitor();
    };

    // Preview buttons
    document.getElementById('btn-edit-preview').onclick = () => {
        if (!previewGraphic) return;
        // Open inspector for preview graphic
        openInspector(previewGraphic.id);
    };

    document.getElementById('btn-update-active').onclick = () => {
        if (!previewGraphic) return;
        window.syncDraftGraphic(previewGraphic.id);
    };

    document.getElementById('btn-take-preview').onclick = () => {
        if (!previewGraphic) return;
        
        // Ensure any unsaved edits are synced first
        if (window._draftGraphics[previewGraphic.id]) {
            // we do sync but keep previewGraphic as is
            const draft = window._draftGraphics[previewGraphic.id];
            const idx = state.graphics.findIndex(g => g.id === draft.id);
            if (idx !== -1) state.graphics[idx] = JSON.parse(JSON.stringify(draft));
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
                selectedGraphicId = null;
                previewGraphic = null;
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

    // Inspector type change
    document.getElementById('inspector-type-select').onchange = (e) => {
        const g = state.graphics.find(g => g.id === selectedGraphicId);
        if (!g) return;
        g.type = e.target.value;
        saveState();
        openInspector(g.id);
    };

    // Inspector save
    document.getElementById('btn-save-graphic').onclick = () => {
        if (!previewGraphic) return;
        
        const draft = window._draftGraphics[previewGraphic.id];
        const g = state.graphics.find(x => x.id === previewGraphic.id);
        
        if (g && g.visible) {
            // Graphic is ON AIR. Do not commit state to avoid triggering an on-air reset.
            // The user must click "Synchr." (Sync) to push changes live.
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
                state.graphics[idx] = JSON.parse(JSON.stringify(draft));
                state.graphics[idx].visible = false;
                delete window._draftGraphics[draft.id];
            }
        } else if (g) {
            Object.assign(g, previewGraphic);
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

    // Inspector save as template
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
        
        newTpl.defaultFields = newTpl.defaultFields || {};
        Object.assign(newTpl.defaultFields, JSON.parse(JSON.stringify(g)));
        delete newTpl.defaultFields.id;
        delete newTpl.defaultFields.templateId;
        delete newTpl.defaultFields.visible;
        delete newTpl.defaultFields.groupId;
        
        if (g.style) newTpl.defaultStyle = JSON.parse(JSON.stringify(g.style));
        if (g.animation) newTpl.defaultAnimation = JSON.parse(JSON.stringify(g.animation));
        if (g.layout) newTpl.defaultLayout = JSON.parse(JSON.stringify(g.layout));
        if (g.wiper) newTpl.defaultFields.wiper = JSON.parse(JSON.stringify(g.wiper));

        state.templates.push(newTpl);
        saveState();
        renderTemplateList();
        
        const btn = document.getElementById('btn-ins-save-template');
        btn.innerHTML = '<span>✓ ZAPISANO</span>';
        setTimeout(() => {
            btn.innerHTML = '<span>ZAPISZ JAKO</span><span>SZABLON</span>';
        }, 2000);
    };

    // Inspector export JSON
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
        
        exportTpl.defaultFields = exportTpl.defaultFields || {};
        Object.assign(exportTpl.defaultFields, JSON.parse(JSON.stringify(g)));
        delete exportTpl.defaultFields.id;
        delete exportTpl.defaultFields.templateId;
        delete exportTpl.defaultFields.visible;
        delete exportTpl.defaultFields.groupId;

        if (g.style) exportTpl.defaultStyle = JSON.parse(JSON.stringify(g.style));
        if (g.animation) exportTpl.defaultAnimation = JSON.parse(JSON.stringify(g.animation));
        if (g.layout) exportTpl.defaultLayout = JSON.parse(JSON.stringify(g.layout));
        if (g.wiper) exportTpl.defaultFields.wiper = JSON.parse(JSON.stringify(g.wiper));
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportTpl, null, 2));
        const el = document.createElement('a');
        el.setAttribute("href", dataStr);
        el.setAttribute("download", `szablon_${g.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`);
        document.body.appendChild(el);
        el.click();
        el.remove();
    };

    // Inspector delete
    document.getElementById('btn-delete-graphic-ins').onclick = () => {
        if (!selectedGraphicId) return;
        const g = state.graphics.find(gfx => gfx.id === selectedGraphicId);
        if (!g) return;

        if (confirm(`Czy na pewno chcesz usunąć grafikę "${g.name}"?`)) {
            state.graphics = state.graphics.filter(gfx => gfx.id !== selectedGraphicId);
            const deletedId = selectedGraphicId;
            selectedGraphicId = null;
            closeInspector();

            if (previewGraphic?.id === deletedId) {
                setPreviewGraphic(null);
            }

            saveState();
            renderShotbox();
            updateProgramMonitor();
        }
    };

    // Template Editor
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
            tplFileInput.value = ''; // Reset
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
        currentTemplateId = null;
        saveState();
        renderTemplateList();
        document.getElementById('tpl-editor-main').classList.add('hidden');
        document.getElementById('tpl-editor-main').classList.remove('flex');
        document.getElementById('tpl-editor-empty').classList.remove('hidden');
    });

    document.querySelectorAll('.tpl-tab').forEach(tab => {
        tab.onclick = () => {
            // Save current tab content before switching
            if (currentTemplateId) {
                const tpl = state.templates.find(t => t.id === currentTemplateId);
                if (tpl) {
                    if (currentTemplateTab === 'vars') {
                        // Save fields builder state
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
                        const editor = document.getElementById('tpl-code-editor');
                        const fieldMap = { html: 'html_template', css: 'css_template', js: 'js_template' };
                        tpl[fieldMap[currentTemplateTab]] = editor.value;
                    }
                }
            }
            currentTemplateTab = tab.getAttribute('data-tab');
            updateTemplateEditorTab();
        };
    });

    // Bind fields builder 'Add Variable' button
    const btnAddFieldRow = document.getElementById('btn-add-field-row');
    if (btnAddFieldRow) btnAddFieldRow.onclick = () => addFieldRow();

    // Auto-save template code on edit
    document.getElementById('tpl-code-editor').oninput = () => {
        if (!currentTemplateId) return;
        const tpl = state.templates.find(t => t.id === currentTemplateId);
        if (!tpl) return;
        const fieldMap = { html: 'html_template', css: 'css_template', js: 'js_template' };
        tpl[fieldMap[currentTemplateTab]] = document.getElementById('tpl-code-editor').value;
        // Debounce save to not spam storage
        clearTimeout(window._tplSaveTimer);
        window._tplSaveTimer = setTimeout(() => saveState(), 800);
    };

    // Template name change
    document.getElementById('tpl-name-input').oninput = (e) => {
        if (!currentTemplateId) return;
        const tpl = state.templates.find(t => t.id === currentTemplateId);
        if (tpl) tpl.name = e.target.value;
    };

    // Inspector close button
    const closeInsBtn = document.getElementById('btn-close-inspector');
    if (closeInsBtn) {
        closeInsBtn.onclick = closeInspector;
    }
    
    // ==========================================
    // Database Management
    // ==========================================
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
                    // Minimalna weryfikacja poprawności struktury
                    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.templates) && Array.isArray(parsed.graphics)) {
                        state = parsed;
                        socket.emit('updateState', state); // Wymuszenie aktualizacji po stronie serwera
                        init(); // Przerenderowanie całego UI
                        alert('Baza Danych została poprawnie zaimportowana!');
                    } else {
                        throw new Error('Nieprawidłowy plik Bazy Danych');
                    }
                } catch (err) {
                    alert('Błąd importowania bazy: ' + err.message);
                }
                dbFileInput.value = ''; // Reset
            };
            reader.readAsText(file);
        });
    }
}

// ==========================================
// Ticker Quick Edit Modal Logic
// ==========================================

let tickerEditorGraphic = null;

window.openTickerEditor = function(id) {
    const graphic = window._draftGraphics[id] || state.graphics.find(g => g.id === id);
    if (!graphic) return;
    
    tickerEditorGraphic = JSON.parse(JSON.stringify(graphic)); // Deep copy for editing
    
    const modal = document.getElementById('modal-ticker-editor');
    const subtitle = document.getElementById('ticker-editor-subtitle');
    
    if (!modal) return;
    
    subtitle.textContent = `${graphic.name} // ${graphic.id}`;
    modal.classList.remove('hidden');
    
    renderTickerEditorBody();
};

window.renderTickerEditorBody = function() {
    const body = document.getElementById('ticker-editor-body');
    if (!body) return;
    body.innerHTML = '';
    
    // Group messages by category
    const categoriesMap = new Map();
    const items = tickerEditorGraphic.items || [];
    
    items.forEach((item, index) => {
        const text = typeof item === 'object' ? (item.text || "") : item;
        const cat = (typeof item === 'object' && item.category) ? item.category : 'BRAK KATEGORII';
        
        if (!categoriesMap.has(cat)) categoriesMap.set(cat, []);
        categoriesMap.get(cat).push(text);
    });

    if (categoriesMap.size === 0) {
        categoriesMap.set('INFORMACJE', ['']);
    }

    categoriesMap.forEach((messages, catName) => {
        const groupCard = document.createElement('div');
        groupCard.className = 'ticker-group-card shadow-lg hover:shadow-orange-900/10';
        groupCard.dataset.category = catName;
        
        groupCard.innerHTML = `
            <div class="ticker-group-header cursor-move">
                <div class="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                <input type="text" class="ticker-group-title-input transition-all focus:pl-3" value="${catName === 'BRAK KATEGORII' ? '' : catName}" 
                    placeholder="NAZWA KATEGORII (np. PILNE, SPORT, POGODA)" 
                    oninput="updateTickerGroupName(this)">
                <button onclick="removeTickerGroup(this)" class="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Usuń grupę">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
            </div>
            <div class="ticker-item-list space-y-2 mt-2" data-group="${catName}">
                ${messages.map((text, idx) => `
                    <div class="ticker-message-item group items-start">
                        <div class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-3 group-hover:scale-125 transition-transform shadow-[0_0_5px_#3b82f6]"></div>
                        <textarea class="ticker-message-input custom-scrollbar resize-y max-h-48 whitespace-pre-wrap" rows="2" placeholder="Wpisz treść wiadomości...">${text}</textarea>
                        <button class="ticker-item-remove p-1 mt-1 hover:bg-red-500/20 rounded transition-all" onclick="removeTickerMessageItem(this)" title="Usuń wiadomość">&times;</button>
                    </div>
                `).join('')}
                <div class="pt-2 flex justify-center add-message-btn-wrapper">
                    <button class="add-message-btn w-full py-2 border-dashed border-2 opacity-60 hover:opacity-100 transition-opacity" onclick="addMessageToGroup(this)">+ DODAJ WIADOMOŚĆ</button>
                </div>
            </div>
        `;
        body.appendChild(groupCard);
    });

    // Initialize Sortable for each message list
    if (window.Sortable) {
        body.querySelectorAll('.ticker-item-list').forEach(list => {
            Sortable.create(list, {
                group: 'ticker-messages',
                animation: 150,
                ghostClass: 'sortable-ghost',
                dragClass: 'sortable-drag',
                draggable: '.ticker-message-item',
                onEnd: () => {
                    // DOM is truth here
                }
            });
        });

        // Initialize Sortable for categories themselves
        Sortable.create(body, {
            animation: 150,
            handle: '.ticker-group-header',
            ghostClass: 'opacity-20'
        });
    }
};

window.updateTickerGroupName = function(input) {
    const card = input.closest('.ticker-group-card');
    const list = card.querySelector('.ticker-item-list');
    const newName = input.value.trim() || 'BRAK KATEGORII';
    card.dataset.category = newName;
    list.dataset.group = newName;
};

window.addMessageToGroup = function(btn) {
    const wrapper = btn.closest('.add-message-btn-wrapper');
    const list = btn.closest('.ticker-item-list');
    
    const newItem = document.createElement('div');
    newItem.className = 'ticker-message-item group';
    newItem.innerHTML = `
        <div class="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-3 group-hover:scale-125 transition-transform shadow-[0_0_5px_#3b82f6]"></div>
        <textarea class="ticker-message-input custom-scrollbar resize-y max-h-48 whitespace-pre-wrap" rows="2" placeholder="Wpisz treść wiadomości..."></textarea>
        <button class="ticker-item-remove p-1 mt-1 hover:bg-red-500/20 rounded transition-all" onclick="removeTickerMessageItem(this)" title="Usuń wiadomość">&times;</button>
    `;
    list.insertBefore(newItem, wrapper);
    newItem.querySelector('textarea').focus();
};

window.removeTickerMessageItem = function(el) {
    el.closest('.ticker-message-item').remove();
};

window.removeTickerGroup = function(el) {
    if (confirm('Czy na pewno chcesz usunąć całą grupę wraz z wiadomościami?')) {
        el.closest('.ticker-group-card').remove();
    }
};

window.addTickerGroup = function() {
    const body = document.getElementById('ticker-editor-body');
    if (!body) return;
    const catName = "NOWA KATEGORIA";
    
    const groupCard = document.createElement('div');
    groupCard.className = 'ticker-group-card shadow-lg';
    groupCard.dataset.category = catName;
    
    groupCard.innerHTML = `
        <div class="ticker-group-header cursor-move">
            <div class="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-lg shadow-orange-900/40"></div>
            <input type="text" class="ticker-group-title-input" value="${catName}" 
                placeholder="NAZWA KATEGORII" 
                oninput="updateTickerGroupName(this)">
            <button onclick="removeTickerGroup(this)" class="p-2 text-gray-600 hover:text-red-500 rounded-lg transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
        </div>
        <div class="ticker-item-list space-y-2 mt-2" data-group="${catName}">
            <div class="pt-2 flex justify-center add-message-btn-wrapper">
                <button class="add-message-btn w-full py-2 border-dashed border-2 opacity-60 hover:opacity-100 transition-opacity" onclick="addMessageToGroup(this)">+ DODAJ WIADOMOŚĆ</button>
            </div>
        </div>
    `;
    body.appendChild(groupCard);
    
    if (window.Sortable) {
        const list = groupCard.querySelector('.ticker-item-list');
        Sortable.create(list, {
            group: 'ticker-messages',
            animation: 150,
            ghostClass: 'sortable-ghost',
            draggable: '.ticker-message-item'
        });
    }
    
    const input = groupCard.querySelector('input');
    input.select();
    body.scrollTop = body.scrollHeight;
};

window.closeTickerEditor = function() {
    const modal = document.getElementById('modal-ticker-editor');
    if (modal) modal.classList.add('hidden');
    tickerEditorGraphic = null;
};

window.saveTickerEditor = function() {
    if (!tickerEditorGraphic) return;
    
    const body = document.getElementById('ticker-editor-body');
    const groupCards = Array.from(body.querySelectorAll('.ticker-group-card'));
    
    const newItems = [];
    
    groupCards.forEach(card => {
        const categoryInput = card.querySelector('.ticker-group-title-input');
        const category = categoryInput.value.trim() || "";
        
        const messageInputs = Array.from(card.querySelectorAll('.ticker-message-input'));
        messageInputs.forEach(input => {
            const text = input.value.trim();
            if (text) {
                newItems.push({
                    text: text,
                    category: category
                });
            }
        });
    });
    
    // Update the real graphic in state
    const realId = tickerEditorGraphic.id;
    let g = window._draftGraphics[realId] || state.graphics.find(gx => gx.id === realId);
    
    if (g) {
        g = JSON.parse(JSON.stringify(g));
        g.items = newItems;
        window._draftGraphics[realId] = g;
        
        if (previewGraphic && previewGraphic.id === realId) {
            Object.assign(previewGraphic, g);
            refreshPreviewMonitor();
        }
        
        renderShotbox();
        
        if (selectedGraphicId === realId) {
            openInspector(realId);
        }
    }
    
    closeTickerEditor();
};

function bindTickerEditorEvents() {
    const btnCancel = document.getElementById('ticker-editor-cancel');
    const btnSave = document.getElementById('ticker-editor-save');
    const btnAddGroup = document.getElementById('ticker-editor-add-group');
    
    if (btnCancel) btnCancel.onclick = window.closeTickerEditor;
    if (btnSave) btnSave.onclick = window.saveTickerEditor;
    if (btnAddGroup) btnAddGroup.onclick = window.addTickerGroup;
}

// ===========================================================
// START
// ===========================================================
ensurePreviewRenderer();
init();