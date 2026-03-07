// ======================================================
// CG Control Pro — Main Application Logic
// Vanilla JS port of VinciFlow Studio
// ======================================================

const socket = io();
let state = { templates: [], graphics: [], groups: [], settings: {} };

let selectedGraphicId = null;   // graphic being inspected
let previewGraphic = null;      // copy of graphic in preview monitor

let currentPage = 'dashboard'; // 'dashboard' | 'templates'
let currentTemplateId = null;
let currentTemplateTab = 'html';
let inspectorAccordionStates = {}; // graphicId -> { accordionId -> isOpen }

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
        document.getElementById('loading-overlay').classList.add('hidden');

        document.getElementById('btn-toggle-safe-area')?.addEventListener('click', (e) => {
            document.querySelectorAll('.ebu-safe-area').forEach(el => {
                el.classList.toggle('hidden');
            });
            e.currentTarget.classList.toggle('text-white');
            e.currentTarget.classList.toggle('bg-blue-600');
        });
    });

    socket.on('stateUpdated', (newState) => {
        state = newState;
        renderShotbox();
        if (selectedGraphicId) {
            refreshInspector(selectedGraphicId);
        }
    });
}
// 2. STATE
// ===========================================================
function saveState() {
    socket.emit('updateState', state);
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

// --- Render Shotbox ---
function renderShotbox() {
    ensureGroups();
    const grid = document.getElementById('shotbox-grid');
    grid.innerHTML = '';

    // Sort: grouped items first (by group order), then ungrouped
    const sortedGraphics = [...state.graphics].sort((a, b) => {
        const ga = a.groupId ? state.groups.findIndex(g => g.id === a.groupId) : 9999;
        const gb = b.groupId ? state.groups.findIndex(g => g.id === b.groupId) : 9999;
        if (ga !== gb) return ga - gb;
        return state.graphics.indexOf(a) - state.graphics.indexOf(b);
    });

    let lastGroupId = '__none__';

    sortedGraphics.forEach((graphic) => {
        const tpl = state.templates.find(t => t.id === graphic.templateId);
        const isActive = graphic.visible;
        const isPreview = previewGraphic?.id === graphic.id;
        const grp = getGroupForGraphic(graphic);

        // --- Group header ---
        if (graphic.groupId && graphic.groupId !== lastGroupId) {
            lastGroupId = graphic.groupId;
            const groupGraphics = state.graphics.filter(g => g.groupId === graphic.groupId);
            const anyOn = groupGraphics.some(g => g.visible);

            const header = document.createElement('div');
            header.className = 'col-span-3 flex items-center gap-2 px-2 py-1.5 rounded-md mt-1';
            header.style.background = grp ? grp.color + '18' : '#1f293718';
            header.style.borderLeft = `4px solid ${grp?.color || '#555'}`;
            header.innerHTML = `
                <span class="text-[10px] font-bold uppercase tracking-wider flex-1 truncate" style="color:${grp?.color || '#aaa'}">${grp?.name || 'Grupa'}</span>
                <span class="text-[9px] text-gray-500">${groupGraphics.length} el.</span>
                <button data-group-take="${graphic.groupId}" class="text-[9px] px-3 py-1 rounded font-bold uppercase transition-all
                    ${anyOn ? 'bg-red-600/30 text-red-400 border border-red-600/30' : 'bg-gray-800 text-gray-400 hover:bg-blue-700/30 hover:text-white'}">
                    ${anyOn ? 'WSZYSTKIE OFF' : 'WSZYSTKIE ON'}
                </button>
            `;
            grid.appendChild(header);
        } else if (!graphic.groupId && lastGroupId !== '__none__') {
            lastGroupId = '__none__';
        }

        // --- Card ---
        const card = document.createElement('div');
        card.className = `shotbox-card cursor-pointer rounded-lg border p-3 relative group flex flex-col gap-2
            ${isActive ? 'border-red-500 bg-red-900/10 shadow-[0_0_10px_rgba(239,68,68,0.15)]' :
                isPreview ? 'border-green-500 bg-green-900/10 shadow-[0_0_10px_rgba(34,197,94,0.15)]' :
                    'border-gray-800 bg-gray-900 hover:border-gray-600'}`;

        // Colored left border for grouped items
        if (grp) {
            card.style.borderLeftWidth = '4px';
            card.style.borderLeftColor = grp.color;
        }

        // Action buttons
        const actionBtns = `
            <div class="absolute top-1.5 right-1.5 flex gap-0.5 transition-all">
                <button data-copy-id="${graphic.id}" title="Kopiuj" class="w-5 h-5 rounded flex items-center justify-center bg-gray-800 hover:bg-blue-900/60 text-gray-500 hover:text-blue-400 text-[10px] leading-none">📋</button>
                <button data-delete-id="${graphic.id}" title="Usuń" class="w-5 h-5 rounded flex items-center justify-center bg-gray-800 hover:bg-red-900/60 text-gray-500 hover:text-red-400 text-xs leading-none">&times;</button>
            </div>`;

        // Group selector dropdown
        const groupOptions = state.groups.map(g =>
            `<option value="${g.id}" ${graphic.groupId === g.id ? 'selected' : ''}>${g.name}</option>`
        ).join('');

        card.innerHTML = `
            ${actionBtns}
            ${isActive ? `<div class="absolute top-1.5 left-1.5 flex items-center gap-1"><div class="w-2 h-2 bg-red-500 rounded-full animate-pulse-slow"></div><span class="text-[9px] font-bold text-red-500">ON AIR</span></div>` : ''}
            <div class="mt-3">
                <p class="text-xs font-bold text-white truncate leading-tight">${graphic.name}</p>
                <p class="text-[9px] text-gray-500 font-mono truncate">${tpl ? tpl.type : '?'}${grp ? ` · ${grp.name}` : ''}</p>
            </div>
            <div class="flex gap-1 mt-auto">
                <button data-preview-id="${graphic.id}" class="flex-1 text-[9px] py-1 rounded font-bold uppercase transition-all
                    ${isPreview ? 'bg-green-600/30 text-green-400 border border-green-600/30' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}">
                    PREVIEW
                </button>
                <button data-take-id="${graphic.id}" class="flex-1 text-[9px] py-1 rounded font-bold uppercase transition-all
                    ${isActive ? 'bg-red-600/30 text-red-400 border border-red-600/30' : 'bg-gray-800 text-gray-400 hover:bg-blue-700/30 hover:text-white'}">
                    ${isActive ? 'OFF AIR' : 'ON AIR'}
                </button>
            </div>
            <select data-group-assign="${graphic.id}" class="w-full bg-gray-800 border border-gray-700 rounded text-[9px] text-gray-400 py-0.5 px-1 focus:outline-none focus:border-blue-500 mt-0.5" title="Grupa">
                <option value="">— brak grupy —</option>
                ${groupOptions}
                <option value="__new__">＋ Nowa grupa…</option>
            </select>
        `;

        grid.appendChild(card);
    });

    // ---- Bind all shotbox events ----

    // Preview
    grid.querySelectorAll('[data-preview-id]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const g = state.graphics.find(g => g.id === btn.getAttribute('data-preview-id'));
            if (g) setPreviewGraphic(JSON.parse(JSON.stringify(g)));
        });
    });

    // Take (single)
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

    // Delete
    grid.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.getAttribute('data-delete-id');
            if (confirm('Usunąć tę grafikę?')) {
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
        });
    });

    // Copy
    grid.querySelectorAll('[data-copy-id]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            copyGraphic(btn.getAttribute('data-copy-id'));
        });
    });

    // Group take all
    grid.querySelectorAll('[data-group-take]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const gid = btn.getAttribute('data-group-take');
            const anyOn = state.graphics.filter(g => g.groupId === gid).some(g => g.visible);
            groupTakeAll(gid, !anyOn);
        });
    });

    // Group assign
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

    updateProgramMonitor();
}

