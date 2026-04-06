// ======================================================
// src/components/wysiwyg.js — WYSIWYG modal (TipTap)
// ======================================================

import {
    state, previewGraphic, setPreviewGraphic_store,
    selectedGraphicId, saveState
} from '../store.js';
import { refreshPreviewMonitor, refreshPreviewControls, updateProgramMonitor } from './monitor.js';
import { renderShotbox } from './shotbox.js';
import { openInspector, renderInspectorBody } from './inspector.js';
import { sanitizeHtml } from '../utils.js';
import { t } from '../i18n.js';

// ===========================================================
// Normalize HTML: flatten redundant nested spans (same CSS property)
// ===========================================================
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

function saveWysiwygLegacy(editorEl, graphicId) {
    if (!previewGraphic || previewGraphic.id !== graphicId) return;
    const g = previewGraphic;

    // Normalize and sanitize HTML before saving
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editorEl.innerHTML;
    _wmNormalizeHtml(tempDiv);
    const html = tempDiv.innerHTML;

    if (_wmTargetField) {
        if (!g.fields) g.fields = {};
        g.fields[_wmTargetField] = html;
        if (_wmTargetField === 'TITLE') {
            g.titleHtml = html;
            g.title = editorEl.textContent || editorEl.innerText || '';
        } else if (_wmTargetField === 'SUBTITLE') {
            g.subtitle = editorEl.textContent || editorEl.innerText || '';
        }
    } else {
        if (g.type === 'TICKER') {
            const rawItems = html.split(/<br\s*\/?>|<\/?div>|<\/?p>/i);
            g.items = rawItems.filter(s => s.replace(/&nbsp;/g, '').trim() !== '');
            if (selectedGraphicId === g.id) {
                renderInspectorBody(previewGraphic);
            }
        } else {
            g.titleHtml = html;
            g.title = editorEl.textContent || editorEl.innerText || '';
            const previewBox = document.getElementById('title-preview-content');
            if (previewBox) previewBox.innerHTML = sanitizeHtml(html) || `<span style="color:#6b7280;font-style:italic;">${t('wysiwyg.clickToEdit')}</span>`;
        }
    }

    window._draftGraphics[g.id] = structuredClone(g);
    refreshPreviewMonitor();

    clearTimeout(window._shotboxSyncTimer);
    window._shotboxSyncTimer = setTimeout(() => renderShotbox(), 300);
}

// ===========================================================
// WYSIWYG MODAL
// ===========================================================
let _wmGraphicId = null;
let _wmTargetField = null;
let _wmRo = null;
let _wmSavedHtml = null;
let _wmInitialDraft = null;
let _wmDebounceTimer = null;

export function openWysiwygModal(graphicId) {
    const g = window._draftGraphics[graphicId] || state.graphics.find(g => g.id === graphicId);
    if (!g) return;
    // Ensure previewGraphic is set for live drafting
    if (!previewGraphic || previewGraphic.id !== graphicId) {
        setPreviewGraphic_store(structuredClone(g));
        refreshPreviewMonitor();
        refreshPreviewControls();
    }
    _wmGraphicId = graphicId;
    _wmTargetField = null; // Clear target field (legacy mode)
    if (g.type === 'TICKER') {
        _wmSavedHtml = (g.items || []).join('<br>');
    } else {
        const tpl = state.templates.find(t => t.id === g.templateId);
        _wmSavedHtml = g.titleHtml || (g.titleLines && g.titleLines.length > 0 ? g.titleLines.map(l => `<div style="font-size:${l.fontSize || 48}px;font-weight:${l.fontWeight || '800'};color:${l.color || '#fff'};font-family:'${l.fontFamily || 'Inter'}',sans-serif;text-transform:${l.textTransform || 'uppercase'}" > ${l.text}</div> `).join('') : (g.title || tpl?.defaultFields?.title || ''));
    }

    // Backup current draft to allow revert on cancel
    _wmInitialDraft = structuredClone(window._draftGraphics[graphicId] || state.graphics.find(gx => gx.id === graphicId));

    _wmOpenModal(g);
}

