// ======================================================
// src/components/ticker.js — Ticker editor modal
// ======================================================

import {
    state, previewGraphic, selectedGraphicId, saveState
} from '../store.js';
import { refreshPreviewMonitor } from './monitor.js';
import { renderShotbox } from './shotbox.js';
import { openInspector } from './inspector.js';

let tickerEditorGraphic = null;

window.openTickerEditor = function(id) {
    const graphic = window._draftGraphics[id] || state.graphics.find(g => g.id === id);
    if (!graphic) return;

    tickerEditorGraphic = structuredClone(graphic); // Deep copy for editing

    const modal = document.getElementById('modal-ticker-editor');
    const subtitle = document.getElementById('ticker-editor-subtitle');

    if (!modal) return;

    subtitle.textContent = `${graphic.name} // ${graphic.id}`;
    modal.classList.remove('hidden');

    window.renderTickerEditorBody();
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
    const newName = input.value.trim();
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
        g = structuredClone(g);
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

    window.closeTickerEditor();
};

export function bindTickerEditorEvents() {
    const btnCancel = document.getElementById('ticker-editor-cancel');
    const btnSave = document.getElementById('ticker-editor-save');
    const btnAddGroup = document.getElementById('ticker-editor-add-group');

    if (btnCancel) btnCancel.onclick = window.closeTickerEditor;
    if (btnSave) btnSave.onclick = window.saveTickerEditor;
    if (btnAddGroup) btnAddGroup.onclick = window.addTickerGroup;
}
