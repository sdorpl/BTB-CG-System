// ======================================================
// src/utils.js — Shared utility / helper functions
// ======================================================

export function escAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Validate that a string looks like a safe UUID (used before injecting IDs into HTML attributes)
const _uuidRe = /^[a-f0-9\-]{1,64}$/i;
export function isSafeId(id) {
    return typeof id === 'string' && _uuidRe.test(id);
}

export function deepSet(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) current[keys[i]] = {};
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

export function ctrlLabel(text) {
    return `<label class="block text-[9px] text-gray-500 uppercase font-semibold mb-1" > ${text}</label> `;
}

export function colorPickerHtml(field, value) {
    return `<div class="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded p-1" >
    <input type="color" data-field="${field}" value="${value}" class="h-6 w-8 rounded bg-transparent cursor-pointer border-none p-0 shrink-0">
        <input type="text" data-field="${field}" value="${value}" class="color-hex-input bg-transparent text-[10px] font-mono flex-1 focus:outline-none text-gray-300 min-w-0">
        </div>`;
}

export function animTypeSelect(field, value, animDir = '') {
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

export function directionBtns(field, value, color, animType) {
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

export function easingSelect(field, value, isOut = false) {
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

// Simple preview renderer (calls renderer.js logic)
// renderer.js exposes window.__cgRenderer after loading
export function ensurePreviewRenderer() {
    if (!window.__cgRenderer) {
        // fallback noop
        window.__cgRenderer = { renderPreview: () => { } };
    }
}