export function openWysiwygModalForField(graphicId, fieldId, currentHtml) {
    const g = window._draftGraphics[graphicId] || state.graphics.find(g => g.id === graphicId);
    if (!g) return;
    if (!previewGraphic || previewGraphic.id !== graphicId) {
        setPreviewGraphic_store(structuredClone(g));
        refreshPreviewMonitor();
        refreshPreviewControls();
    }
    _wmGraphicId = graphicId;
    _wmTargetField = fieldId;
    _wmSavedHtml = currentHtml || '';

    // Backup current draft to allow revert on cancel
    _wmInitialDraft = structuredClone(window._draftGraphics[graphicId] || state.graphics.find(gx => gx.id === graphicId));

    _wmOpenModal(g);
}

function _wmOpenModal(g) {
    const modal = document.getElementById('modal-wysiwyg');
    const bgInput = document.getElementById('wm-bg');
    const titleEl = document.getElementById('wysiwyg-modal-title');

    modal.classList.remove('hidden');
    if (titleEl) titleEl.textContent = g.name;

    // TipTap set content (with retry for initialization)
    const setContentWithRetry = () => {
        if (_wmEditor) {
            _wmEditor.commands.setContent(_wmSavedHtml);
            _wmEditor.commands.focus();
            _wmRefreshPreview();
        } else {
            setTimeout(setContentWithRetry, 50);
        }
    };
    setContentWithRetry();

    // Set editor base font from graphic's typography settings
    const editorEl = document.getElementById('wm-editor');
    if (editorEl) {
        editorEl.style.fontFamily = g.style?.typography?.fontFamily || 'Bahnschrift';
        editorEl.style.fontSize = (g.style?.typography?.fontSize || 48) + 'px';
        editorEl.style.lineHeight = g.style?.typography?.lineHeight || '1.1';
        editorEl.style.textTransform = g.style?.typography?.textTransform || 'none';
    }

    const bgColor = g.style?.background?.color || '#0047ab';
    if (bgInput) bgInput.value = bgColor;
    const previewCanvas = document.getElementById('wm-preview-canvas');
    if (previewCanvas) {
        previewCanvas.style.backgroundColor = bgColor;
        previewCanvas.innerHTML = ''; // Clear previous content
        previewCanvas.style.opacity = '1';
        previewCanvas.classList.remove('opacity-0');
        previewCanvas.style.display = 'block';
    }

    // Scale modal preview
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

        // Multiple attempts at initial scaling
        doScale();
        setTimeout(doScale, 100);
        setTimeout(doScale, 300);
        setTimeout(doScale, 600);
    }
    // Instant refresh
    setTimeout(() => { _wmRefreshPreview(); }, 150);
}

// ===========================================================
// 8. WYSIWYG MODAL (TipTap)
// ===========================================================
let _wmEditor = null;

