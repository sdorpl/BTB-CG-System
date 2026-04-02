// ======================================================
// src/components/inspector.js — Inspector panel
// ======================================================

import {
    state, previewGraphic, setPreviewGraphic_store,
    selectedGraphicId, setSelectedGraphicId,
    inspectorAccordionStates, setInspectorAccordionStates,
    currentInspectorTab, setCurrentInspectorTab,
    panelMode, saveState, uploadFile
} from '../store.js';
import { escAttr, ctrlLabel, colorPickerHtml, animTypeSelect, directionBtns, easingSelect, deepSet } from '../utils.js';

// ===========================================================
// 8. INSPECTOR PANEL
// ===========================================================
export function closeInspector() {
    document.getElementById('inspector-panel').style.display = 'none';
    document.getElementById('inspector-empty').classList.remove('hidden');
    document.getElementById('inspector-content').classList.add('hidden');
    document.getElementById('inspector-content').classList.remove('flex');
    setSelectedGraphicId(null);
}

export function openInspector(id) {
    setSelectedGraphicId(id);
    const graphicRaw = window._draftGraphics[id] || state.graphics.find(g => g.id === id);
    if (!graphicRaw) return;

    // Fallback: if graphic doesn't have an explicit type, get it from the template
    const graphic = structuredClone(graphicRaw);
    if (!graphic.type) {
        const tpl = state.templates.find(t => t.id === graphic.templateId);
        if (tpl) graphic.type = tpl.type;
    }

    // AUTO-PREVIEW: always show/refresh the selected graphic in PREVIEW monitor during editing
    setPreviewGraphic_store(structuredClone(graphic));
    window._cgModules.refreshPreviewMonitor();
    window._cgModules.refreshPreviewControls();

    if (panelMode !== 'preview') {
        document.getElementById('inspector-panel').style.display = 'flex';
    }
    document.getElementById('inspector-empty').classList.add('hidden');
    document.getElementById('inspector-content').classList.remove('hidden');
    document.getElementById('inspector-content').classList.add('flex');

    const typeSelect = document.getElementById('inspector-type-select');

    if (!inspectorAccordionStates[id]) {
        inspectorAccordionStates[id] = { content: true, tickerSettings: true, appearance: false, layout: false, animation: false };
    }

    renderInspectorBody(graphic);

    // Sync tab button styles
    const _tabActive = "flex-1 py-2 text-[10px] font-bold text-blue-400 border-b-2 border-blue-500 bg-gray-800/50 transition-colors";
    const _tabInactive = "flex-1 py-2 text-[10px] font-bold text-gray-500 border-b-2 border-transparent hover:text-gray-300 transition-colors";
    ['main', 'anim'].forEach(t => {
        const btn = document.getElementById(`ins-tab-${t}`);
        if (btn) btn.className = (currentInspectorTab === t) ? _tabActive : _tabInactive;
    });
    // If user was on 'code' tab (removed), reset to 'main'
    if (currentInspectorTab === 'code') setCurrentInspectorTab('main');
}