// ===========================================================
// 6. PREVIEW MONITOR
// ===========================================================
function setPreviewGraphic(graphic) {
    previewGraphic = graphic;
    refreshPreviewMonitor();
    refreshPreviewControls();
    renderShotbox();
}

function refreshPreviewMonitor() {
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
        onAirLabel.textContent = 'ON AIR: 0 LAYERS';
        programEmpty?.classList.remove('hidden');
    } else {
        layersLabel?.classList.remove('hidden');
        if (layersCount) layersCount.textContent = n;
        onAirLabel.textContent = `ON AIR: ${n} ACTIVE`;
        programEmpty?.classList.add('hidden');
    }
}

// ===========================================================
// 8. INSPECTOR PANEL
// ===========================================================
function closeInspector() {
    document.getElementById('inspector-empty').classList.remove('hidden');
    document.getElementById('inspector-content').classList.add('hidden');
    document.getElementById('inspector-content').classList.remove('flex');
}

function openInspector(id) {
    selectedGraphicId = id;
    const graphic = state.graphics.find(g => g.id === id);
    if (!graphic) return;

    // AUTO-PREVIEW: always show/refresh the selected graphic in PREVIEW monitor during editing
    previewGraphic = JSON.parse(JSON.stringify(graphic));
    refreshPreviewMonitor();
    refreshPreviewControls();

    document.getElementById('inspector-empty').classList.add('hidden');
    document.getElementById('inspector-content').classList.remove('hidden');
    document.getElementById('inspector-content').classList.add('flex');

    const typeSelect = document.getElementById('inspector-type-select');

    if (!inspectorAccordionStates[id]) {
        inspectorAccordionStates[id] = { content: true, appearance: false, layout: false, animation: false };
    }

    renderInspectorBody(graphic);
}

