// ======================================================
// app.js — Entry point (ES module)
// Imports all feature modules, wires _cgModules bridge,
// then boots the application.
// ======================================================

import './src/store.js';
import { applyStaticTranslations, t, lang, LANGUAGES } from './src/i18n.js';
import { ensurePreviewRenderer } from './src/utils.js';
import {
    setPreviewGraphic, refreshPreviewMonitor, refreshPreviewControls,
    updateProgramMonitor, syncDraftGraphic, revertDraftGraphic, openGraphicInspector
} from './src/components/monitor.js';
import { renderShotbox } from './src/components/shotbox.js';
import {
    renderTemplateList, openTemplateSelectorModal, createGraphicFromTemplate
} from './src/components/templates.js';
import { openInspector, closeInspector } from './src/components/inspector.js';
import { openHotkeyAssignModal } from './src/components/hotkeys.js';
import { openWysiwygModal, openWysiwygModalForField } from './src/components/wysiwyg.js';
import { openTickerEditor } from './src/components/ticker.js';
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
    openTickerEditor,
    syncDraftGraphic,
    revertDraftGraphic,
    openGraphicInspector,
};

// ── i18n bridge ─────────────────────────────────────────
window._cgI18n = { t, lang, LANGUAGES, applyStaticTranslations };

// ── Boot ────────────────────────────────────────────────
applyStaticTranslations();
ensurePreviewRenderer();
init();
