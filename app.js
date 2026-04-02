// ======================================================
// app.js — Entry point (ES module)
// Imports all feature modules, wires _cgModules bridge,
// then boots the application.
// ======================================================

import './src/store.js';
import { ensurePreviewRenderer } from './src/utils.js';
import {
    setPreviewGraphic, refreshPreviewMonitor, refreshPreviewControls,
    updateProgramMonitor
} from './src/components/monitor.js';
import { renderShotbox } from './src/components/shotbox.js';
import {
    renderTemplateList, openTemplateSelectorModal, createGraphicFromTemplate
} from './src/components/templates.js';
import { openInspector, closeInspector } from './src/components/inspector.js';
import { openHotkeyAssignModal } from './src/components/hotkeys.js';
import { openWysiwygModal, openWysiwygModalForField } from './src/components/wysiwyg.js';
import { switchPage } from './src/components/settings.js';
import { setSelectedGraphicId } from './src/store.js';
import { init } from './src/init.js';

// ── Cross-module bridge ──────────────────────────────────
// Modules that can't directly import each other (due to circular deps)
// call through window._cgModules instead.
window._cgModules = {
    renderShotbox,
    renderTemplateList,
    openInspector,
    closeInspector,
    setPreviewGraphic,
    refreshPreviewMonitor,
    refreshPreviewControls,
    updateProgramMonitor,
    openHotkeyAssignModal,
    openWysiwygModal,
    openWysiwygModalForField,
    openTemplateSelectorModal,
    createGraphicFromTemplate,
    switchPage,
    setSelectedGraphicId,
};

// ── Boot ────────────────────────────────────────────────
ensurePreviewRenderer();
init();