function renderInspectorBody(graphic) {
    const body = document.getElementById('inspector-body');



    body.innerHTML = `
        <!-- TAB MAIN -->
        <div id="ins-tab-content-main" class="flex-1 flex flex-col shrink-0">
            <!-- ACCORDION: ZAWARTOŚĆ -->
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

                    ${graphic.type === 'LOWER_THIRD' ? `
                        <div>
                            ${ctrlLabel('Tytuł')}
                            <div style="background:#111827;border:1px solid #374151;border-radius:6px;padding:10px 12px;min-height:44px;cursor:pointer;position:relative;" id="title-preview-box">
                                <div style="color:#fff;font-size:13px;line-height:1.4;max-height:80px;overflow:hidden;" id="title-preview-content">${graphic.titleHtml || graphic.title || '<span style="color:#6b7280;font-style:italic;">Kliknij aby edytować…</span>'}</div>
                                <button id="btn-open-wysiwyg" title="Edytuj tekst" style="position:absolute;top:6px;right:6px;width:26px;height:26px;background:#1e3a5f;border:1px solid #3b82f6;border-radius:4px;color:#60a5fa;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;">&#9999;</button>
                            </div>
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

                    ${graphic.type === 'TICKER' ? `
                        <div>
                            ${ctrlLabel('Wiadomości (jedna na linię)')}
                            <textarea data-field="items" rows="6" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white font-mono">${(graphic.items || []).join('\n')}</textarea>
                        </div>
                        <div>
                            ${ctrlLabel('Prędkość paska (px/s)')}
                            <input type="number" data-field="speed" value="${graphic.speed || 100}" min="10" step="10" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
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

            <!-- ACCORDION: WYGLĄD -->
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
                        ${ctrlLabel('Kolor Akcentu / Obramowania')}
                        ${colorPickerHtml('style.background.borderColor', graphic.style?.background?.borderColor || '#3b82f6')}
                    </div>

                    <div class="border-t border-gray-800 pt-3 mt-2">
                        <div class="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Typografia</div>
                        ${ctrlLabel('Kolor Czcionki')}
                        ${colorPickerHtml('style.typography.color', graphic.style?.typography?.color || '#ffffff')}
                    </div>
                </div>
            </div>


            <!-- ACCORDION: POZYCJA -->
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
                        <div>${ctrlLabel('Szerokość')}<input type="number" data-field="layout.width" value="${graphic.layout?.width || ''}" placeholder="Auto" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                        <div>${ctrlLabel('Wysokość')}<input type="number" data-field="layout.height" value="${graphic.layout?.height || ''}" placeholder="Auto" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                        <div>${ctrlLabel('Warstwa (Z-Index)')}<input type="number" data-field="layout.layer" value="${graphic.layout?.layer ?? 1}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                        <div>${ctrlLabel('Skala')}<input type="number" data-field="layout.scale" value="${graphic.layout?.scale ?? 1}" step="0.1" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white"></div>
                    </div>

                    <div class="border-t border-gray-800 pt-3 mt-3">
                        <div class="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-2">Powiązania (Dokowanie)</div>
                        <div class="space-y-4">
                            <!-- Y DOCKING -->
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
                            
                            <!-- X DOCKING -->
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

        <!-- TAB ANIMATION -->
        <div id="ins-tab-content-anim" class="hidden flex-1 flex flex-col shrink-0">
            <!--ACCORDION: ANIMACJA-->
            <div class="accordion border-b border-gray-800">
                <button class="accordion-toggle w-full flex items-center justify-between p-3 text-[10px] font-bold text-gray-400 bg-gray-900 hover:bg-gray-800 transition-colors" data-accordion="animation">
                    <span class="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        ANIMACJA
                    </span>
                    <span class="accordion-arrow">${inspectorAccordionStates[graphic.id]?.animation ? '−' : '+'}</span>
                </button>
                <div class="accordion-content ${inspectorAccordionStates[graphic.id]?.animation ? 'open' : ''} bg-gray-850/50 p-3 space-y-4">
                    <!-- IN animation -->
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

                    <!-- OUT animation -->
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

                    <!-- Preview Anim button -->
                    <div class="border-t border-gray-800 pt-3">
                        <button id="btn-preview-anim" class="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-[10px] font-bold transition-colors">
                            ▶ Podgląd animacji wejścia
                        </button>
                    </div>
                </div>
            </div>
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
        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const g = state.graphics.find(g => g.id === graphic.id);
                    if (g) {
                        g.url = ev.target.result;
                        saveState();
                        openInspector(graphic.id);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Side image upload (republika-composite)
    const sideImageUpload = body.querySelector('#side-image-upload');
    if (sideImageUpload) {
        sideImageUpload.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const g = state.graphics.find(g => g.id === graphic.id);
                    if (g) {
                        g.sideImage = ev.target.result;
                        saveState();
                        openInspector(graphic.id);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Remove side image
    const removeSideBtn = body.querySelector('#btn-remove-side-image');
    if (removeSideBtn) {
        removeSideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const g = state.graphics.find(g => g.id === graphic.id);
            if (g) {
                g.sideImage = '';
                saveState();
                openInspector(graphic.id);
            }
        });
    }

    // Direction buttons (animation)
    body.querySelectorAll('[data-dir-field]').forEach(btn => {
        btn.addEventListener('click', () => {
            const g = state.graphics.find(g => g.id === selectedGraphicId);
            if (!g) return;
            deepSet(g, btn.getAttribute('data-dir-field'), btn.getAttribute('data-dir-value'));
            saveState();
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
    const g = state.graphics.find(g => g.id === graphic.id);
    if (!g) return;

    const field = el.getAttribute('data-field');
    let value = el.value;

    // Special cases
    if (el.type === 'checkbox') {
        value = el.checked;
    } else if (el.multiple) {
        value = Array.from(el.selectedOptions).map(opt => opt.value).filter(val => val !== "");
    } else if (field === 'items') {
        value = value.split('\n');
    } else if (el.type === 'number') {
        value = parseFloat(value) || 0;
    } else if (field === 'titleHtml') {
        g.title = el.value.replace(/<[^>]+>/g, ''); // strip html for title
        g.titleHtml = el.value;
        saveState();
        if (previewGraphic?.id === g.id) {
            previewGraphic = JSON.parse(JSON.stringify(g));
            refreshPreviewMonitor();
        }
        return;
    }

    deepSet(g, field, value);
    saveState();

    // Re-render inspector when background type changes (shows/hides gradient fields) or layout side changes
    if (field === 'style.background.type' || field === 'layout.side') {
        openInspector(g.id);
        return;
    }

    // Also update preview if same graphic
    if (previewGraphic?.id === g.id) {
        previewGraphic = JSON.parse(JSON.stringify(g));
        refreshPreviewMonitor();
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
    const g = state.graphics.find(g => g.id === graphicId);
    if (!g) return;

    // Normalize and sanitize HTML before saving
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorEl.innerHTML;
    _wmNormalizeHtml(tempDiv);
    const html = tempDiv.innerHTML;

    if (g.type === 'TICKER') {
        const rawItems = html.split(/<br\s*\/?>|<\/?div>|<\/?p>/i);
        g.items = rawItems.filter(s => s.replace(/&nbsp;/g, '').trim() !== '');
        if (currentGraphicId === g.id) {
            const ta = document.querySelector('textarea[data-field="items"]');
            if (ta) ta.value = g.items.join('\n');
        }
    } else {
        g.titleHtml = html;
        g.title = editorEl.textContent || editorEl.innerText || '';
        const previewBox = document.getElementById('title-preview-content');
        if (previewBox) previewBox.innerHTML = html || '<span style="color:#6b7280;font-style:italic;">Kliknij aby edytować…</span>';
    }
    saveState();
    // Update preview monitor
    if (previewGraphic?.id === g.id) {
        previewGraphic = JSON.parse(JSON.stringify(g));
        refreshPreviewMonitor();
    }
}


// ===========================================================
// WYSIWYG MODAL
// ===========================================================
let _wmGraphicId = null;
let _wmRo = null;
let _wmSavedHtml = null;

function openWysiwygModal(graphicId) {
    const g = state.graphics.find(g => g.id === graphicId);
    if (!g) return;
    _wmGraphicId = graphicId;
    if (g.type === 'TICKER') {
        _wmSavedHtml = (g.items || []).join('<br>');
    } else {
        const tpl = state.templates.find(t => t.id === g.templateId);
        _wmSavedHtml = g.titleHtml || (g.titleLines && g.titleLines.length > 0 ? g.titleLines.map(l => `<div style="font-size:${l.fontSize || 48}px;font-weight:${l.fontWeight || '800'};color:${l.color || '#fff'};font-family:'${l.fontFamily || 'Inter'}',sans-serif;text-transform:${l.textTransform || 'uppercase'}" > ${l.text}</div> `).join('') : (g.title || tpl?.defaultFields?.title || ''));
    }

    const modal = document.getElementById('modal-wysiwyg');
    const editor = document.getElementById('wm-editor');
    const bgInput = document.getElementById('wm-bg');
    const titleEl = document.getElementById('wysiwyg-modal-title');

    modal.classList.remove('hidden');
    if (titleEl) titleEl.textContent = g.name;
    editor.innerHTML = _wmSavedHtml;

    // Set editor base font from graphic's typography settings so new typing uses the right font
    const defaultFont = g.style?.typography?.fontFamily || 'Bahnschrift';
    const defaultFontSize = (g.style?.typography?.fontSize || 24) + 'px';
    const defaultLineHeight = g.style?.typography?.lineHeight || '1.4';
    
    editor.style.fontFamily = defaultFont;
    editor.style.fontSize = defaultFontSize;
    editor.style.lineHeight = defaultLineHeight;

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
        if (lhSel) lhSel.value = editor.style.lineHeight || '1.4';

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
        const g = state.graphics.find(g => g.id === _wmGraphicId);
        if (!g) return;
        const tempG = JSON.parse(JSON.stringify(g));

        if (g.type === 'TICKER') {
            const rawItems = editor.innerHTML.split(/<br\s*\/?>|<\/?div>|<\/?p>/i);
            tempG.items = rawItems.filter(s => s.replace(/&nbsp;/g, '').trim() !== '');
        } else {
            tempG.titleHtml = editor.innerHTML;
            tempG.title = editor.textContent;
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
        const g = state.graphics.find(g => g.id === _wmGraphicId);
        if (g && _wmSavedHtml !== null) {
            if (g.type === 'TICKER') {
                const rawItems = _wmSavedHtml.split(/<br\s*\/?>|<\/?div>|<\/?p>/i);
                g.items = rawItems.filter(s => s.replace(/&nbsp;/g, '').trim() !== '');
            } else {
                g.titleHtml = _wmSavedHtml;
                g.title = _wmSavedHtml.replace(/<[^>]+>/g, '');
            }
            saveState();
            if (previewGraphic?.id === g.id) {
                previewGraphic = JSON.parse(JSON.stringify(g));
                refreshPreviewMonitor();
            }
        }
    }
    modal.classList.add('hidden');
    if (_wmRo) { _wmRo.disconnect(); _wmRo = null; }
    _wmGraphicId = null;
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

    editor.addEventListener('input', _wmRefreshPreview);
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
        item.className = `p-3 border-b border-gray - 700 cursor-pointer hover:bg-gray - 750 text-sm ${currentTemplateId === tpl.id ? 'bg-blue-900/40 border-l-4 border-l-blue-500' : ''} `;
        item.innerHTML = `<div class="font-medium truncate text-xs text-white" > ${tpl.name}</div> <div class="text-[10px] text-gray-500 font-mono">${tpl.type}</div>`;
        item.onclick = () => openTemplateEditor(tpl.id);
        list.appendChild(item);
    });
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
    const valMap = { html: tpl.html_template, css: tpl.css_template, js: tpl.js_template };
    editor.value = valMap[currentTemplateTab] || '';

    // Style the editor
    const colorMap = { html: '#fde68a', css: '#93c5fd', js: '#fdba74' };
    editor.style.color = colorMap[currentTemplateTab];

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
    const editor = document.getElementById('tpl-code-editor');
    const nameInput = document.getElementById('tpl-name-input');
    const fieldMap = { html: 'html_template', css: 'css_template', js: 'js_template' };
    tpl[fieldMap[currentTemplateTab]] = editor.value;
    tpl.name = nameInput.value || tpl.name;
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

function createGraphicFromTemplate(tpl) {
    const defaultFontFamily = (state.settings && state.settings.globalFontFamily) ? state.settings.globalFontFamily : 'Arial';
    const newG = {
        id: crypto.randomUUID(),
        type: tpl.type,
        visible: false,
        name: `${tpl.name} (${new Date().toLocaleTimeString()})`,
        title: tpl.defaultFields?.title || 'Title',
        titleHtml: tpl.defaultFields?.title || 'Title',
        subtitle: tpl.defaultFields?.subtitle || 'Subtitle',
        introText: tpl.defaultFields?.introText || 'PILNE',
        items: tpl.defaultFields?.items || ['Wiadomość 1', 'Wiadomość 2'],
        speed: 100,
        url: '',
        variant: 'custom',
        templateId: tpl.id,
        animation: {
            in: { type: 'slide', direction: 'left', duration: 0.5, delay: 0, ease: 'ease-out' },
            out: { type: 'fade', direction: 'left', duration: 0.5, delay: 0, ease: 'ease-in' }
        },
        style: {
            background: {
                type: 'solid',
                color: tpl.defaultFields?.primaryColor || '#0047AB',
                color2: tpl.defaultFields?.secondaryColor || '#000000',
                gradientAngle: 135,
                opacity: 1,
                borderColor: tpl.defaultFields?.accentColor || '#ffffff',
                borderWidth: 0, borderRadius: 0,
                subtitleBackgroundColor: tpl.defaultFields?.subtitleBackgroundColor || '#000000'
            },
            typography: {
                color: tpl.defaultFields?.titleColor || '#ffffff',
                fontFamily: defaultFontFamily,
                fontSize: tpl.defaultFields?.titleSize || 30,
                fontWeight: 'bold'
            },
            subtitleTypography: {
                color: tpl.defaultFields?.subtitleColor || '#eeeeee',
                fontFamily: 'Arial',
                fontSize: tpl.defaultFields?.subtitleSize || 20,
                fontWeight: 'normal'
            }
        },
        groupId: null,
        layout: { x: 100, y: 800, width: undefined, height: undefined, scale: 1, layer: 1, ...(tpl.defaultLayout || {}) }
    };

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
    const onChange = animDir ? `onchange="(function(sel){var g=state.graphics.find(g=>g.id===selectedGraphicId);if(g){deepSet(g, '${field}', sel.value);saveState();openInspector(g.id);};})(this)"` : '';
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
    // Navigation
    document.getElementById('nav-dashboard').onclick = () => switchPage('dashboard');
    document.getElementById('nav-templates').onclick = () => switchPage('templates');
    const navSbtn = document.getElementById('nav-settings');
    if (navSbtn) navSbtn.onclick = () => switchPage('settings');

    // Inspector Tabs
    const tabMain = document.getElementById('ins-tab-main');
    const tabAnim = document.getElementById('ins-tab-anim');
    if (tabMain && tabAnim) {
        tabMain.onclick = () => {
            document.getElementById('ins-tab-content-main')?.classList.remove('hidden');
            document.getElementById('ins-tab-content-anim')?.classList.add('hidden');
            tabMain.className = "flex-1 py-2 text-[10px] font-bold text-blue-400 border-b-2 border-blue-500 bg-gray-800/50 transition-colors";
            tabAnim.className = "flex-1 py-2 text-[10px] font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-300 transition-colors";
        };
        tabAnim.onclick = () => {
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
        const g = state.graphics.find(g => g.id === previewGraphic.id);
        if (g) Object.assign(g, previewGraphic);
        saveState();
        renderShotbox();
    };

    document.getElementById('btn-take-preview').onclick = () => {
        if (!previewGraphic) return;
        const g = state.graphics.find(g => g.id === previewGraphic.id);
        if (g) {
            // Save then toggle
            Object.assign(g, previewGraphic);
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

    const clearBankBtn = document.getElementById('btn-clear-bank');
    if (clearBankBtn) {
        clearBankBtn.onclick = () => {
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
        };
    }

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
        saveState();
        renderShotbox();
        const btn = document.getElementById('btn-save-graphic');
        btn.textContent = '✓ Zapisano!';
        setTimeout(() => {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> ZAPISZ ZMIANY`;
        }, 2000);
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

    document.getElementById('btn-import-template').onclick = () => {
        const json = prompt('Wklej JSON szablonu:');
        if (!json) return;
        try {
            const parsed = JSON.parse(json);
            const tpls = Array.isArray(parsed) ? parsed : [parsed];
            tpls.forEach(t => {
                if (!t.id) t.id = crypto.randomUUID();
                const existing = state.templates.findIndex(x => x.id === t.id);
                if (existing >= 0) state.templates[existing] = t;
                else state.templates.push(t);
            });
            saveState();
            renderTemplateList();
            alert('Import zakończony pomyślnie!');
        } catch (e) {
            alert('Błąd parsowania JSON: ' + e.message);
        }
    };

    document.getElementById('btn-save-template').onclick = saveCurrentTemplate;

    document.getElementById('btn-delete-template').onclick = () => {
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
    };

    document.querySelectorAll('.tpl-tab').forEach(tab => {
        tab.onclick = () => {
            // Save current tab content before switching
            if (currentTemplateId) {
                const tpl = state.templates.find(t => t.id === currentTemplateId);
                if (tpl) {
                    const editor = document.getElementById('tpl-code-editor');
                    const fieldMap = { html: 'html_template', css: 'css_template', js: 'js_template' };
                    tpl[fieldMap[currentTemplateTab]] = editor.value;
                }
            }
            currentTemplateTab = tab.getAttribute('data-tab');
            updateTemplateEditorTab();
        };
    });

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
}

// ===========================================================
// START
// ===========================================================
ensurePreviewRenderer();
init();