export function renderInspectorBody(graphic) {
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

                            ${(graphic.wiper?.show !== false) ? `
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
                            ` : ''}

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
                                <input type="checkbox" data-field="style.typography.squashEnabled" ${graphic.style?.typography?.squashEnabled !== false ? 'checked' : ''} class="rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0">
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
                                    ${state.groups.map(grp => `<option value="group:${grp.id}" ${(Array.isArray(graphic.layout?.attachedToGraphicId) ? graphic.layout.attachedToGraphicId.includes('group:'+grp.id) : graphic.layout?.attachedToGraphicId === 'group:'+grp.id) ? 'selected' : ''} class="text-blue-400 font-bold">GRUPA: ${grp.name}</option>`).join('')}
                                    ${state.graphics.filter(g => g.id !== graphic.id).map(g => `<option value="${g.id}" ${(Array.isArray(graphic.layout?.attachedToGraphicId) ? graphic.layout.attachedToGraphicId.includes(g.id) : graphic.layout?.attachedToGraphicId === g.id) ? 'selected' : ''}>[${g.name}] ${g.title || 'Bez tytułu'}</option>`).join('')}
                                </select>
                                <div class="mt-2 grid grid-cols-2 gap-2">
                                    <div>
                                        ${ctrlLabel('Krawędź dokowania (Y)')}
                                        <select data-field="layout.attachToEdgeY" class="w-full bg-gray-800 border border-gray-700 rounded h-7 text-[10px] px-2 focus:border-blue-500 focus:outline-none">
                                            <option value="auto" ${(!graphic.layout?.attachToEdgeY || graphic.layout.attachToEdgeY === 'auto') ? 'selected' : ''}>Auto (Inteligentna)</option>
                                            <option value="top" ${graphic.layout?.attachToEdgeY === 'top' ? 'selected' : ''}>Góra Celu</option>
                                            <option value="bottom" ${graphic.layout?.attachToEdgeY === 'bottom' ? 'selected' : ''}>Dół Celu</option>
                                            <option value="manual" ${graphic.layout?.attachToEdgeY === 'manual' ? 'selected' : ''}>Manual (Relatywny)</option>
                                        </select>
                                    </div>
                                    <div>
                                        ${ctrlLabel('Odstęp Y (px)')}
                                        <input type="number" data-field="layout.attachOffsetY" value="${graphic.layout?.attachOffsetY ?? 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                                    </div>
                                </div>
                            </div>

                            <div class="border-t border-gray-800 pt-2">
                                ${ctrlLabel('Przyklej po osi X (Lewo/Prawo zależy od celu)')}
                                <div class="text-[10px] text-gray-500 mb-1">Przytrzymaj Ctrl, aby wybrać wiele elementów</div>
                                <select multiple data-field="layout.attachedToGraphicIdX" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-[10px] focus:border-blue-500 focus:outline-none text-white h-24">
                                    <option value="" ${(!graphic.layout?.attachedToGraphicIdX || (Array.isArray(graphic.layout.attachedToGraphicIdX) && graphic.layout.attachedToGraphicIdX.length === 0)) ? 'selected' : ''}>Brak (Niezależna pozycja X)</option>
                                    ${state.groups.map(grp => `<option value="group:${grp.id}" ${(Array.isArray(graphic.layout?.attachedToGraphicIdX) ? graphic.layout.attachedToGraphicIdX.includes('group:'+grp.id) : graphic.layout?.attachedToGraphicIdX === 'group:'+grp.id) ? 'selected' : ''} class="text-blue-400 font-bold">GRUPA: ${grp.name}</option>`).join('')}
                                    ${state.graphics.filter(g => g.id !== graphic.id).map(g => `<option value="${g.id}" ${(Array.isArray(graphic.layout?.attachedToGraphicIdX) ? graphic.layout.attachedToGraphicIdX.includes(g.id) : graphic.layout?.attachedToGraphicIdX === g.id) ? 'selected' : ''}>[${g.name}] ${g.title || 'Bez tytułu'}</option>`).join('')}
                                </select>
                                <div class="mt-2 grid grid-cols-2 gap-2">
                                    <div>
                                        ${ctrlLabel('Krawędź dokowania (X)')}
                                        <select data-field="layout.attachToEdgeX" class="w-full bg-gray-800 border border-gray-700 rounded h-7 text-[10px] px-2 focus:border-blue-500 focus:outline-none">
                                            <option value="auto" ${(!graphic.layout?.attachToEdgeX || graphic.layout.attachToEdgeX === 'auto') ? 'selected' : ''}>Auto (Inteligentna)</option>
                                            <option value="left" ${graphic.layout?.attachToEdgeX === 'left' ? 'selected' : ''}>Lewo Celu</option>
                                            <option value="right" ${graphic.layout?.attachToEdgeX === 'right' ? 'selected' : ''}>Prawo Celu</option>
                                            <option value="manual" ${graphic.layout?.attachToEdgeX === 'manual' ? 'selected' : ''}>Manual (Relatywny)</option>
                                        </select>
                                    </div>
                                    <div>
                                        ${ctrlLabel('Odstęp X (px)')}
                                        <input type="number" data-field="layout.attachOffsetX" value="${graphic.layout?.attachOffsetX ?? 0}" class="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-xs focus:border-blue-500 focus:outline-none text-white">
                                    </div>
                                </div>
                            </div>

                            <div class="text-[10px] text-gray-500 mt-1">System automatycznie wykrywa wymiary celu. Wpisz odstęp w px (np. 10), aby odsunąć element od krawędzi celu. Wartości ujemne zbliżą elementy. Element powróci na swoją pozycję, gdy cele znikną.</div>
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
                        g = structuredClone(g);
                        g.url = res.url;
                        window._draftGraphics[graphic.id] = g;
                        if (previewGraphic?.id === graphic.id) Object.assign(previewGraphic, g);
                        window._cgModules.refreshPreviewMonitor();
                        window._cgModules.renderShotbox();
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
                        g = structuredClone(g);
                        g.sideImage = res.url;
                        window._draftGraphics[graphic.id] = g;
                        if (previewGraphic?.id === graphic.id) Object.assign(previewGraphic, g);
                        window._cgModules.refreshPreviewMonitor();
                        window._cgModules.renderShotbox();
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
                g = structuredClone(g);
                g.sideImage = '';
                window._draftGraphics[graphic.id] = g;
                if (previewGraphic?.id === graphic.id) Object.assign(previewGraphic, g);
                window._cgModules.refreshPreviewMonitor();
                window._cgModules.renderShotbox();
                openInspector(graphic.id);
            }
        });
    }

    // Direction buttons (animation)
    body.querySelectorAll('[data-dir-field]').forEach(btn => {
        btn.addEventListener('click', () => {
            let g = window._draftGraphics[selectedGraphicId] || state.graphics.find(g => g.id === selectedGraphicId);
            if (!g) return;
            g = structuredClone(g);
            deepSet(g, btn.getAttribute('data-dir-field'), btn.getAttribute('data-dir-value'));
            window._draftGraphics[selectedGraphicId] = g;
            if (previewGraphic?.id === selectedGraphicId) Object.assign(previewGraphic, g);
            window._cgModules.refreshPreviewMonitor();
            window._cgModules.renderShotbox();
            openInspector(g.id); // re-render to update button states
        });
    });

    // ---- Open Title WYSIWYG modal button ----
    const openWysiwygBtn = body.querySelector('#btn-open-wysiwyg');
    const titleBox = body.querySelector('#title-preview-box');
    if (openWysiwygBtn) {
        const handler = (e) => { e.stopPropagation(); window._cgModules.openWysiwygModal(graphic.id); };
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
            window._cgModules.openWysiwygModalForField(g.id, fieldId, currentVal);
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
            window._cgModules.refreshPreviewMonitor();
            setTimeout(() => {
                previewGraphic.visible = true;
                window._cgModules.refreshPreviewMonitor();
            }, 120);
        });
    }

}

export function handleInspectorChange(el, graphic) {
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
        window._cgModules.refreshPreviewMonitor();
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

    window._cgModules.refreshPreviewMonitor();

    // Commit to persistent draft
    window._draftGraphics[graphic.id] = structuredClone(g);

    // Re-render inspector when background type changes (shows/hides gradient fields), layout side changes, or wiper visibility toggles
    if (field === 'style.background.type' || field === 'layout.side' || field === 'wiper.show') {
        renderInspectorBody(previewGraphic);
        return;
    }
}

// Expose for animTypeSelect inline handler
window.openInspector = openInspector;
