// ======================================================
// src/components/settings.js — Settings page
// ======================================================

import { state, setCurrentPage, saveState } from '../store.js';
import { t } from '../i18n.js';

// ===========================================================
// 3. NAVIGATION
// ===========================================================
export function switchPage(page) {
    setCurrentPage(page);
    const dash = document.getElementById('page-dashboard');
    const tpls = document.getElementById('page-templates');
    const sets = document.getElementById('page-settings');
    const navD = document.getElementById('nav-dashboard');
    const navT = document.getElementById('nav-templates');
    const navS = document.getElementById('nav-settings');

    const activeClass = 'nav-tab px-4 py-1.5 rounded font-black uppercase tracking-wider text-blue-400 bg-blue-600/10 border border-blue-600/20 text-[10px]';
    const inactiveClass = 'nav-tab px-4 py-1.5 rounded font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors text-[10px]';

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
        window._cgModules.renderTemplateList();
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

export function renderSettings() {
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
            fontGraphicsContainer.innerHTML = `<div class="text-[10px] text-gray-500 italic p-2">${t('settings.noGraphicsInBank')}</div>`;
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
            radiusGraphicsContainer.innerHTML = `<div class="text-[10px] text-gray-500 italic p-2">${t('settings.noGraphicsInBank')}</div>`;
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

    // Network info
    fetchNetworkInfo();
}

function fetchNetworkInfo() {
    const container = document.getElementById('network-info-container');
    if (!container) return;

    fetch(`${window.__CG_SERVER_URL || ''}/api/server-info`)
        .then(r => r.json())
        .then(info => {
            const port = info.port;
            const lanIps = info.lanIps || [];
            const lanIp = lanIps[0] || null;

            const linkClass = 'text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-mono text-xs';
            const labelClass = 'text-[10px] text-gray-400 uppercase font-bold tracking-wider';
            const urlClass = 'bg-gray-800 border border-gray-700 rounded px-3 py-2 flex items-center justify-between gap-2';

            let html = '';

            // Panel Sterowania
            html += `<div>
                <div class="${labelClass} mb-1.5">${t('settings.networkPanel')}</div>
                <div class="space-y-1.5">
                    <div class="${urlClass}">
                        <a href="http://localhost:${port}/" target="_blank" class="${linkClass}">http://localhost:${port}/</a>
                        <button onclick="navigator.clipboard.writeText('http://localhost:${port}/')" class="text-gray-500 hover:text-white transition-colors" title="Kopiuj">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                    </div>`;

            if (lanIp) {
                html += `<div class="${urlClass}">
                        <a href="http://${lanIp}:${port}/" target="_blank" class="${linkClass}">http://${lanIp}:${port}/</a>
                        <span class="text-[9px] text-gray-500 shrink-0">LAN</span>
                        <button onclick="navigator.clipboard.writeText('http://${lanIp}:${port}/')" class="text-gray-500 hover:text-white transition-colors" title="Kopiuj">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                    </div>`;
            }

            html += `</div></div>`;

            // Output (OBS/vMix)
            html += `<div class="pt-3 border-t border-gray-700/50">
                <div class="${labelClass} mb-1.5">${t('settings.networkOutput')}</div>
                <div class="space-y-1.5">
                    <div class="${urlClass}">
                        <a href="http://localhost:${port}/output.html" target="_blank" class="${linkClass}">http://localhost:${port}/output.html</a>
                        <button onclick="navigator.clipboard.writeText('http://localhost:${port}/output.html')" class="text-gray-500 hover:text-white transition-colors" title="Kopiuj">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                    </div>`;

            if (lanIp) {
                html += `<div class="${urlClass}">
                        <a href="http://${lanIp}:${port}/output.html" target="_blank" class="${linkClass}">http://${lanIp}:${port}/output.html</a>
                        <span class="text-[9px] text-gray-500 shrink-0">LAN</span>
                        <button onclick="navigator.clipboard.writeText('http://${lanIp}:${port}/output.html')" class="text-gray-500 hover:text-white transition-colors" title="Kopiuj">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                    </div>`;
            }

            html += `</div></div>`;

            container.innerHTML = html;
        })
        .catch(() => {
            container.innerHTML = `<div class="text-xs text-red-400">${t('settings.networkError')}</div>`;
        });
}
