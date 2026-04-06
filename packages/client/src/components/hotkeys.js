// ======================================================
// src/components/hotkeys.js — Hotkey assignment and triggering
// ======================================================

import { state, previewGraphic, selectedGraphicId } from '../store.js';
import { escAttr } from '../utils.js';
import { saveState } from '../store.js';
import { t } from '../i18n.js';

// ===========================================================
// HOTKEY ASSIGNMENT FOR GRAPHICS
// ===========================================================
export let _hotkeyAssignActive = false;
export let _globalPressedKeys = new Set(); // tracks currently held keys for multi-key hotkeys

// Clear pressed keys when window loses focus to prevent stale state
window.addEventListener('blur', () => { _globalPressedKeys.clear(); });
document.addEventListener('keyup', (e) => { _globalPressedKeys.delete(e.key); });

export function openHotkeyAssignModal(graphicId) {
    // Import here to avoid circular at module-eval time
    const { renderShotbox } = window._cgModules;

    const g = state.graphics.find(gx => gx.id === graphicId);
    if (!g) return;

    _hotkeyAssignActive = true;
    let overlay = document.getElementById('hotkey-assign-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'hotkey-assign-overlay';
    overlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/80';

    const currentLabel = g.hotkey ? g.hotkey.label : t('hotkeys.none');
    overlay.innerHTML = `
        <div class="bg-gray-900 border border-purple-700 rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4 text-center">
            <h2 class="text-white font-bold text-lg mb-2">${t('hotkeys.assignTitle')}</h2>
            <p class="text-gray-400 text-sm mb-1">${t('hotkeys.graphicLabel')} <span class="text-white font-bold">${escAttr(g.name)}</span></p>
            <p class="text-gray-500 text-xs mb-4">${t('hotkeys.currentShortcut')} <span class="text-purple-400 font-mono font-bold">${escAttr(currentLabel)}</span></p>
            <div id="hotkey-mod-row" class="flex justify-center gap-2 mb-3">
                <span id="hk-ctrl"  class="px-2 py-0.5 rounded text-xs font-mono font-bold border border-gray-700 text-gray-600 transition-all">Ctrl</span>
                <span id="hk-alt"   class="px-2 py-0.5 rounded text-xs font-mono font-bold border border-gray-700 text-gray-600 transition-all">Alt</span>
                <span id="hk-shift" class="px-2 py-0.5 rounded text-xs font-mono font-bold border border-gray-700 text-gray-600 transition-all">Shift</span>
            </div>
            <div id="hotkey-capture-box" tabindex="0" class="border-2 border-dashed border-purple-600 rounded-lg p-6 mb-3 text-purple-300 text-lg font-mono font-bold animate-pulse outline-none">
                ${t('hotkeys.pressKeyCombination')}
            </div>
            <p id="hotkey-hint" class="text-gray-500 text-xs mb-3 hidden">${t('hotkeys.enterToAssign')}</p>
            <div class="flex gap-2 justify-center">
                <button id="hotkey-confirm-btn" class="hidden px-4 py-2 rounded bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold border border-purple-500 transition-all">${t('hotkeys.assign')}</button>
                <button id="hotkey-clear-btn" class="px-4 py-2 rounded bg-red-900/60 hover:bg-red-800 text-red-300 text-sm font-bold border border-red-700/50 transition-all">${t('hotkeys.clearShortcut')}</button>
                <button id="hotkey-cancel-btn" class="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold border border-gray-700 transition-all">${t('hotkeys.cancel')}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const captureBox = document.getElementById('hotkey-capture-box');
    captureBox.focus();
    const hintEl    = document.getElementById('hotkey-hint');
    const confirmBtn = document.getElementById('hotkey-confirm-btn');
    const elCtrl    = document.getElementById('hk-ctrl');
    const elAlt     = document.getElementById('hk-alt');
    const elShift   = document.getElementById('hk-shift');
    let pendingDescriptor = null;

    function setModLight(el, on) {
        if (on) {
            el.classList.remove('border-gray-700', 'text-gray-600');
            el.classList.add('border-blue-500', 'text-blue-300', 'bg-blue-900/40');
        } else {
            el.classList.remove('border-blue-500', 'text-blue-300', 'bg-blue-900/40');
            el.classList.add('border-gray-700', 'text-gray-600');
        }
    }

    function closeModal() {
        _hotkeyAssignActive = false;
        overlay.remove();
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup',   onKeyUp);
    }

    function resetCapture() {
        pendingDescriptor = null;
        captureHeld.clear();
        captureSnapshot = new Set();
        setModLight(elCtrl, false);
        setModLight(elAlt, false);
        setModLight(elShift, false);
        captureBox.classList.remove('border-green-500', 'text-green-300', 'border-red-600', 'text-red-300', 'border-yellow-500', 'text-yellow-300');
        captureBox.classList.add('animate-pulse', 'border-purple-600', 'text-purple-300');
        captureBox.textContent = t('hotkeys.pressKeyCombination');
        hintEl.classList.add('hidden');
        confirmBtn.classList.add('hidden');
    }

    function confirmAssign() {
        if (!pendingDescriptor) return;
        const g2 = state.graphics.find(gx => gx.id === graphicId);
        if (!g2) { closeModal(); return; }
        g2.hotkey = pendingDescriptor;
        saveState();
        renderShotbox();
        closeModal();
    }

    confirmBtn.onclick = confirmAssign;
    document.getElementById('hotkey-cancel-btn').onclick = closeModal;
    document.getElementById('hotkey-clear-btn').onclick = () => {
        const g2 = state.graphics.find(gx => gx.id === graphicId);
        if (g2) g2.hotkey = null;
        saveState();
        renderShotbox();
        closeModal();
    };

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // Helper: human-readable label for a single e.key value
    function singleKeyLabel(k) {
        if (k === ' ')           return 'Space';
        if (k === 'Control' || k === 'Meta') return 'Ctrl';
        if (k === 'Alt')         return 'Alt';
        if (k === 'Shift')       return 'Shift';
        if (k === 'ArrowUp')     return '↑';
        if (k === 'ArrowDown')   return '↓';
        if (k === 'ArrowLeft')   return '←';
        if (k === 'ArrowRight')  return '→';
        if (k.length === 1)      return k.toUpperCase();
        return k;
    }

    // Sort keys: modifiers first, then rest alphabetically
    const MOD_ORDER = ['Control', 'Meta', 'Alt', 'Shift'];
    function sortKeys(keysArr) {
        return [...keysArr].sort((a, b) => {
            const ai = MOD_ORDER.indexOf(a) >= 0 ? MOD_ORDER.indexOf(a) : 99;
            const bi = MOD_ORDER.indexOf(b) >= 0 ? MOD_ORDER.indexOf(b) : 99;
            if (ai !== bi) return ai - bi;
            return singleKeyLabel(a).localeCompare(singleKeyLabel(b));
        });
    }

    function buildDescriptorFromKeys(keysSet) {
        if (keysSet.size === 0) return null;
        // Require at least one non-modifier key
        const nonMod = [...keysSet].filter(k => !['Control','Meta','Alt','Shift'].includes(k));
        if (nonMod.length === 0) return null;
        const sorted = sortKeys([...keysSet]);
        const label = sorted.map(singleKeyLabel).join('+');
        return { keys: sorted, label };
    }

    // Track keys held during capture
    const captureHeld = new Set();
    let captureSnapshot = new Set(); // full set at peak (before any releases)

    function updateCaptureDisplay() {
        if (captureHeld.size === 0) return;
        const sorted = sortKeys([...captureHeld]);
        const label = sorted.map(singleKeyLabel).join('+');
        captureBox.classList.remove('animate-pulse', 'border-purple-600', 'text-purple-300', 'border-green-500', 'text-green-300', 'border-red-600', 'text-red-300');
        captureBox.classList.add('border-yellow-500', 'text-yellow-300');
        captureBox.textContent = label;
        // Update modifier lights
        setModLight(elCtrl,  captureHeld.has('Control') || captureHeld.has('Meta'));
        setModLight(elAlt,   captureHeld.has('Alt'));
        setModLight(elShift, captureHeld.has('Shift'));
    }

    function onKeyDown(e) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') {
            if (pendingDescriptor) resetCapture();
            else closeModal();
            return;
        }
        if (e.key === 'Enter') {
            if (pendingDescriptor) confirmAssign();
            return;
        }

        captureHeld.add(e.key);
        captureSnapshot = new Set([...captureHeld]); // update snapshot while building combo
        pendingDescriptor = null;
        hintEl.classList.add('hidden');
        confirmBtn.classList.add('hidden');
        updateCaptureDisplay();
    }

    function onKeyUp(e) {
        if (!captureHeld.has(e.key)) return;
        captureHeld.delete(e.key);

        // Update modifier lights
        setModLight(elCtrl,  captureHeld.has('Control') || captureHeld.has('Meta'));
        setModLight(elAlt,   captureHeld.has('Alt'));
        setModLight(elShift, captureHeld.has('Shift'));

        // When all keys released → finalize using the peak snapshot
        if (captureHeld.size === 0) {
            const desc = buildDescriptorFromKeys(captureSnapshot);
            if (!desc) { resetCapture(); return; }

            const conflict = state.graphics.find(gx => gx.id !== graphicId && gx.hotkey &&
                Array.isArray(gx.hotkey.keys) &&
                gx.hotkey.keys.length === desc.keys.length &&
                gx.hotkey.keys.every((k, i) => k === desc.keys[i])
            );

            if (conflict) {
                pendingDescriptor = null;
                captureBox.classList.remove('animate-pulse', 'border-purple-600', 'text-purple-300', 'border-yellow-500', 'text-yellow-300', 'border-green-500', 'text-green-300');
                captureBox.classList.add('border-red-600', 'text-red-300');
                captureBox.innerHTML = `<span class="text-red-400">${escAttr(desc.label)}</span><br><span class="text-xs text-red-500">${t('hotkeys.conflictWith', escAttr(conflict.name))}</span>`;
                hintEl.classList.add('hidden');
                confirmBtn.classList.add('hidden');
                setTimeout(resetCapture, 1500);
                return;
            }

            pendingDescriptor = desc;
            captureBox.classList.remove('animate-pulse', 'border-purple-600', 'text-purple-300', 'border-yellow-500', 'text-yellow-300', 'border-red-600', 'text-red-300');
            captureBox.classList.add('border-green-500', 'text-green-300');
            captureBox.textContent = desc.label;
            hintEl.classList.remove('hidden');
            confirmBtn.classList.remove('hidden');
        }
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
}

export function triggerGraphicHotkey(e) {
    if (_hotkeyAssignActive) return false;

    // Import here to avoid circular at module-eval time
    const { renderShotbox, updateProgramMonitor, refreshPreviewControls, openInspector } = window._cgModules;

    // Maintain global pressed-keys set
    _globalPressedKeys.add(e.key);

    for (const g of state.graphics) {
        if (!g.hotkey) continue;
        const hk = g.hotkey;

        let match = false;
        if (Array.isArray(hk.keys)) {
            // New multi-key format
            if (hk.keys.length === _globalPressedKeys.size &&
                hk.keys.every(k => _globalPressedKeys.has(k))) {
                match = true;
            }
        } else if (hk.key) {
            // Legacy format {key, ctrl, alt, shift} — still support old saved hotkeys
            const ctrl = e.ctrlKey || e.metaKey;
            const alt = e.altKey;
            const shift = e.shiftKey;
            if (hk.key === e.key && hk.ctrl === ctrl && hk.alt === alt && hk.shift === shift) {
                match = true;
            }
        }

        if (match) {
            e.preventDefault();
            g.visible = !g.visible;
            saveState();
            renderShotbox();
            updateProgramMonitor();
            if (previewGraphic?.id === g.id) {
                previewGraphic.visible = g.visible;
                refreshPreviewControls();
            }
            if (selectedGraphicId === g.id) {
                openInspector(g.id);
            }
            return true;
        }
    }
    return false;
}
