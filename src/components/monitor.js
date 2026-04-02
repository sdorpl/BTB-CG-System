// ======================================================
// src/components/monitor.js — Preview & Program monitors
// ======================================================

import {
    state, previewGraphic, setPreviewGraphic_store,
    selectedGraphicId, uiChannel, panelMode
} from '../store.js';
import { saveState } from '../store.js';

// module-level ref so refreshPreviewMonitor can force a rescale
export let _previewDoScale = null;

export function setupMonitorScaling() {
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

export function setPreviewGraphic(graphic, skipBroadcast = false) {
    setPreviewGraphic_store(graphic);
    // Import renderShotbox lazily to avoid circular at eval time
    refreshPreviewMonitor(skipBroadcast);
    refreshPreviewControls();
    window._cgModules.renderShotbox();
}

export function refreshPreviewMonitor(skipBroadcast = false) {
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
            const saved = structuredClone(draft);
            delete saved._codeTab;
            state.graphics[idx] = saved;
            state.graphics[idx].visible = isVisible;
            delete window._draftGraphics[id];
            saveState();
            window._cgModules.renderShotbox();
            if (selectedGraphicId === id) refreshPreviewControls();
        }
    }
};

window.revertDraftGraphic = function(id) {
    if (window._draftGraphics[id]) {
        delete window._draftGraphics[id];
        window._cgModules.renderShotbox();
        if (selectedGraphicId === id) {
            window._cgModules.openInspector(id);
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
        setPreviewGraphic(structuredClone(g));
        window._cgModules.openInspector(id);
    }
};

export function refreshPreviewControls() {
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
export function updateProgramMonitor() {
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

// Expose for use in animTypeSelect inline handler
window.refreshPreviewMonitor = refreshPreviewMonitor;
