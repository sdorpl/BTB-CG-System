// ======================================================
// src/components/shotbox.js — Shotbox rendering and groups
// ======================================================

import {
    state, previewGraphic, selectedGraphicId,
    panelMode, uiChannel, saveState
} from '../store.js';
import { escAttr } from '../utils.js';

// ===========================================================
// 5. SHOTBOX (with copy & groups)
// ===========================================================

// Ensure groups array exists
export function ensureGroups() {
    if (!state.groups) state.groups = [];
}

// --- Copy Graphic ---
export function copyGraphic(graphicId) {
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
    window._cgModules.openInspector(copy.id);
}

// --- Group helpers ---
export const GROUP_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

export function createGroup(name) {
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

export function assignToGroup(graphicId, groupId) {
    const g = state.graphics.find(g => g.id === graphicId);
    if (!g) return;
    g.groupId = groupId || null;
    saveState();
    renderShotbox();
}

export function groupTakeAll(groupId, newVisible) {
    state.graphics.filter(g => g.groupId === groupId).forEach(g => {
        g.visible = newVisible;
    });
    saveState();
    renderShotbox();
    window._cgModules.updateProgramMonitor();
}

export function getGroupForGraphic(graphic) {
    ensureGroups();
    if (!graphic.groupId) return null;
    return state.groups.find(g => g.id === graphic.groupId) || null;
}

// Global toggle state
if (typeof window._groupCollapseState === 'undefined') window._groupCollapseState = {};

// --- Shotbox event delegation (set up once, handles all card/button interactions) ---
export function initShotboxDelegation() {
    const grid = document.getElementById('shotbox-grid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        // Preview button
        const prevBtn = e.target.closest('[data-preview-id]');
        if (prevBtn) {
            e.stopPropagation();
            const g = state.graphics.find(g => g.id === prevBtn.dataset.previewId);
            if (g) window._cgModules.setPreviewGraphic(structuredClone(g));
            return;
        }
        // Take button
        const takeBtn = e.target.closest('[data-take-id]');
        if (takeBtn) {
            e.stopPropagation();
            const id = takeBtn.dataset.takeId;
            const g = state.graphics.find(g => g.id === id);
            if (g) {
                g.visible = !g.visible;
                saveState();
                renderShotbox();
                window._cgModules.updateProgramMonitor();
                if (previewGraphic?.id === id) { previewGraphic.visible = g.visible; window._cgModules.refreshPreviewControls(); }
                if (selectedGraphicId === id) window._cgModules.openInspector(id);
            }
            return;
        }
        // Off button
        const offBtn = e.target.closest('[data-off-id]');
        if (offBtn) {
            e.stopPropagation();
            const id = offBtn.dataset.offId;
            const g = state.graphics.find(gx => gx.id === id);
            if (g && g.visible) {
                g.visible = false;
                saveState();
                renderShotbox();
                window._cgModules.updateProgramMonitor();
                if (previewGraphic?.id === id) { previewGraphic.visible = false; window._cgModules.refreshPreviewControls(); }
                if (selectedGraphicId === id) window._cgModules.openInspector(id);
            }
            return;
        }
        // Delete button
        const delBtn = e.target.closest('[data-delete-id]');
        if (delBtn) {
            e.stopPropagation();
            const id = delBtn.dataset.deleteId;
            const g = state.graphics.find(gx => gx.id === id);
            const name = g ? g.name : 'tę grafikę';
            if (confirm(`Czy na pewno chcesz usunąć grafikę "${name}"?`)) {
                state.graphics = state.graphics.filter(g => g.id !== id);
                if (selectedGraphicId === id) { window._cgModules.setSelectedGraphicId(null); window._cgModules.closeInspector(); }
                if (previewGraphic?.id === id) window._cgModules.setPreviewGraphic(null);
                saveState();
                renderShotbox();
                window._cgModules.updateProgramMonitor();
            }
            return;
        }
        // Copy button
        const copyBtn = e.target.closest('[data-copy-id]');
        if (copyBtn) {
            e.stopPropagation();
            copyGraphic(copyBtn.dataset.copyId);
            return;
        }
        // Hotkey assign button
        const hkBtn = e.target.closest('[data-hotkey-assign]');
        if (hkBtn) {
            e.stopPropagation();
            window._cgModules.openHotkeyAssignModal(hkBtn.dataset.hotkeyAssign);
            return;
        }
        // Group take-all button
        const grpTakeBtn = e.target.closest('[data-group-take]');
        if (grpTakeBtn) {
            e.stopPropagation();
            const gid = grpTakeBtn.dataset.groupTake;
            const anyOn = state.graphics.filter(g => g.groupId === gid).some(g => g.visible);
            groupTakeAll(gid, !anyOn);
            return;
        }
        // Card background click (select for preview/inspector)
        const card = e.target.closest('[data-card-id]');
        if (card && !e.target.closest('button') && !e.target.closest('select')) {
            const id = card.dataset.cardId;
            const gfx = window._draftGraphics[id] || state.graphics.find(g => g.id === id);
            if (gfx) {
                window._cgModules.setPreviewGraphic(structuredClone(gfx));
                if (panelMode !== 'inspector') uiChannel.postMessage({ action: 'select_graphic', id });
            }
        }
    });

    grid.addEventListener('change', (e) => {
        const sel = e.target.closest('[data-group-assign]');
        if (!sel) return;
        e.stopPropagation();
        const gfxId = sel.dataset.groupAssign;
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
}

// --- Render Shotbox ---
export function renderShotbox() {
    ensureGroups();
    const grid = document.getElementById('shotbox-grid');
    grid.innerHTML = '';

    const groupedItemsMap = {};
    const ungroupedItems = [];

    const existingGroupIds = new Set(state.groups.map(grp => grp.id));
    state.graphics.forEach(g => {
        if (g.groupId && existingGroupIds.has(g.groupId)) {
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
        card.dataset.cardId = graphic.id;
        card.className = `shotbox-card cursor-pointer rounded border p-2 relative group flex flex-col gap-2 transition-all duration-200
            ${isActive ? 'border-red-600 bg-red-900/20 shadow-[0_0_15px_rgba(229,57,53,0.3)] ring-1 ring-red-500' :
                isPreview ? 'border-yellow-500 bg-yellow-900/10 shadow-[0_0_10px_rgba(251,192,45,0.2)]' :
                    'border-gray-800 bg-[#111] hover:border-gray-600'}`;

        if (grp) {
            card.style.borderTopWidth = '3px';
            card.style.borderTopColor = grp.color;
        }

        const hotkeyLabel = graphic.hotkey ? graphic.hotkey.label : null;
        const actionBtns = `
            <div class="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button data-hotkey-assign="${graphic.id}" title="${hotkeyLabel ? 'Zmień skrót: ' + escAttr(hotkeyLabel) : 'Przypisz skrót klawiszowy'}" class="w-5 h-5 rounded flex items-center justify-center bg-gray-800 hover:bg-purple-900/60 text-gray-500 hover:text-purple-400 text-[10px] leading-none">⌨</button>
                <button data-copy-id="${graphic.id}" title="Kopiuj" aria-label="Kopiuj grafikę ${escAttr(graphic.name)}" class="w-5 h-5 rounded flex items-center justify-center bg-gray-800 hover:bg-blue-900/60 text-gray-500 hover:text-blue-400 text-[10px] leading-none">📋</button>
                <button data-delete-id="${graphic.id}" title="Usuń" aria-label="Usuń grafikę ${escAttr(graphic.name)}" class="w-5 h-5 rounded flex items-center justify-center bg-gray-800 hover:bg-red-900/60 text-gray-500 hover:text-red-400 text-xs leading-none">&times;</button>
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
                <div class="flex items-center gap-1">
                    ${hotkeyLabel ? `<div class="bg-purple-900/60 border border-purple-700/50 px-1.5 rounded"><span class="text-[8px] font-mono font-bold text-purple-300">${escAttr(hotkeyLabel)}</span></div>` : ''}
                    ${isActive ? `<div class="flex items-center gap-1 bg-red-600 px-1 rounded shadow-[0_0_8px_rgba(229,57,53,0.5)]"><span class="text-[8px] font-black text-white italic">LIVE</span></div>` : ''}
                </div>
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

        return card;
    };

    state.groups.forEach(grp => {
        const groupGraphics = groupedItemsMap[grp.id] || [];
        if (groupGraphics.length === 0) return;

        const anyOn = groupGraphics.some(g => g.visible);
        const isCollapsed = window._groupCollapseState[grp.id];

        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'col-span-full bg-[#111] border border-gray-800 rounded-lg flex flex-col transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.5)]';
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

        const innerGrid = document.createElement('div');
        innerGrid.className = 'group-inner-grid grid gap-2 p-2 pt-2 transition-all duration-300 min-h-[10px]';
        if (isCollapsed) {
            innerGrid.style.display = 'none';
        }

        // Toggle collapse without full re-render — directly mutate DOM
        header.querySelector('[data-group-toggle]').addEventListener('click', (e) => {
            const nowCollapsed = !window._groupCollapseState[grp.id];
            window._groupCollapseState[grp.id] = nowCollapsed;
            innerGrid.style.display = nowCollapsed ? 'none' : '';
            const chevron = header.querySelector('[data-group-toggle] svg');
            if (chevron) chevron.style.transform = nowCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        });

        groupWrapper.appendChild(header);

        groupGraphics.forEach(graphic => {
            innerGrid.appendChild(createCardElement(graphic));
        });

        groupWrapper.appendChild(innerGrid);
        grid.appendChild(groupWrapper);
    });

    ungroupedItems.forEach(graphic => {
        grid.appendChild(createCardElement(graphic));
    });

    // ---- Event handling via delegation (see initShotboxDelegation) ----

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

    window._cgModules.updateProgramMonitor();
}

// Expose for animTypeSelect inline handler
window.renderShotbox = renderShotbox;