function _initTipTap() {
    if (_wmEditor || !window.TipTap) return;

    const { Editor, StarterKit, Paragraph, TextStyle, Color, Highlight, Underline, TextAlign, FontFamily } = window.TipTap;

    // Custom Extension: Paragraph with style/line-height support
    const CustomParagraph = Paragraph.extend({
        addAttributes() {
            return {
                style: {
                    default: null,
                    parseHTML: element => element.getAttribute('style'),
                    renderHTML: attributes => {
                        if (!attributes.style) return {};
                        return { style: attributes.style };
                    },
                },
            };
        },
    });

    // Custom Extension: Combined TextStyle with fontSize, letterSpacing, decoration
    const CustomTextStyle = TextStyle.extend({
        addAttributes() {
            return {
                ...this.parent?.(),
                fontSize: {
                    default: null,
                    parseHTML: element => element.style.fontSize,
                    renderHTML: attributes => {
                        if (!attributes.fontSize) return {};
                        return { style: `font-size: ${attributes.fontSize}` };
                    },
                },
                letterSpacing: {
                    default: null,
                    parseHTML: element => element.style.letterSpacing,
                    renderHTML: attributes => {
                        if (!attributes.letterSpacing) return {};
                        return { style: `letter-spacing: ${attributes.letterSpacing}` };
                    },
                },
                padding: {
                    default: null,
                    parseHTML: element => element.style.padding,
                    renderHTML: attributes => {
                        if (!attributes.padding) return {};
                        return { style: `padding: ${attributes.padding}` };
                    },
                },
                borderRadius: {
                    default: null,
                    parseHTML: element => element.style.borderRadius,
                    renderHTML: attributes => {
                        if (!attributes.borderRadius) return {};
                        return { style: `border-radius: ${attributes.borderRadius}` };
                    },
                },
                display: {
                    default: null,
                    parseHTML: element => element.style.display,
                    renderHTML: attributes => {
                        if (!attributes.display) return {};
                        return { style: `display: ${attributes.display}` };
                    },
                },
            };
        },
        addCommands() {
            return {
                ...this.parent?.(),
                setFontSize: fontSize => ({ chain }) => {
                    return chain().setMark('textStyle', { fontSize }).run();
                },
                setLetterSpacing: letterSpacing => ({ chain }) => {
                    return chain().setMark('textStyle', { letterSpacing }).run();
                },
                setDecoration: attrs => ({ chain }) => {
                    return chain().setMark('textStyle', attrs).run();
                },
            };
        },
    });

    _wmEditor = new Editor({
        element: document.getElementById('wm-editor'),
        extensions: [
            StarterKit.configure({
                paragraph: false,
                heading: false,
                codeBlock: false,
                // Underline and TextStyle might be included or conflict
            }),
            CustomParagraph,
            CustomTextStyle,
            FontFamily,
            Color,
            Highlight.configure({ multicolor: true }),
            TextAlign.configure({ types: ['paragraph'] }),
        ],
        content: '',
        onUpdate: ({ editor }) => {
             _wmRefreshPreview();

             // Debounce draft sync to avoid input lag
             clearTimeout(window._wysiwygDraftTimer);
             window._wysiwygDraftTimer = setTimeout(() => {
                _syncTipTapToDraft(editor.getHTML());
             }, 300);
        },
        onSelectionUpdate: () => {
             _syncToolbarToTipTap();
        }
    });

    window.wmEditor = _wmEditor;
}

function _syncTipTapToDraft(html) {
    if (_wmGraphicId && previewGraphic && previewGraphic.id === _wmGraphicId) {
        const g = previewGraphic;
        if (_wmTargetField) {
            if (!g.fields) g.fields = {};
            g.fields[_wmTargetField] = html;
            if (_wmTargetField === 'TITLE') {
                g.titleHtml = html;
                g.title = html.replace(/<[^>]+>/g, '');
            } else if (_wmTargetField === 'SUBTITLE') {
                g.subtitle = html.replace(/<[^>]+>/g, '');
            }
        } else {
            if (g.type === 'TICKER') {
                const rawItems = html.split(/<br\s*\/?>|<\/?div>|<\/?p>/i);
                g.items = rawItems.filter(s => s.replace(/&nbsp;/g, '').trim() !== '');
            } else {
                g.titleHtml = html;
                g.title = html.replace(/<[^>]+>/g, '');
            }
        }
        // Store in draft
        window._draftGraphics[g.id] = JSON.parse(JSON.stringify(g));
        renderShotbox();
    }
}

