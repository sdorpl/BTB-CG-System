; (function () {
    'use strict';

    const container = document.getElementById('render-container');
    // Socket only needed in output.html (where container exists)
    const socket = (typeof io !== 'undefined' && container) ? io() : null;

    let activeGraphics = {}; // Map of graphic.id -> DOM element metadata
    let templates = [];

    function getLayoutTransform(layout, autoScale = 1, offsetY = 0, offsetX = 0) {
        const isCustom = !layout?.side || layout.side === 'custom';
        const x = isCustom ? (layout?.x || 0) : 0;
        const y = isCustom ? (layout?.y || 0) : 0;
        const finalY = y + offsetY;
        const finalX = x + offsetX;
        const scale = layout?.scale || 1;
        const rotation = layout?.rotation || 0;
        return `scale(${autoScale}) translate(${finalX}px, ${finalY}px) scale(${scale}) rotate(${rotation}deg)`;
    }

    function formatDimension(val, fallback = 'auto') {
        if (val === undefined || val === null || val === '') return fallback;
        const sVal = String(val).trim();
        // If it already has a unit (%, px, vh, etc.), return as is
        if (/[a-z%]$/i.test(sVal)) return sVal;
        // If it's a pure number, append px
        if (!isNaN(parseFloat(sVal)) && isFinite(sVal)) return `${sVal}px`;
        return sVal;
    }

    // Safely assign GSAP global (may not be available in all contexts)
    try { if (typeof gsap !== 'undefined') window.gsap = gsap; } catch (e) { }

    function initRenderer() {
        if (!socket) return;
        socket.on('initialState', (state) => {
            handleStateUpdate(state);
        });
        socket.on('stateUpdated', (state) => {
            handleStateUpdate(state);
        });
    }

    function handleStateUpdate(state) {
        templates = state.templates || [];
        const graphics = state.graphics || [];
        const settings = state.settings || {};

        // Diffing
        const currentActiveIds = Object.keys(activeGraphics);
        const newActiveGraphics = graphics.filter(g => g.visible);
        const newActiveIds = newActiveGraphics.map(g => g.id);

        // 1. Remove hidden/deleted graphics
        currentActiveIds.forEach(id => {
            if (!newActiveIds.includes(id)) {
                hideGraphic(id);
            }
        });

        // 2. Add or Update visible graphics
        newActiveGraphics.forEach(graphic => {
            if (!activeGraphics[graphic.id]) {
                showGraphic(graphic, settings, graphics);
            } else {
                // It's already visible but properties might have changed (text editing)
                // For now, if text is edited live, we re-render it. 
                // In a pro system we'd diff text and update DOM, but re-rendering is easier for GSAP
                const existingHash = activeGraphics[graphic.id].hash;
                const newHash = JSON.stringify({
                    title: graphic.title, subtitle: graphic.subtitle,
                    titleHtml: graphic.titleHtml, titleLines: graphic.titleLines,
                    layout: graphic.layout, animation: graphic.animation,
                    style: graphic.style, sideImage: graphic.sideImage,
                    speed: graphic.speed, items: graphic.items, wiper: graphic.wiper,
                    fields: graphic.fields,
                    activeGlobalFontFamily: (settings && settings.globalFontGraphics && settings.globalFontGraphics.includes(graphic.id)) ? settings.globalFontFamily : null

                });

                if (existingHash !== newHash) {
                    console.log('HASH MISMATCH FOR:', graphic.id);
                    console.log('OLD HASH:', existingHash);
                    console.log('NEW HASH:', newHash);
                    
                    const oldMeta = activeGraphics[graphic.id];
                    let durationMs = 550;
                    try {
                        const dataHash = JSON.parse(oldMeta.hash);
                        durationMs = ((dataHash.animation?.out?.duration) || 0.5) * 1000 + 50;
                    } catch(e) {}

                    // Trigger OUT animation of old graphic
                    hideGraphic(graphic.id);
                    
                    // Trigger IN animation of new graphic after the OUT animation completes
                    setTimeout(() => {
                        showGraphic(graphic, settings, graphics);
                    }, durationMs + 50);
                }
            }
        });
        
        recalculateAttachments(graphics);
    }

    function showGraphic(data, settings = {}, allGraphics = []) {
        const tpl = templates.find(t => t.id === data.templateId);
        if (!tpl) return;

        const instanceId = `lt_${data.id.replace(/-/g, '')}`;
        const df = tpl.defaultFields || {};
        const ctx = buildPreviewContext(data, tpl, instanceId, settings);

        const prepareStr = (str) => {
            try {
                return Handlebars.compile(str)(ctx);
            } catch (e) {
                console.error(e); return str;
            }
        };

        // Construct Layout Wrapper Element (matches VinciFlowGraphic return)
        const layoutStyleWrapper = document.createElement('div');
        const autoScale = 1;
        
        let initialOffsetY = 0;
        let initialOffsetX = 0;
        
        if (data.layout?.attachedToGraphicId) {
            const parentIds = Array.isArray(data.layout.attachedToGraphicId) ? data.layout.attachedToGraphicId : (data.layout.attachedToGraphicId ? [data.layout.attachedToGraphicId] : []);
            const parentVisible = parentIds.some(pid => {
                const p = allGraphics.find(g => g.id === pid);
                return p && p.visible;
            });
            if (parentVisible) {
                initialOffsetY = data.layout.attachOffsetY || 0;
            }
        }

        if (data.layout?.attachedToGraphicIdX) {
            const parentIdsX = Array.isArray(data.layout.attachedToGraphicIdX) ? data.layout.attachedToGraphicIdX : (data.layout.attachedToGraphicIdX ? [data.layout.attachedToGraphicIdX] : []);
            const parentVisibleX = parentIdsX.some(pid => {
                const p = allGraphics.find(g => g.id === pid);
                return p && p.visible;
            });
            if (parentVisibleX) {
                initialOffsetX = data.layout.attachOffsetX || 0;
            }
        }

        // Apply layout transform to outer wrapper
        layoutStyleWrapper.style.transform = getLayoutTransform(data.layout, autoScale, initialOffsetY, initialOffsetX);
        layoutStyleWrapper.style.transformOrigin = '0 0';
        layoutStyleWrapper.style.position = 'absolute';
        layoutStyleWrapper.style.top = '0';
        layoutStyleWrapper.style.left = '0';
        layoutStyleWrapper.style.width = '1920px';
        layoutStyleWrapper.style.height = '1080px';
        layoutStyleWrapper.style.pointerEvents = 'none';

        // Set custom CSS variables exactly like VinciFlowGraphic.tsx Lines 331-338
        layoutStyleWrapper.style.setProperty('--v-width', formatDimension(data.layout?.width, '90%'));
        layoutStyleWrapper.style.setProperty('--v-height', formatDimension(data.layout?.height, 'auto'));
        layoutStyleWrapper.style.zIndex = data.layout?.layer || 1;
        layoutStyleWrapper.style.opacity = data.style?.opacity ?? 1;

        // Inner container that holds the Graphic
        const innerContainer = document.createElement('div');
        innerContainer.style.width = '100%';
        innerContainer.style.height = '100%';
        innerContainer.style.position = 'absolute';
        innerContainer.style.top = '0';
        innerContainer.style.left = '0';

        // Inject HTML scoped with ID
        const html = prepareStr(tpl.html_template);
        innerContainer.innerHTML = `<div id="${instanceId}" class="lt-root">${html}</div>`;
        layoutStyleWrapper.appendChild(innerContainer);

        // Inject Custom CSS (scoped to instanceId)
        if (tpl.css_template) {
            let cssStr = prepareStr(tpl.css_template);
            // Clean out any self-injected #ids if the template author put them there natively
            cssStr = cssStr.replace(new RegExp(`#${instanceId}\\s+`, 'g'), '');

            // Advanced Scoping:
            // By prefixing common generic classes with the parent instance ID, we sandbox the CSS.
            cssStr = cssStr.replace(/\.(rep-|lt-|modern-|na-zywo-|plate|title|subtitle|ticker|dot|news-|wiper-)[a-zA-Z0-9_-]*/g, `#${instanceId} $&`);

            // Gradient override: if the graphic uses a gradient background, force it onto
            // all elements that only have background-color set (which doesn't support gradients).
            const bgData = data.style?.background || {};
            const globalRadiusGraphics = settings?.globalRadiusGraphics || [];
            const isGlobalRadius = globalRadiusGraphics.includes(data.id);
            const borderRadius = isGlobalRadius ? (settings.globalBorderRadius || 0) : (bgData.borderRadius || 0);

            if (bgData.type === 'gradient') {
                const angle = bgData.gradientAngle || 135;
                const c1 = bgData.color || '#1e3a8a';
                const c2 = bgData.color2 || '#3b82f6';
                const gradientVal = `linear-gradient(${angle}deg, ${c1}, ${c2})`;
                // Target container/bar elements specifically, not child decorative elements
                cssStr += `\n/* gradient override */`;
                cssStr += `\n#${instanceId} [class*="container"], #${instanceId} [class*="-bar"], #${instanceId} [class*="wrapper"], #${instanceId} [class*="plate"], #${instanceId} [class*="box"], #${instanceId} [class*="panel"] { background: ${gradientVal} !important; background-color: transparent !important; }`;
            }

            if (isGlobalRadius || bgData.borderRadius > 0) {
                cssStr += `\n/* border radius override */`;
                cssStr += `\n#${instanceId} [class*="container"], #${instanceId} [class*="-bar"], #${instanceId} [class*="wrapper"], #${instanceId} [class*="plate"], #${instanceId} [class*="box"], #${instanceId} [class*="panel"] { border-radius: ${borderRadius}px !important; overflow: hidden !important; }`;
            }

            // Layout side override
            if (data.layout?.side && data.layout.side !== 'custom') {
                const parts = data.layout.side.split('-');
                const ySide = parts[0];
                const xSide = parts.length > 1 ? parts[1] : 'center';
                
                const yS = (data.layout.side === 'center') ? 'center' : ySide;
                const xS = (data.layout.side === 'center') ? 'center' : xSide;

                const mx = data.layout?.marginX || 0;
                const my = data.layout?.marginY || 0;

                cssStr += `\n/* Side Layout */`;
                cssStr += `\n#${instanceId} { display: flex; width: 100%; height: 100%; box-sizing: border-box; pointer-events: none; }`;
                cssStr += `\n#${instanceId} > * { pointer-events: auto; position: relative !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important; margin: 0 !important; }`;
                
                if (yS === 'top') cssStr += `\n#${instanceId} { align-items: flex-start; padding-top: ${my}px; }`;
                else if (yS === 'bottom') cssStr += `\n#${instanceId} { align-items: flex-end; padding-bottom: ${my}px; }`;
                else if (yS === 'center') cssStr += `\n#${instanceId} { align-items: center; }`;

                if (xS === 'left') cssStr += `\n#${instanceId} { justify-content: flex-start; padding-left: ${mx}px; }`;
                else if (xS === 'right') cssStr += `\n#${instanceId} { justify-content: flex-end; padding-right: ${mx}px; }`;
                else if (xS === 'center') cssStr += `\n#${instanceId} { justify-content: center; }`;
            }

            const style = document.createElement('style');
            style.textContent = cssStr;
            layoutStyleWrapper.appendChild(style);
        }

        container.appendChild(layoutStyleWrapper);

        // Save metadata
        activeGraphics[data.id] = {
            el: layoutStyleWrapper,
            instanceId: instanceId,
            hash: JSON.stringify({
                title: data.title, subtitle: data.subtitle,
                titleHtml: data.titleHtml, titleLines: data.titleLines,
                layout: data.layout, animation: data.animation,
                style: data.style, sideImage: data.sideImage,
                speed: data.speed, items: data.items, wiper: data.wiper,
                fields: data.fields,
                activeGlobalFontFamily: (settings && settings.globalFontGraphics && settings.globalFontGraphics.includes(data.id)) ? settings.globalFontFamily : null
            }),
            isHiding: false
        };

        // Execute internal JS & Animation wrapper
        const rootEl = document.getElementById(instanceId);
        if (rootEl && tpl.js_template) {
            const jsCode = prepareStr(tpl.js_template);

            try {
                const wrappedCode = [
                    '(function(root, gsap) {',
                    '    try {',
                    jsCode,
                    '    } catch (e) {',
                    '        console.error("INNER TEMPLATE ERROR:", e);',
                    '    }',
                    `})(document.getElementById("${instanceId}"), window.gsap);`
                ].join('\n');
                // eslint-disable-next-line no-eval
                eval(wrappedCode);

                // Allow DOM repaints before executing GSAP show animations logic
                setTimeout(() => {
                    if (rootEl) {
                        rootEl.classList.add('active');
                        // Legacy support: also add .active to the first child (often .lt-container)
                        if (rootEl.firstElementChild) rootEl.firstElementChild.classList.add('active');
                    }
                    if (rootEl.__slt_show) {
                        rootEl.__slt_show();
                    } else {
                        rootEl.style.display = 'block';
                    }
                }, 30);
            } catch (e) {
                console.error("Vinci JS error", e);
            }
        } else if (rootEl) {
            // No JS template, but still trigger active class for CSS-only templates
            setTimeout(() => {
                rootEl.classList.add('active');
                if (rootEl.firstElementChild) rootEl.firstElementChild.classList.add('active');
                rootEl.style.display = 'block';
            }, 30);
        }
    }

    function hideGraphic(id) {
        const meta = activeGraphics[id];
        if (!meta || meta.isHiding) return;

        meta.isHiding = true;
        const rootEl = document.getElementById(meta.instanceId);

        if (rootEl) {
            rootEl.classList.remove('active');
            if (rootEl.firstElementChild) rootEl.firstElementChild.classList.remove('active');
        }

        // Hide Animation logic (matches original VinciFlowGraphic lines 292-316)
        if (rootEl && rootEl.__slt_hide && typeof rootEl.__slt_hide === 'function') {
            try {
                const hideResult = rootEl.__slt_hide();
                // Parse duration from hash (default 0.5s + 50ms buffer)
                const dataHash = JSON.parse(meta.hash);
                const durationMs = ((dataHash.animation?.out?.duration) || 0.5) * 1000 + 50;

                // GSAP/Promise check
                if (hideResult && typeof hideResult.then === 'function') {
                    hideResult.then(() => {
                        removeElement(id, meta);
                    }).catch(e => {
                        console.error("Anim promise error", e);
                        // Fallback to timeout if promise fails
                        setTimeout(() => removeElement(id, meta), durationMs);
                    });
                } else {
                    // If it's a standard CSS transition (most templates in db.json), 
                    // __slt_hide just applies CSS. We MUST wait the duration then remove.
                    setTimeout(() => {
                        removeElement(id, meta);
                    }, durationMs);
                }
            } catch (e) {
                console.error("Hide execution error", e);
                removeElement(id, meta);
            }
        } else if (rootEl) {
            // Legacy support: wait for CSS transitions triggered by .active removal
            setTimeout(() => {
                removeElement(id, meta);
            }, 600);
        } else {
            removeElement(id, meta);
        }
    }

    function recalculateAttachments(graphics) {
        // Allow DOM to process additions/removals first
        setTimeout(() => {
            graphics.forEach(graphic => {
                if (!graphic.visible) return;
                const meta = activeGraphics[graphic.id];
                if (!meta || !meta.el || meta.isHiding) return;

                let offsetY = 0;
                let offsetX = 0;
                
                if (graphic.layout?.attachedToGraphicId) {
                    const parentIds = Array.isArray(graphic.layout.attachedToGraphicId) ? graphic.layout.attachedToGraphicId : (graphic.layout.attachedToGraphicId ? [graphic.layout.attachedToGraphicId] : []);
                    const parentVisible = parentIds.some(pid => {
                        const p = graphics.find(g => g.id === pid);
                        return p && p.visible;
                    });
                    if (parentVisible) {
                        offsetY = graphic.layout.attachOffsetY || 0;
                    }
                }

                if (graphic.layout?.attachedToGraphicIdX) {
                    const parentIdsX = Array.isArray(graphic.layout.attachedToGraphicIdX) ? graphic.layout.attachedToGraphicIdX : (graphic.layout.attachedToGraphicIdX ? [graphic.layout.attachedToGraphicIdX] : []);
                    const parentVisibleX = parentIdsX.some(pid => {
                        const p = graphics.find(g => g.id === pid);
                        return p && p.visible;
                    });
                    if (parentVisibleX) {
                        offsetX = graphic.layout.attachOffsetX || 0;
                    }
                }

                const currentTransform = meta.el.style.transform;
                const targetTransform = getLayoutTransform(graphic.layout, 1, offsetY, offsetX);
                
                // Set CSS transition to smoothly glide elements if they change their target Y
                meta.el.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
                meta.el.style.transform = targetTransform;
            });
        }, 50);
    }

    function removeElement(id, meta) {
        if (meta.el && meta.el.parentNode) {
            meta.el.parentNode.removeChild(meta.el);
        }
        if (activeGraphics[id] === meta) {
            delete activeGraphics[id];
        }
    }

    // ===========================================================
    // PUBLIC API — Used by the control panel for monitor previews
    // ===========================================================
    const previewInstances = new WeakMap();

    window.__cgRenderer = {
        renderPreview(containerEl, graphics, tpls, settings = {}, options = {}) {
            if (!containerEl) return;
            let instances = previewInstances.get(containerEl);
            if (!instances) { instances = {}; previewInstances.set(containerEl, instances); }

            const visibleGraphics = graphics.filter(g => g.visible);
            const visibleIds = new Set(visibleGraphics.map(g => g.id));

            // Remove stale
            Object.keys(instances).forEach(id => {
                if (!visibleIds.has(id)) {
                    const el = instances[id];
                    if (el && el.parentNode) el.parentNode.removeChild(el);
                    delete instances[id];
                }
            });

            // Add visible graphics
            visibleGraphics.forEach(graphic => {
                const tpl = tpls.find(t => t.id === graphic.templateId);
                if (!tpl) return;

                // Remove and re-render on update
                if (instances[graphic.id]) {
                    const old = instances[graphic.id];
                    if (old && old.parentNode) old.parentNode.removeChild(old);
                    delete instances[graphic.id];
                }

                const instanceId = `prev${graphic.id.replace(/-/g, '')}`;
                const context = buildPreviewContext(graphic, tpl, instanceId, settings);

                const prepareStr = (str) => {
                    if (!str) return '';
                    try {
                        return Handlebars.compile(str)(context);
                    } catch (e) {
                        console.error('Preview Handlebars error:', e);
                        return str;
                    }
                };

                const htmlStr = prepareStr(tpl.html_template);
                let cssStr = prepareStr(tpl.css_template);

                cssStr = cssStr.replace(new RegExp(`#${instanceId}\\s+`, 'g'), '');
                cssStr = cssStr.replace(/\.(rep-|lt-|modern-|na-zywo-|plate|title|subtitle|ticker|dot|news-|wiper-)[a-zA-Z0-9_-]*/g, `#${instanceId} $&`);
                cssStr = cssStr.replace(/#\{\{ID\}\}|#GRAPHIC_ID/g, `#${instanceId}`);

                const layoutStyleWrapper = document.createElement('div');
                const autoScale = 1;
                layoutStyleWrapper.style.transform = getLayoutTransform(graphic.layout, autoScale);
                layoutStyleWrapper.style.transformOrigin = '0 0';
                layoutStyleWrapper.style.position = 'absolute';
                layoutStyleWrapper.style.top = '0';
                layoutStyleWrapper.style.left = '0';
                layoutStyleWrapper.style.width = '1920px';
                layoutStyleWrapper.style.height = '1080px';
                layoutStyleWrapper.style.pointerEvents = 'none';

                layoutStyleWrapper.style.setProperty('--v-width', formatDimension(graphic.layout?.width, '90%'));
                layoutStyleWrapper.style.setProperty('--v-height', formatDimension(graphic.layout?.height, 'auto'));
                layoutStyleWrapper.style.zIndex = graphic.layout?.layer || 1;
                layoutStyleWrapper.style.opacity = graphic.style?.opacity ?? 1;

                const innerContainer = document.createElement('div');
                innerContainer.style.width = '100%';
                innerContainer.style.height = '100%';
                innerContainer.style.position = 'absolute';
                innerContainer.style.top = '0';
                innerContainer.style.left = '0';

                const styleEl = document.createElement('style');

                if (options.instant) {
                    // Rewrite the CSS to force-show elements:
                    // 1. Replace opacity: 0 with opacity: 1 (initial hidden state → visible)
                    cssStr = cssStr.replace(/opacity\s*:\s*0\b/g, 'opacity: 1');
                    // 2. Replace transform values that hide elements off-screen with identity
                    cssStr = cssStr.replace(/transform\s*:\s*(translateX\([^)]+\)|translateY\([^)]+\)|scale\([^)]+\)|scaleX\([^)]+\))/g, 'transform: none');
                }

                // Gradient override: if the graphic uses a gradient background, force it onto
                // all elements that only have background-color set (which doesn't support gradients).
                const bgData2 = graphic.style?.background || {};
                const globalRadiusGraphicsPrev = settings?.globalRadiusGraphics || [];
                const isGlobalRadiusPrev = globalRadiusGraphicsPrev.includes(graphic.id);
                const borderRadiusPrev = isGlobalRadiusPrev ? (settings.globalBorderRadius || 0) : (bgData2.borderRadius || 0);

                if (bgData2.type === 'gradient') {
                    const angle2 = bgData2.gradientAngle || 135;
                    const c1_2 = bgData2.color || '#1e3a8a';
                    const c2_2 = bgData2.color2 || '#3b82f6';
                    const gradientVal2 = `linear-gradient(${angle2}deg, ${c1_2}, ${c2_2})`;
                    // Target container/bar elements specifically, not child decorative elements
                    cssStr += `\n/* gradient override */`;
                    cssStr += `\n#${instanceId} [class*="container"], #${instanceId} [class*="-bar"], #${instanceId} [class*="wrapper"], #${instanceId} [class*="plate"], #${instanceId} [class*="box"], #${instanceId} [class*="panel"] { background: ${gradientVal2} !important; background-color: transparent !important; }`;
                }

                if (isGlobalRadiusPrev || bgData2.borderRadius > 0) {
                    cssStr += `\n/* border radius override */`;
                    cssStr += `\n#${instanceId} [class*="container"], #${instanceId} [class*="-bar"], #${instanceId} [class*="wrapper"], #${instanceId} [class*="plate"], #${instanceId} [class*="box"], #${instanceId} [class*="panel"] { border-radius: ${borderRadiusPrev}px !important; overflow: hidden !important; }`;
                }

                // Layout side override
                if (graphic.layout?.side && graphic.layout.side !== 'custom') {
                    const parts = graphic.layout.side.split('-');
                    const ySide = parts[0];
                    const xSide = parts.length > 1 ? parts[1] : 'center';
                    
                    const yS = (graphic.layout.side === 'center') ? 'center' : ySide;
                    const xS = (graphic.layout.side === 'center') ? 'center' : xSide;

                    const mx = graphic.layout?.marginX || 0;
                    const my = graphic.layout?.marginY || 0;

                    cssStr += `\n/* Side Layout */`;
                    cssStr += `\n#${instanceId} { display: flex; width: 100%; height: 100%; box-sizing: border-box; pointer-events: none; }`;
                    cssStr += `\n#${instanceId} > * { pointer-events: auto; position: relative !important; top: auto !important; left: auto !important; right: auto !important; bottom: auto !important; margin: 0 !important; }`;
                    
                    if (yS === 'top') cssStr += `\n#${instanceId} { align-items: flex-start; padding-top: ${my}px; }`;
                    else if (yS === 'bottom') cssStr += `\n#${instanceId} { align-items: flex-end; padding-bottom: ${my}px; }`;
                    else if (yS === 'center') cssStr += `\n#${instanceId} { align-items: center; }`;

                    if (xS === 'left') cssStr += `\n#${instanceId} { justify-content: flex-start; padding-left: ${mx}px; }`;
                    else if (xS === 'right') cssStr += `\n#${instanceId} { justify-content: flex-end; padding-right: ${mx}px; }`;
                    else if (xS === 'center') cssStr += `\n#${instanceId} { justify-content: center; }`;
                }

                styleEl.textContent = cssStr;
                if (options.instant) {
                    // Also kill all transitions and animations globally
                    styleEl.textContent += `\n#${instanceId}, #${instanceId} * { transition: none !important; transition-delay: 0s !important; animation: none !important; }`;
                }
                innerContainer.appendChild(styleEl);

                // Inject HTML scoped with ID, matching showGraphic wrapping
                const wrapperDiv = document.createElement('div');
                wrapperDiv.id = instanceId;
                wrapperDiv.className = 'lt-root';
                wrapperDiv.innerHTML = htmlStr;
                innerContainer.appendChild(wrapperDiv);

                layoutStyleWrapper.appendChild(innerContainer);

                containerEl.appendChild(layoutStyleWrapper);
                instances[graphic.id] = layoutStyleWrapper;

                // Run template JS identical to showGraphic
                const rootEl = document.getElementById(instanceId);
                if (rootEl && tpl.js_template) {
                    const jsCode = prepareStr(tpl.js_template);
                    try {
                        const wrappedCode = [
                            '(function(root, gsap) {',
                            '    try {',
                            jsCode,
                            '    } catch (e) {',
                            '        console.error("PREVIEW INNER TEMPLATE ERROR:", e);',
                            '    }',
                            `})(document.getElementById("${instanceId}"), window.gsap);`
                        ].join('\n');
                        // eslint-disable-next-line no-eval
                        eval(wrappedCode);
                    } catch (e) {
                        console.error("Vinci JS error", e);
                    }
                }

                // Trigger __slt_show and force instant visibility
                if (rootEl && typeof rootEl.__slt_show === 'function') {
                    try {
                        rootEl.__slt_show();
                    } catch (e) { console.error("__slt_show error:", e); }
                }

                if (rootEl) {
                    rootEl.classList.add('active');
                    if (rootEl.firstElementChild) rootEl.firstElementChild.classList.add('active');
                }

                if (options.instant && rootEl) {
                    // Use rAF to ensure DOM is committed before forcing styles
                    requestAnimationFrame(() => {
                        // Force GSAP tweens to complete
                        if (window.gsap) {
                            try {
                                window.gsap.getTweensOf(rootEl).forEach(t => t.progress(1));
                                window.gsap.getTweensOf(rootEl.querySelectorAll('*')).forEach(t => t.progress(1));
                            } catch (e) { }
                        }
                        // Force all child elements visible - unconditionally override opacity and transform
                        // This handles CSS-transition based templates where __slt_show sets properties
                        // but they haven't taken effect yet
                        const forceVisible = (el) => {
                            el.style.setProperty('opacity', '1', 'important');
                            el.style.setProperty('transform', 'none', 'important');
                            el.style.setProperty('transition', 'none', 'important');
                        };
                        rootEl.querySelectorAll('*').forEach(forceVisible);
                    });
                } else if (!rootEl) {
                    // fallback
                } else if (!rootEl.__slt_show) {
                    rootEl.style.display = 'block';
                }
            });
        }
    };

    function buildPreviewContext(graphic, tpl, instanceId, settings = {}) {
        const animIn = graphic.animation?.in || {};
        const animOut = graphic.animation?.out || {};
        
        // Merge styles: Instance overrides Template Defaults
        const ds = tpl.defaultStyle || {};
        const bgStyle = { ...(ds.background || {}), ...(graphic.style?.background || {}) };
        const typo = { ...(ds.typography || {}), ...(graphic.style?.typography || {}) };
        const subTypo = { ...(ds.subtitleTypography || {}), ...(graphic.style?.subtitleTypography || {}) };

        // Prepare OCG fields (serialize arrays to JSON)
        const customFields = {};
        if (graphic.fields) {
            Object.entries(graphic.fields).forEach(([k, v]) => {
                if (Array.isArray(v)) {
                    customFields[k] = JSON.stringify(v);
                } else {
                    customFields[k] = v;
                }
            });
        }

        let activeFontFamily = typo.fontFamily || 'Arial';
        if (settings && settings.globalFontGraphics && settings.globalFontGraphics.includes(graphic.id)) {
            activeFontFamily = settings.globalFontFamily || activeFontFamily;
        }

        const inDuration = animIn.duration ?? 0.5;
        const outDuration = animOut.duration ?? 0.3;
        const inDirection = animIn.direction || 'left';
        const outDirection = animOut.direction || 'left';
        const IDENTITY = 'translateX(0px) translateY(0px) scale(1)';
        const dirMap = { left: 'translateX(-1920px)', right: 'translateX(1920px)', top: 'translateY(-1080px)', bottom: 'translateY(1080px)' };
        const bg = bgStyle.type === 'gradient'
            ? `linear-gradient(${bgStyle.gradientAngle || 135}deg, ${bgStyle.color || '#1e3a8a'}, ${bgStyle.color2 || '#3b82f6'})`
            : (bgStyle.color || '#1e3a8a');

        let rawTitle = graphic.titleHtml || (graphic.titleLines?.length ? graphic.titleLines.map(l => `<div style="font-size:${l.fontSize || 48}px;font-weight:${l.fontWeight || '800'};color:${l.color || '#fff'};font-family:'${l.fontFamily || activeFontFamily}',sans-serif;text-transform:${l.textTransform || 'uppercase'}">${l.text}</div>`).join('') : (graphic.title || tpl.defaultFields?.title || ''));

        if (rawTitle && typeof rawTitle === 'string' && rawTitle.includes('<font')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawTitle;
            tempDiv.querySelectorAll('font').forEach(f => {
                const s = document.createElement('span');
                if (f.face) s.style.fontFamily = f.face;
                if (f.color) s.style.color = f.color;
                if (f.size) {
                    const sizes = { 1: '10', 2: '13', 3: '16', 4: '18', 5: '24', 6: '32', 7: '48' };
                    s.style.fontSize = (sizes[f.size] || '48') + 'px';
                }
                s.innerHTML = f.innerHTML;
                f.replaceWith(s);
            });
            rawTitle = tempDiv.innerHTML;
        }

        let rawItems = graphic.items || tpl.defaultFields?.items || [];
        const itemsData = rawItems.map(item => {
            let text = '';
            let category = '';
            
            if (typeof item === 'string') {
                text = item;
            } else if (item && typeof item === 'object') {
                text = item.text || '';
                category = item.category || '';
            }
            
            if (text && typeof text === 'string' && text.includes('<font')) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = text;
                tempDiv.querySelectorAll('font').forEach(f => {
                    const s = document.createElement('span');
                    if (f.face) s.style.fontFamily = f.face;
                    if (f.color) s.style.color = f.color;
                    if (f.size) {
                        const sizes = { 1: '10', 2: '13', 3: '16', 4: '18', 5: '24', 6: '32', 7: '48' };
                        s.style.fontSize = (sizes[f.size] || '48') + 'px';
                    }
                    s.innerHTML = f.innerHTML;
                    f.replaceWith(s);
                });
                text = tempDiv.innerHTML;
            }
            return { text, category };
        });

        // ITEMS is still strings for legacy templates
        const itemsStrings = itemsData.map(id => id.text);

        const globalShadow = settings?.globalShadow || { enabled: false };
        const shadowStr = globalShadow.enabled
            ? `${globalShadow.offsetX ?? 0}px ${globalShadow.offsetY ?? 2}px ${globalShadow.blur ?? 4}px ${globalShadow.color || 'rgba(0,0,0,0.5)'}`
            : 'none';

        const sepColor = bgStyle.borderColor || '#3b82f6';
        const SEPARATOR_CSS = (() => {
            switch (graphic.separatorStyle || 'skewed') {
                case 'none':   return 'display: none;';
                case 'dot':    return `width: 10px; height: 10px; background: ${sepColor}; border-radius: 50%; margin: 0 15px; transform: none; flex-shrink: 0;`;
                case 'square': return `width: 10px; height: 10px; background: ${sepColor}; margin: 0 15px; transform: none; flex-shrink: 0;`;
                case 'pipe':   return `width: 2px; height: 24px; background: ${sepColor}; margin: 0 15px; transform: none; flex-shrink: 0;`;
                default:       return `width: 12px; height: 24px; background: ${sepColor}; transform: skewX(-30deg); margin: 0 10px; flex-shrink: 0;`;
            }
        })();

        const wiperSettings = graphic.wiper || {};
        const wiperBg = (() => {
            const base = wiperSettings.bgColor || tpl.defaultFields?.secondaryColor || '#ff0000';
            if (wiperSettings.useGradient) {
                const c2 = wiperSettings.color2 || '#880000';
                const angle = wiperSettings.gradientAngle || 90;
                return `linear-gradient(${angle}deg, ${base} 0%, ${c2} 100%)`;
            }
            return base;
        })();

        const wiperGleamBg = (() => {
            const color = wiperSettings.gleamColor || '#ffffff';
            const opacity = wiperSettings.gleamOpacity ?? 0.4;
            // Convert hexagonal opacity (e.g. 0.4 -> 66 in hex) or just use rgba
            // For simplicity and compatibility with existing templating, we use rgba
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `linear-gradient(90deg, rgba(${r},${g},${b},0) 0%, rgba(${r},${g},${b},${opacity}) 50%, rgba(${r},${g},${b},0) 100%)`;
        })();

        const ctx = {
            ID: instanceId,
            TITLE: rawTitle,
            SUBTITLE: graphic.subtitle || tpl.defaultFields?.subtitle || '',
            INTRO_TEXT: graphic.introText !== undefined ? graphic.introText : (tpl.defaultFields?.introText || ''),
            WIPER_BG: wiperBg,
            WIPER_TEXT_COLOR: wiperSettings.textColor || '#ffffff',
            WIPER_FONT: wiperSettings.fontFamily || activeFontFamily,
            WIPER_FONT_SIZE: wiperSettings.fontSize || 35,
            WIPER_FONT_WEIGHT: wiperSettings.fontWeight || '900',
            WIPER_LETTER_SPACING: wiperSettings.letterSpacing ?? 1,
            WIPER_GLEAM_ENABLED: wiperSettings.gleamEnabled !== false,
            WIPER_GLEAM_BG: wiperGleamBg,
            WIPER_GLEAM_DURATION: wiperSettings.gleamDuration || 2,
            WIPER_GLEAM_HEIGHT: wiperSettings.gleamHeight || 100,
            WIPER_GLEAM_FREQUENCY: wiperSettings.gleamFrequency || 3,
            WIPER_GLEAM_OPACITY: wiperSettings.gleamOpacity ?? 0.4,
            ITEMS: itemsStrings,
            ITEMS_JSON: JSON.stringify(itemsData),
            ITEMS_B64: (() => { try { const s = JSON.stringify(itemsData); const b64 = (typeof btoa !== 'undefined') ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s).toString('base64'); return b64.replace(/=+$/, ''); } catch(e) { return ''; } })(),
            WIPER_TEXT: (graphic.introText !== undefined) ? graphic.introText : (tpl.defaultFields?.introText || ''),
            WIPER_SHOW: wiperSettings.show !== false,
            LOGO_URL: graphic.url || tpl.defaultFields?.logoUrl || '',
            TICKER_SPEED: graphic.speed || 100,
            TICKER_MODE: graphic.tickerMode || tpl.defaultFields?.tickerMode || 'whip',
            PRIMARY_COLOR: bgStyle.color || '#1e3a8a',
            PRIMARY_BG: bg,
            SECONDARY_COLOR: graphic.accentColor || bgStyle.borderColor || '#000000',
            BORDER_COLOR: bgStyle.borderColor || '#3b82f6',
            TITLE_COLOR: typo.color || '#ffffff',
            SUBTITLE_COLOR: subTypo.color || '#eeeeee',
            FONT_FAMILY: activeFontFamily,
            FONT_SIZE: typo.fontSize || 30,
            TITLE_SIZE: typo.fontSize || 48,
            TITLE_WEIGHT: typo.fontWeight || '800',
            TITLE_TRANSFORM: typo.textTransform || 'uppercase',
            PADDING_Y: typo.paddingY || 0,
            BOX_SHADOW: shadowStr,
            TITLE_FONT: activeFontFamily,
            SUBTITLE_SIZE: subTypo.fontSize || 24,
            BACKGROUND: bg,
            BORDER_RADIUS: (settings && settings.globalRadiusGraphics && settings.globalRadiusGraphics.includes(graphic.id)) ? (settings.globalBorderRadius || 0) : (bgStyle.borderRadius || 0),
            BORDER_WIDTH: bgStyle.borderWidth || 0,
            ANIMATION_DURATION: inDuration,
            ANIMATION_DELAY: (animIn.delay || 0),
            ANIMATION_EASE: animIn.ease || 'ease-out',
            ANIMATION_TRANSFORM: (() => {
                const type = animIn.type || 'slide';
                if (type === 'fade' || type === 'none') return 'none';
                if (type === 'zoom') return 'scale(0.85)';
                if (type === 'wipe') return 'scaleX(0)';
                return dirMap[inDirection] || 'translateX(-1920px)';
            })(),
            ANIMATION_IDENTITY: IDENTITY,
            ANIMATION_IN_TRANSFORM: (() => {
                const type = animIn.type || 'slide';
                if (type === 'fade' || type === 'none') return 'none';
                if (type === 'zoom') return 'scale(0.85)';
                if (type === 'wipe') return 'scaleX(0)';
                return dirMap[inDirection] || 'translateX(-1920px)';
            })(),
            ANIMATION_OUT_TRANSFORM: (() => {
                const type = animOut.type || 'slide';
                if (type === 'fade' || type === 'none') return 'none';
                if (type === 'zoom') return 'scale(0.85)';
                if (type === 'wipe') return 'scaleX(0)';
                return dirMap[outDirection] || 'translateX(-1920px)';
            })(),
            ANIMATION_OUT_DURATION: outDuration,
            ANIMATION_OUT_DELAY: (animOut.delay || 0),
            ANIMATION_OUT_EASE: animOut.ease || 'ease-in',
            LAYOUT_X: graphic.layout?.x || 0,
            LAYOUT_Y: graphic.layout?.y || 0,
            V_WIDTH: graphic.layout?.width || tpl.defaultLayout?.width || 1920,
            V_HEIGHT: graphic.layout?.height || tpl.defaultLayout?.height || 1080,
            SIDE_IMAGE: graphic.sideImage || '',
            LOGO_WIDTH: graphic.layout?.width || null,
            LOGO_HEIGHT: graphic.layout?.height || null,
            TRANSPARENT: (graphic.style?.background?.type === 'transparent' || !!graphic.style?.background?.transparent),
            LINE_HEIGHT: typo.lineHeight || '1.4',
            ANIMATION_IN_JSON: JSON.stringify(animIn),
            ANIMATION_OUT_JSON: JSON.stringify(animOut),
            TEXT_ANIM_JSON: JSON.stringify(graphic.animation?.text || { type: 'none' }),
            TEXT_ANIM_SYNC: !!graphic.animation?.textSync,
            TEXT_ANIM_OUT_JSON: JSON.stringify(graphic.animation?.textOut || { type: 'none' }),
            TEXT_ANIM_OUT_SYNC: !!graphic.animation?.textOut?.syncWithBase,
            SEPARATOR_CSS: SEPARATOR_CSS,
            DOM_CONTEXT: `document.getElementById("${instanceId}")`,
            ...customFields
        };

        // Intelligent OCG mapping: if TITLE/SUBTITLE are still standard/empty, 
        // try to find matching OCG fields (e.g. f-tytul-nazwa -> TITLE)
        const isStandardTitle = (ctx.TITLE === graphic.title || ctx.TITLE === tpl.defaultFields?.title || ctx.TITLE === tpl.name);
        if (isStandardTitle) {
            const titleKey = Object.keys(customFields).find(k => /title|tytul|nazwa/i.test(k) && !/sub/i.test(k));
            if (titleKey) ctx.TITLE = customFields[titleKey];
        }
        const isStandardSub = (!ctx.SUBTITLE || ctx.SUBTITLE === tpl.defaultFields?.subtitle);
        if (isStandardSub) {
            const subKey = Object.keys(customFields).find(k => /sub|opis|funkcja/i.test(k));
            if (subKey) ctx.SUBTITLE = customFields[subKey];
        }

        console.log("RENDERER CONTEXT FOR:", graphic.id, tpl.id, ctx);
        return ctx;
    }

    // Start — only run if this is the output.html renderer context
    if (container) {
        initRenderer();
    }

})(); // end IIFE