function _syncToolbarToTipTap() {
    if (!_wmEditor) return;
    const attrs = _wmEditor.getAttributes('textStyle');
    const nodeAttrs = _wmEditor.getAttributes('paragraph');

    const fontSel = document.getElementById('wm-font');
    const sizeSel = document.getElementById('wm-size');
    const weightSel = document.getElementById('wm-weight');
    const trackSel = document.getElementById('wm-tracking');
    const padInput = document.getElementById('wm-padding');
    const radInput = document.getElementById('wm-radius');
    const lhSel = document.getElementById('wm-line-height');

    if (attrs.fontFamily && fontSel) {
         const ff = attrs.fontFamily.replace(/['",]/g, '').trim();
         const matchOpt = [...fontSel.options].find(o => o.value.toLowerCase() === ff.toLowerCase());
         if (matchOpt) fontSel.value = matchOpt.value;
    }
    if (attrs.fontSize && sizeSel) sizeSel.value = parseInt(attrs.fontSize);
    if (attrs.fontWeight && weightSel) weightSel.value = attrs.fontWeight;
    if (attrs.letterSpacing && trackSel) trackSel.value = attrs.letterSpacing;
    if (attrs.padding && padInput) padInput.value = parseInt(attrs.padding);
    if (attrs.borderRadius && radInput) radInput.value = parseInt(attrs.borderRadius);

    if (nodeAttrs.style && lhSel) {
        const match = nodeAttrs.style.match(/line-height:\s*([\d.]+)/);
        if (match) lhSel.value = match[1];
    }
}

export function bindWysiwygModalEvents() {
    // Ensure TipTap is initialized
    if (!window.TipTap) {
        setTimeout(bindWysiwygModalEvents, 100);
        return;
    }
    _initTipTap();

    const editor = _wmEditor;
    if (!editor) return;

    // Toolbar Buttons
    document.querySelectorAll('#wm-toolbar [data-cmd]').forEach(btn => {
        btn.onclick = () => {
            const cmd = btn.getAttribute('data-cmd');
            if (cmd === 'bold') editor.chain().focus().toggleBold().run();
            if (cmd === 'italic') editor.chain().focus().toggleItalic().run();
            if (cmd === 'underline') editor.chain().focus().toggleUnderline().run();
            if (cmd === 'justifyleft') editor.chain().focus().setTextAlign('left').run();
            if (cmd === 'justifycenter') editor.chain().focus().setTextAlign('center').run();
            if (cmd === 'justifyright') editor.chain().focus().setTextAlign('right').run();
        };
    });

    document.getElementById('wm-font')?.addEventListener('change', e => {
        editor.chain().focus().setFontFamily(e.target.value).run();
    });

    document.getElementById('wm-weight')?.addEventListener('change', e => {
        editor.chain().focus().setMark('textStyle', { fontWeight: e.target.value }).run();
    });

    document.getElementById('wm-size')?.addEventListener('change', e => {
        editor.chain().focus().setFontSize(e.target.value + 'px').run();
    });

    document.getElementById('wm-tracking')?.addEventListener('change', e => {
        editor.chain().focus().setLetterSpacing(e.target.value).run();
    });

    document.querySelectorAll('#wm-toolbar [data-transform]').forEach(btn => {
        btn.onclick = () => {
            editor.chain().focus().setMark('textStyle', { textTransform: btn.getAttribute('data-transform') }).run();
        };
    });

    document.getElementById('wm-padding')?.addEventListener('input', e => {
        editor.chain().focus().setDecoration({ padding: `0 ${e.target.value}px`, display: 'inline-block' }).run();
    });

    document.getElementById('wm-radius')?.addEventListener('input', e => {
        editor.chain().focus().setDecoration({ borderRadius: `${e.target.value}px`, display: 'inline-block' }).run();
    });

    document.getElementById('wm-line-height')?.addEventListener('change', e => {
        // Apply line-height to the current paragraph(s)
        editor.chain().focus().updateAttributes('paragraph', { style: `line-height: ${e.target.value}` }).run();
    });

    document.getElementById('wm-color')?.addEventListener('input', e => {
        editor.chain().focus().setColor(e.target.value).run();
    });

    document.getElementById('wm-highlight')?.addEventListener('input', e => {
        editor.chain().focus().setHighlight({ color: e.target.value }).run();
        editor.chain().focus().setDecoration({ display: 'inline-block' }).run();
    });

    document.getElementById('wm-bg')?.addEventListener('input', e => {
        const c = document.getElementById('wm-preview-canvas');
        if (c) c.style.background = e.target.value;
    });

    document.getElementById('wm-clear-all')?.addEventListener('click', () => {
        if (confirm(t('wysiwyg.confirmClearFormatting'))) {
            editor.chain().focus().unsetAllMarks().run();
        }
    });

    document.getElementById('toggle-html-view')?.addEventListener('click', () => {
        const src = document.getElementById('wm-html-source');
        const btn = document.getElementById('toggle-html-view');
        if (src.style.display === 'none') {
            src.value = editor.getHTML();
            src.style.display = 'block';
            btn.textContent = t('wysiwyg.hideHtmlSource');
        } else {
            editor.commands.setContent(src.value);
            src.style.display = 'none';
            btn.textContent = t('wysiwyg.showHtmlSource');
        }
    });

    document.getElementById('wysiwyg-save')?.addEventListener('click', () => _wmClose(true));
    document.getElementById('wysiwyg-cancel')?.addEventListener('click', () => _wmClose(false));
    document.getElementById('wysiwyg-modal-close')?.addEventListener('click', () => _wmClose(false));
}

function _wmRefreshPreview(instant = true) {
    if (!_wmGraphicId || !_wmEditor) return;

    // Throttle preview updates
    clearTimeout(_wmDebounceTimer);
    _wmDebounceTimer = setTimeout(() => {
        const html = _wmEditor.getHTML();

        // 1. Update previewGraphic object (used by both previews)
        if (previewGraphic) {
            if (_wmTargetField) {
                 if (!previewGraphic.fields) previewGraphic.fields = {};
                 previewGraphic.fields[_wmTargetField] = html;

                 // Legacy fallbacks for main fields
                 if (_wmTargetField === 'TITLE') {
                    previewGraphic.titleHtml = html;
                    previewGraphic.title = html.replace(/<[^>]+>/g, '');
                 } else if (_wmTargetField === 'SUBTITLE') {
                    previewGraphic.subtitle = html.replace(/<[^>]+>/g, '');
                 }
            } else if (previewGraphic.type === 'TICKER') {
                const rawItems = html.split(/<br\s*\/?>|<\/?div>|<\/?p>/i);
                previewGraphic.items = rawItems.filter(s => s.replace(/&nbsp;/g, '').trim() !== '');
            } else {
                previewGraphic.titleHtml = html;
                previewGraphic.title = html.replace(/<[^>]+>/g, '');

                // OCG field sync for legacy mode
                if (previewGraphic.fields) {
                    const titleKey = Object.keys(previewGraphic.fields).find(k => /title|tytul|nazwa/i.test(k) && !/sub/i.test(k));
                    if (titleKey) previewGraphic.fields[titleKey] = html;
                }
            }
        }

        // 2. Update the BIG previewMonitor in Main Dashboard
        refreshPreviewMonitor();

        // 3. Update the SMALL previewCanvas inside the Modal
        const canvas = document.getElementById('wm-preview-canvas');
        if (canvas && window.__cgRenderer && previewGraphic) {
            const tempG = JSON.parse(JSON.stringify(previewGraphic));
            tempG.visible = true; // Force visible in modal
            window.__cgRenderer.renderPreview(canvas, [tempG], state.templates, state.settings, { instant: true });
        }
    }, 150);
}

function _wmClose(save) {
    const modal = document.getElementById('modal-wysiwyg');
    if (save && _wmGraphicId && _wmEditor) {
        saveWysiwyg(_wmEditor, _wmGraphicId);
    } else if (!save && _wmGraphicId && _wmInitialDraft) {
        // Revert to initial draft if canceled
        window._draftGraphics[_wmGraphicId] = _wmInitialDraft;
        renderShotbox();
        if (selectedGraphicId === _wmGraphicId) openInspector(_wmGraphicId);
    }

    modal.classList.add('hidden');
    if (_wmRo) { _wmRo.disconnect(); _wmRo = null; }
    _wmGraphicId = null;
    _wmTargetField = null;
    _wmInitialDraft = null;

    if (save && selectedGraphicId) {
        openInspector(selectedGraphicId);
    }
}

export function saveWysiwyg(editor, graphicId) {
    const html = editor.getHTML();
    const g = state.graphics.find(gx => gx.id === graphicId);
    if (!g) return;

    if (_wmTargetField) {
        if (!g.fields) g.fields = {};
        g.fields[_wmTargetField] = html;
        if (_wmTargetField === 'TITLE') {
            g.titleHtml = html;
            g.title = html.replace(/<[^>]+>/g, '');
        } else if (_wmTargetField === 'SUBTITLE') {
            g.subtitle = html.replace(/<[^>]+>/g, '');
        }
    } else if (g.type === 'TICKER') {
         const rawItems = html.split(/<br\s*\/?>|<\/?div>|<\/?p>/i);
         g.items = rawItems.filter(s => s.replace(/&nbsp;/g, '').trim() !== '');
    } else {
        g.titleHtml = html;
        g.title = html.replace(/<[^>]+>/g, '');

        // OCG field sync for legacy mode
        if (g.fields) {
            const titleKey = Object.keys(g.fields).find(k => /title|tytul|nazwa/i.test(k) && !/sub/i.test(k));
            if (titleKey) g.fields[titleKey] = html;
        }
    }

    delete window._draftGraphics[graphicId];
    saveState();
    renderShotbox();
    updateProgramMonitor();
}
