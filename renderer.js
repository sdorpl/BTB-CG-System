; (function () {
    'use strict';

    // Injection of global styles for automatic text squashing (scaleX)
    const style = document.createElement('style');
    style.textContent = `
        .slt-squash {
            display: inline-block !important;
            transform-origin: left center !important;
            white-space: nowrap !important;
        }
    `;
    document.head.appendChild(style);

    function applyGlobalSquashing(root) {
        if (!root) return;
        const enabled = root.getAttribute('data-squash-enabled') !== 'false';
        if (!enabled) {
            // If disabled, reset any existing transforms on squashing targets
            root.querySelectorAll('.slt-squash').forEach(t => t.style.transform = 'none');
            return;
        }
        const targets = root.querySelectorAll('.slt-squash');
        targets.forEach(target => {
            const container = target.parentElement;
            if (!container) return;
            
            // Reset scale to measure natural width
            target.style.transform = 'none';
            
            const containerWidth = container.clientWidth;
            const textWidth = target.scrollWidth;
            
            if (textWidth > containerWidth && containerWidth > 0) {
                const scale = containerWidth / textWidth;
                target.style.transform = `scaleX(${scale})`;
            }
        });
    }

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

        // 1.5. Pre-measure NEW graphics in hidden renderer (for docking).
        //       This gives us FINAL bounds before any animation starts,
        //       so docked children can be placed correctly from frame 0.
        newActiveGraphics.forEach(graphic => {
            if (!activeGraphics[graphic.id] && !_premeasured.has(graphic.id)) {
                premeasureBounds(graphic, settings);
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
        
        recalculateAttachments(graphics, settings);
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

        // Compute initial offset using PREMEASURED parent bounds (hidden renderer).
        // Falls back to declared layout dimensions if premeasured data not available.
        // This ensures child is placed at the correct final position from frame 0.
        function calcInitialOffset(attachField, offsetField, edgeField, axis) {
            if (!data.layout?.[attachField]) return 0;
            const ids = Array.isArray(data.layout[attachField])
                ? data.layout[attachField]
                : [data.layout[attachField]];

            const visibleParents = ids
                .map(pid => {
                    if (typeof pid === 'string' && pid.startsWith('group:')) {
                        const gid = pid.replace('group:', '');
                        return allGraphics.filter(vg => vg.groupId === gid && vg.visible);
                    }
                    const p = allGraphics.find(g => g.id === pid);
                    return (p && p.visible) ? [p] : [];
                })
                .flat();

            if (visibleParents.length === 0) return 0;

            const gap  = data.layout[offsetField] || 0;
            const edge = data.layout[edgeField]   || 'auto';

            if (axis === 'y') {
                let minT = Infinity, maxB = -Infinity;
                visibleParents.forEach(p => {
                    // Use premeasured bounds if available (accurate final-state dims)
                    const pm = _premeasured.get(p.id);
                    const pT = pm ? pm.top : (p.layout?.y || 0);
                    const pB = pm ? pm.bottom : (pT + (p.layout?.height || 60));
                    if (pT < minT) minT = pT;
                    if (pB > maxB) maxB = pB;
                });
                // Own premeasured bounds for natural position
                const myPm = _premeasured.get(data.id);
                const myY  = myPm ? myPm.top : (data.layout?.y || 0);
                const myH  = myPm ? myPm.height : (data.layout?.height || 60);
                const onBottom = data.layout?.side?.startsWith('bottom') ||
                                ((!data.layout?.side || data.layout.side === 'custom') && myY > 540);
                if (edge === 'manual') return gap;
                if (edge === 'top')    return minT - gap - myH - myY;
                if (edge === 'bottom') return maxB + gap - myY;
                return onBottom ? (minT - gap - myH - myY) : (maxB + gap - myY);
            } else {
                let minL = Infinity, maxR = -Infinity;
                visibleParents.forEach(p => {
                    const pm = _premeasured.get(p.id);
                    const pL = pm ? pm.left : (p.layout?.x || 0);
                    const pR = pm ? pm.right : (pL + (p.layout?.width || 1920));
                    if (pL < minL) minL = pL;
                    if (pR > maxR) maxR = pR;
                });
                const myPm = _premeasured.get(data.id);
                const myX  = myPm ? myPm.left : (data.layout?.x || 0);
                const myW  = myPm ? myPm.width : (data.layout?.width || 1920);
                const onRight = data.layout?.side?.endsWith('right');
                if (edge === 'manual') return gap;
                if (edge === 'left')   return minL - gap - myW - myX;
                if (edge === 'right')  return maxR + gap - myX;
                return onRight ? (minL - gap - myW - myX) : (maxR + gap - myX);
            }
        }

        initialOffsetY = calcInitialOffset('attachedToGraphicId',  'attachOffsetY', 'attachToEdgeY', 'y');
        initialOffsetX = calcInitialOffset('attachedToGraphicIdX', 'attachOffsetX', 'attachToEdgeX', 'x');

        // Apply layout transform to outer wrapper
        layoutStyleWrapper.id = 'layout-wrapper-' + instanceId;
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
            // Clean out any self-injected #ids if the template author put them there natively.
            // NOTE: We strip the *compiled* #instanceId that came from {{ID}} in the template.
            // The scoping regex below will then re-add it properly for all known class prefixes.
            cssStr = cssStr.replace(new RegExp(`#${instanceId}\\s+`, 'g'), '');

            // Advanced Scoping:
            // By prefixing common generic classes with #instanceId, we sandbox the CSS.
            // IMPORTANT: 'utk-' must be here so that .utk-wiper, .utk-container etc. get scoped.
            // Without it, those rules would be global after the strip above.
            cssStr = cssStr.replace(/\.(rep-|lt-|modern-|na-zywo-|plate|title|subtitle|ticker|dot|news-|wiper-|utk-)[a-zA-Z0-9_-]*/g, `#${instanceId} $&`);

            // @keyframes scoping: rename all @keyframes to include instanceId so that
            // multiple instances of the same template do NOT overwrite each other's animations.
            const keyframeNames = [];
            cssStr = cssStr.replace(/@keyframes\s+([\w-]+)/g, (match, name) => {
                const scopedName = `${name}_${instanceId}`;
                keyframeNames.push({ original: name, scoped: scopedName });
                return `@keyframes ${scopedName}`;
            });
            // Replace animation references to use the scoped keyframe names
            keyframeNames.forEach(({ original, scoped }) => {
                // Match animation property values that reference the original name
                cssStr = cssStr.replace(
                    new RegExp(`(animation:[^;]*?)\\b${original}\\b`, 'g'),
                    (match, prefix) => `${prefix}${scoped}`
                );
            });

            // Gradient override: if the graphic uses a gradient background, force it onto
            // container elements specifically (but NOT wiper, ticker-track, msg-box which have their own colors).
            const bgData = data.style?.background || {};
            const globalRadiusGraphics = settings?.globalRadiusGraphics || [];
            const isGlobalRadius = globalRadiusGraphics.includes(data.id);
            const borderRadius = isGlobalRadius ? (settings.globalBorderRadius || 0) : (bgData.borderRadius || 0);

            if (bgData.type === 'gradient') {
                const angle = bgData.gradientAngle || 135;
                const c1 = bgData.color || '#1e3a8a';
                const c2 = bgData.color2 || '#3b82f6';
                const gradientVal = `linear-gradient(${angle}deg, ${c1}, ${c2})`;
                // Target container/bar elements specifically, but EXCLUDE wiper/ticker elements
                // that have their own distinct background colors (wiper, msg-box, track, etc.)
                cssStr += `\n/* gradient override */`;
                cssStr += `\n#${instanceId} [class*="container"]:not([class*="utk"]):not([class*="wiper"]):not([class*="msg"]):not([class*="track"]), #${instanceId} [class*="-bar"], #${instanceId} [class*="wrapper"]:not([class*="utk"]), #${instanceId} [class*="plate"] { background: ${gradientVal} !important; background-color: transparent !important; }`;
            }

            if (isGlobalRadius || bgData.borderRadius > 0) {
                cssStr += `\n/* border radius override */`;
                cssStr += `\n#${instanceId} [class*="container"]:not([class*="utk"]):not([class*="wiper"]), #${instanceId} [class*="-bar"], #${instanceId} [class*="wrapper"]:not([class*="utk"]), #${instanceId} [class*="plate"] { border-radius: ${borderRadius}px !important; overflow: hidden !important; }`;
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
                cssStr += `\n#${instanceId} p, #${instanceId} div { margin: 0; padding: 0; }`;
                
                if (yS === 'top') cssStr += `\n#${instanceId} { align-items: flex-start; padding-top: ${my}px; }`;
                else if (yS === 'bottom') cssStr += `\n#${instanceId} { align-items: flex-end; padding-bottom: ${my}px; }`;
                else if (yS === 'center') cssStr += `\n#${instanceId} { align-items: center; }`;

                if (xS === 'left') cssStr += `\n#${instanceId} { justify-content: flex-start; padding-left: ${mx}px; }`;
                else if (xS === 'right') cssStr += `\n#${instanceId} { justify-content: flex-end; padding-right: ${mx}px; }`;
                else if (xS === 'center') cssStr += `\n#${instanceId} { justify-content: center; }`;
            }

            // Apply line-height from context
            cssStr += `\n#${instanceId} { line-height: ${ctx.LINE_HEIGHT || 1.4}; }`;

            const style = document.createElement('style');
            style.textContent = cssStr;
            layoutStyleWrapper.appendChild(style);
        }


        container.appendChild(layoutStyleWrapper);

        // Save metadata
        activeGraphics[data.id] = {
            el: layoutStyleWrapper,
            instanceId: instanceId,
            autoScale: autoScale, // Store for recalculateAttachments
            hash: JSON.stringify({
                title: data.title, subtitle: data.subtitle,
                titleHtml: data.titleHtml, titleLines: data.titleLines,
                layout: data.layout, animation: data.animation,
                style: data.style, sideImage: data.sideImage,
                speed: data.speed, items: data.items, wiper: data.wiper,
                fields: data.fields,
                activeGlobalFontFamily: (settings && settings.globalFontGraphics && settings.globalFontGraphics.includes(data.id)) ? settings.globalFontFamily : null
            }),
            isHiding: false,
            _dockOffY: initialOffsetY,
            _dockOffX: initialOffsetX,
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
                        rootEl.setAttribute('data-squash-enabled', data.style?.typography?.squatEnabled !== false);
                    }
                    if (rootEl.__slt_show) {
                        rootEl.__slt_show();
                    } else {
                        rootEl.style.display = 'block';
                    }
                    // Apply global text squashing after initial render/animation trigger
                    requestAnimationFrame(() => applyGlobalSquashing(rootEl));
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
        } else {
            removeElement(id, meta);
        }
    }

    // ============================================================
    // DOCKING / ATTACHMENT SYSTEM
    // ============================================================
    //
    // Architecture:
    //   1. premeasureBounds     — renders graphic in a hidden 1920×1080 container with
    //                             all animations forced to final state, measures the
    //                             FINAL content bounds (before any real animation starts)
    //   2. _runDockingCalc      — uses premeasured natural positions + multi-pass offset
    //                             propagation for chains (A→B→C)
    //   3. recalculateAttachments — entry: premeasures parents, runs calc, sets up
    //                               ResizeObserver for steady-state
    //   4. measureLiveBounds    — reads real DOM bounds (for ResizeObserver / steady state)
    // ============================================================

    const _premeasured    = new Map();   // graphicId → bounds in 1920×1080 (final state)
    const _dockObservers  = new Map();   // parentId  → ResizeObserver
    let   _measureEl      = null;        // hidden off-screen container (lazy init)

    /**
     * Returns (or creates) a hidden 1920×1080 container for off-screen measurement.
     */
    function _getMeasureContainer() {
        if (!_measureEl) {
            _measureEl = document.createElement('div');
            _measureEl.id = '__cg-premeasure';
            _measureEl.style.cssText =
                'position:fixed;left:-9999px;top:-9999px;' +
                'width:1920px;height:1080px;overflow:hidden;' +
                'visibility:hidden;pointer-events:none;z-index:-1;';
            document.body.appendChild(_measureEl);
        }
        return _measureEl;
    }

    /**
     * Renders a graphic off-screen with animations forced to final state,
     * measures its content bounds, and caches the result in _premeasured.
     *
     * Returns { top, bottom, left, right, width, height } in 1920×1080 px, or null.
     */
    function premeasureBounds(graphic, settings = {}) {
        const tpl = templates.find(t => t.id === graphic.templateId);
        if (!tpl) return null;

        const mc = _getMeasureContainer();
        const instanceId = `__pm_${graphic.id.replace(/-/g, '')}`;
        const ctx = buildPreviewContext(graphic, tpl, instanceId, settings);

        const compile = (str) => {
            if (!str) return '';
            try { return Handlebars.compile(str)(ctx); }
            catch (e) { return str; }
        };

        const htmlStr = compile(tpl.html_template);
        let cssStr = tpl.css_template ? compile(tpl.css_template) : '';

        // ── CSS scoping (mirrors showGraphic) ──────────────────────
        cssStr = cssStr.replace(new RegExp(`#${instanceId}\\s+`, 'g'), '');
        cssStr = cssStr.replace(
            /\.(rep-|lt-|modern-|na-zywo-|plate|title|subtitle|ticker|dot|news-|wiper-|utk-)[a-zA-Z0-9_-]*/g,
            `#${instanceId} $&`);
        // Scope keyframes
        const kfNames = [];
        cssStr = cssStr.replace(/@keyframes\s+([\w-]+)/g, (_, name) => {
            const scoped = `${name}_${instanceId}`;
            kfNames.push({ original: name, scoped });
            return `@keyframes ${scoped}`;
        });
        kfNames.forEach(({ original, scoped }) => {
            cssStr = cssStr.replace(
                new RegExp(`(animation:[^;]*?)\\b${original}\\b`, 'g'),
                (m, prefix) => `${prefix}${scoped}`);
        });

        // Gradient & border-radius overrides
        const bgData = graphic.style?.background || {};
        const globalRadiusGraphics = settings?.globalRadiusGraphics || [];
        const isGlobalRadius = globalRadiusGraphics.includes(graphic.id);
        const borderRadius = isGlobalRadius
            ? (settings.globalBorderRadius || 0)
            : (bgData.borderRadius || 0);

        if (bgData.type === 'gradient') {
            const gv = `linear-gradient(${bgData.gradientAngle||135}deg, ${bgData.color||'#1e3a8a'}, ${bgData.color2||'#3b82f6'})`;
            cssStr += `\n#${instanceId} [class*="container"]:not([class*="utk"]):not([class*="wiper"]):not([class*="msg"]):not([class*="track"]), #${instanceId} [class*="-bar"], #${instanceId} [class*="wrapper"]:not([class*="utk"]), #${instanceId} [class*="plate"] { background:${gv}!important; background-color:transparent!important; }`;
        }
        if (isGlobalRadius || bgData.borderRadius > 0) {
            cssStr += `\n#${instanceId} [class*="container"]:not([class*="utk"]):not([class*="wiper"]), #${instanceId} [class*="-bar"], #${instanceId} [class*="wrapper"]:not([class*="utk"]), #${instanceId} [class*="plate"] { border-radius:${borderRadius}px!important; overflow:hidden!important; }`;
        }

        // Side layout
        if (graphic.layout?.side && graphic.layout.side !== 'custom') {
            const parts = graphic.layout.side.split('-');
            const yS = (graphic.layout.side === 'center') ? 'center' : parts[0];
            const xS = (graphic.layout.side === 'center') ? 'center' : (parts[1] || 'center');
            const mx = graphic.layout?.marginX || 0;
            const my = graphic.layout?.marginY || 0;
            cssStr += `\n#${instanceId} { display:flex;width:100%;height:100%;box-sizing:border-box; }`;
            cssStr += `\n#${instanceId} > * { position:relative!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;margin:0!important; }`;
            if (yS === 'top')         cssStr += `\n#${instanceId} { align-items:flex-start;padding-top:${my}px; }`;
            else if (yS === 'bottom') cssStr += `\n#${instanceId} { align-items:flex-end;padding-bottom:${my}px; }`;
            else                      cssStr += `\n#${instanceId} { align-items:center; }`;
            if (xS === 'left')        cssStr += `\n#${instanceId} { justify-content:flex-start;padding-left:${mx}px; }`;
            else if (xS === 'right')  cssStr += `\n#${instanceId} { justify-content:flex-end;padding-right:${mx}px; }`;
            else                      cssStr += `\n#${instanceId} { justify-content:center; }`;
        }

        // Force FINAL visibility state — kill all animations / transitions / hidden states
        cssStr += `\n#${instanceId}, #${instanceId} * { transition:none!important; animation:none!important; }`;
        cssStr = cssStr.replace(/opacity\s*:\s*0\b/g, 'opacity:1');
        cssStr = cssStr.replace(
            /transform\s*:\s*(translateX\([^)]+\)|translateY\([^)]+\)|scale\([^)]+\)|scaleX\([^)]+\))/g,
            'transform:none');

        cssStr += `\n#${instanceId} { line-height:${ctx.LINE_HEIGHT || 1.4}; }`;

        // ── Build DOM ──────────────────────────────────────────────
        const wrapper = document.createElement('div');
        wrapper.style.cssText =
            'position:absolute;top:0;left:0;width:1920px;height:1080px;' +
            'pointer-events:none;transform-origin:0 0;';
        wrapper.style.transform = getLayoutTransform(graphic.layout, 1, 0, 0);
        wrapper.style.setProperty('--v-width',  formatDimension(graphic.layout?.width, '90%'));
        wrapper.style.setProperty('--v-height', formatDimension(graphic.layout?.height, 'auto'));

        const styleEl = document.createElement('style');
        styleEl.textContent = cssStr;
        wrapper.appendChild(styleEl);

        const root = document.createElement('div');
        root.id = instanceId;
        root.className = 'lt-root';
        root.innerHTML = htmlStr;
        wrapper.appendChild(root);

        mc.appendChild(wrapper);
        void wrapper.offsetHeight; // force layout

        // ── Measure ────────────────────────────────────────────────
        const mcRect  = mc.getBoundingClientRect();
        const maxArea = 1920 * 1080 * 0.85;
        let bounds = null;

        // Fast path: firstElementChild
        const primary = root.firstElementChild;
        if (primary) {
            const r = primary.getBoundingClientRect();
            if (r.width >= 1 && r.height >= 1 && r.width * r.height < maxArea) {
                bounds = {
                    top:    r.top    - mcRect.top,
                    bottom: r.bottom - mcRect.top,
                    left:   r.left   - mcRect.left,
                    right:  r.right  - mcRect.left,
                    width:  r.width,
                    height: r.height,
                };
            }
        }

        // Deep scan fallback
        if (!bounds) {
            let minT = Infinity, maxB = -Infinity, minL = Infinity, maxR = -Infinity;
            let found = false;
            for (const el of root.querySelectorAll('*')) {
                const st = window.getComputedStyle(el);
                if (st.display === 'none' || st.visibility === 'hidden') continue;
                const rect = el.getBoundingClientRect();
                if (rect.width < 1 || rect.height < 1) continue;
                if (rect.width * rect.height > maxArea) continue;
                const hasBg = (st.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                               st.backgroundColor !== 'transparent') ||
                              st.backgroundImage !== 'none';
                const hasBorder = parseInt(st.borderTopWidth)  > 0 ||
                                  parseInt(st.borderBottomWidth) > 0 ||
                                  parseInt(st.borderLeftWidth)   > 0 ||
                                  parseInt(st.borderRightWidth)  > 0;
                const isMedia = el.tagName === 'IMG' || el.tagName === 'SVG' || el.tagName === 'VIDEO';
                if (!hasBg && !hasBorder && !isMedia) continue;
                const rT = rect.top - mcRect.top, rB = rect.bottom - mcRect.top;
                const rL = rect.left - mcRect.left, rR = rect.right - mcRect.left;
                if (rT < minT) minT = rT; if (rB > maxB) maxB = rB;
                if (rL < minL) minL = rL; if (rR > maxR) maxR = rR;
                found = true;
            }
            if (found) {
                bounds = {
                    top: minT, bottom: maxB, left: minL, right: maxR,
                    width: maxR - minL, height: maxB - minT,
                };
            }
        }

        // ── Cleanup ────────────────────────────────────────────────
        mc.removeChild(wrapper);

        if (bounds) _premeasured.set(graphic.id, bounds);
        return bounds;
    }

    /**
     * Measures live DOM bounds of a graphic in 1920×1080 space.
     * Used by ResizeObserver callbacks (steady-state, after animations are done).
     */
    function measureLiveBounds(graphicId, containerRect) {
        const meta = activeGraphics[graphicId];
        if (!meta) return null;
        const rootEl = document.getElementById(meta.instanceId);
        if (!rootEl) return null;

        const scale   = containerRect.width / 1920;
        const maxArea = containerRect.width * containerRect.height * 0.85;

        const primary = rootEl.firstElementChild;
        if (primary) {
            const r = primary.getBoundingClientRect();
            if (r.width >= 1 && r.height >= 1 && r.width * r.height < maxArea) {
                return {
                    top:    (r.top    - containerRect.top)  / scale,
                    bottom: (r.bottom - containerRect.top)  / scale,
                    left:   (r.left   - containerRect.left) / scale,
                    right:  (r.right  - containerRect.left) / scale,
                    width:  r.width  / scale,
                    height: r.height / scale,
                };
            }
        }
        return null;
    }

    /**
     * Resolves attachment target IDs (may include "group:xxx") into
     * an array of resolved graphic IDs that are currently visible.
     */
    function resolveTargetIds(rawIds, graphics) {
        const out = [];
        (Array.isArray(rawIds) ? rawIds : [rawIds]).forEach(pid => {
            if (!pid) return;
            if (typeof pid === 'string' && pid.startsWith('group:')) {
                const gid = pid.replace('group:', '');
                graphics.forEach(g => { if (g.groupId === gid && g.visible) out.push(g.id); });
            } else {
                const pg = graphics.find(g => g.id === pid);
                if (pg && pg.visible) out.push(pid);
            }
        });
        return out;
    }

    /**
     * Core docking calculation.
     *
     * Uses NATURAL positions (from premeasured or live-minus-offset) and
     * multi-pass offset propagation for chains (A→B→C).
     *
     * @param {Array}   graphics  — full graphics list
     * @param {boolean} smooth    — true → CSS transition, false → instant
     */
    function _runDockingCalc(graphics, smooth) {
        const visible = graphics.filter(g =>
            g.visible && activeGraphics[g.id] && !activeGraphics[g.id].isHiding);
        if (visible.length === 0) return;

        // ── Phase A: resolve natural positions ───────────────────────
        // Natural = where the graphic would be WITHOUT any docking offset.
        // Source priority: premeasured (final state) > live DOM − offset > layout declaration
        const natPos = {};
        const rc = document.getElementById('render-container');
        const cRect = rc ? rc.getBoundingClientRect() : null;

        visible.forEach(g => {
            const meta = activeGraphics[g.id];
            const pm = _premeasured.get(g.id);
            if (pm) {
                natPos[g.id] = { top: pm.top, left: pm.left, height: pm.height, width: pm.width };
                return;
            }
            // Fallback: live DOM − current offset
            if (cRect && cRect.width > 1) {
                const live = measureLiveBounds(g.id, cRect);
                if (live) {
                    natPos[g.id] = {
                        top:    live.top  - (meta._dockOffY || 0),
                        left:   live.left - (meta._dockOffX || 0),
                        height: live.height,
                        width:  live.width,
                    };
                    return;
                }
            }
            // Last resort: layout declaration
            const isCustom = !g.layout?.side || g.layout.side === 'custom';
            natPos[g.id] = {
                top:    isCustom ? (g.layout?.y || 0) : 0,
                left:   isCustom ? (g.layout?.x || 0) : 0,
                height: g.layout?.height || 60,
                width:  g.layout?.width || 1920,
            };
        });

        // ── Phase B: multi-pass offset propagation ───────────────────
        const offsets = {};
        visible.forEach(g => offsets[g.id] = { y: 0, x: 0 });

        for (let pass = 0; pass < 5; pass++) {
            let changed = false;

            visible.forEach(g => {
                if (!g.layout) return;
                let newY = 0, newX = 0;

                // ── Y-axis ──
                if (g.layout.attachedToGraphicId) {
                    const targets = resolveTargetIds(g.layout.attachedToGraphicId, graphics);
                    let minT = Infinity, maxB = -Infinity;
                    let found = false;

                    targets.forEach(tid => {
                        const nat = natPos[tid];
                        if (!nat) return;
                        const adjTop = nat.top + (offsets[tid]?.y || 0);
                        const adjBot = adjTop + nat.height;
                        if (adjTop < minT) minT = adjTop;
                        if (adjBot > maxB) maxB = adjBot;
                        found = true;
                    });

                    if (found) {
                        const me   = natPos[g.id];
                        const gap  = g.layout.attachOffsetY || 0;
                        const edge = g.layout.attachToEdgeY || 'auto';

                        if (edge === 'manual')      newY = gap;
                        else if (edge === 'top')    newY = (minT - gap - me.height) - me.top;
                        else if (edge === 'bottom') newY = (maxB + gap) - me.top;
                        else /* auto */ newY = minT > 540
                            ? (minT - gap - me.height) - me.top
                            : (maxB + gap) - me.top;
                    }
                }

                // ── X-axis ──
                if (g.layout.attachedToGraphicIdX) {
                    const targets = resolveTargetIds(g.layout.attachedToGraphicIdX, graphics);
                    let minL = Infinity, maxR = -Infinity;
                    let found = false;

                    targets.forEach(tid => {
                        const nat = natPos[tid];
                        if (!nat) return;
                        const adjLeft  = nat.left + (offsets[tid]?.x || 0);
                        const adjRight = adjLeft + nat.width;
                        if (adjLeft  < minL) minL = adjLeft;
                        if (adjRight > maxR) maxR = adjRight;
                        found = true;
                    });

                    if (found) {
                        const me   = natPos[g.id];
                        const gap  = g.layout.attachOffsetX || 0;
                        const edge = g.layout.attachToEdgeX || 'auto';

                        if (edge === 'manual')     newX = gap;
                        else if (edge === 'left')  newX = (minL - gap - me.width) - me.left;
                        else if (edge === 'right') newX = (maxR + gap) - me.left;
                        else /* auto */ newX = minL > 960
                            ? (minL - gap - me.width) - me.left
                            : (maxR + gap) - me.left;
                    }
                }

                if (Math.abs(offsets[g.id].y - newY) > 0.3 ||
                    Math.abs(offsets[g.id].x - newX) > 0.3) {
                    offsets[g.id] = { y: newY, x: newX };
                    changed = true;
                }
            });

            if (!changed) break;
        }

        // ── Phase C: apply transforms ────────────────────────────────
        visible.forEach(g => {
            const off  = offsets[g.id];
            const meta = activeGraphics[g.id];
            if (!meta?.el) return;

            const dY = Math.abs(off.y - (meta._dockOffY || 0));
            const dX = Math.abs(off.x - (meta._dockOffX || 0));
            if (dY < 0.3 && dX < 0.3) return;

            meta._dockOffY = off.y;
            meta._dockOffX = off.x;

            const transform = getLayoutTransform(
                g.layout, meta.autoScale || 1, off.y, off.x);

            // Always animate docking moves — use GSAP for buttery-smooth easing.
            // Duration scales with distance: small nudges are fast, large moves are slower.
            const distance = Math.sqrt(dY * dY + dX * dX);
            const duration = Math.min(Math.max(distance / 600, 0.3), 0.8);

            if (window.gsap) {
                window.gsap.to(meta.el, {
                    transform: transform,
                    duration: duration,
                    ease: 'power2.out',
                    overwrite: 'auto',
                });
            } else {
                meta.el.style.transition =
                    `transform ${duration}s cubic-bezier(0.22, 1, 0.36, 1)`;
                meta.el.style.transform = transform;
            }
        });
    }

    // ── Steady-state ResizeObserver ──────────────────────────────────────
    function _setupDockObservers(graphics) {
        _dockObservers.forEach(ro => ro.disconnect());
        _dockObservers.clear();

        const parentIds = new Set();
        graphics.forEach(g => {
            if (!g.visible) return;
            [g.layout?.attachedToGraphicId, g.layout?.attachedToGraphicIdX].forEach(field => {
                if (!field) return;
                (Array.isArray(field) ? field : [field]).forEach(id => {
                    if (id && !id.startsWith('group:')) parentIds.add(id);
                });
            });
        });

        parentIds.forEach(pid => {
            const meta = activeGraphics[pid];
            if (!meta) return;
            const rootEl = document.getElementById(meta.instanceId);
            if (!rootEl?.firstElementChild) return;

            const ro = new ResizeObserver(() => {
                // Steady-state: re-premeasure parent with live content,
                // then recalculate smoothly
                const g = graphics.find(pg => pg.id === pid);
                if (g) {
                    // Update premeasured cache from live DOM
                    const rc2 = document.getElementById('render-container');
                    if (rc2) {
                        const cr = rc2.getBoundingClientRect();
                        const live = measureLiveBounds(pid, cr);
                        if (live) {
                            // Store live bounds minus current offset → natural pos
                            _premeasured.set(pid, {
                                top:    live.top  - (meta._dockOffY || 0),
                                bottom: live.bottom - (meta._dockOffY || 0),
                                left:   live.left - (meta._dockOffX || 0),
                                right:  live.right - (meta._dockOffX || 0),
                                width:  live.width,
                                height: live.height,
                            });
                        }
                    }
                }
                _runDockingCalc(graphics, true);
            });
            ro.observe(rootEl.firstElementChild);
            _dockObservers.set(pid, ro);
        });
    }

    /**
     * Main entry point for docking.
     *
     * 1. Pre-measures all newly visible graphics in hidden renderer (final state)
     * 2. Runs docking calc instantly (child placed correctly from frame 0)
     * 3. Sets up ResizeObserver for content-change tracking
     */
    function recalculateAttachments(graphics, settings) {
        // Evict cache for hidden graphics
        _premeasured.forEach((_, id) => {
            const g = graphics.find(p => p.id === id);
            if (!g || !g.visible) _premeasured.delete(id);
        });

        // Pre-measure all visible graphics that aren't cached yet
        const visibleGraphics = graphics.filter(g => g.visible);
        visibleGraphics.forEach(g => {
            if (!_premeasured.has(g.id)) {
                premeasureBounds(g, settings || {});
            }
        });

        // Run docking calc instantly (no rAF loop needed — premeasured = final)
        _runDockingCalc(graphics, false);

        // Set up ResizeObserver for steady-state content changes
        _setupDockObservers(graphics);
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
                cssStr = cssStr.replace(/\.(rep-|lt-|modern-|na-zywo-|plate|title|subtitle|ticker|dot|news-|wiper-|utk-)[a-zA-Z0-9_-]*/g, `#${instanceId} $&`);
                cssStr = cssStr.replace(/#\{\{ID\}\}|#GRAPHIC_ID/g, `#${instanceId}`);

                const layoutStyleWrapper = document.createElement('div');
                layoutStyleWrapper.id = 'layout-wrapper-' + instanceId;
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
                    // Target container/bar elements but exclude utk-* ticker/wiper elements with their own colors
                    cssStr += `\n/* gradient override */`;
                    cssStr += `\n#${instanceId} [class*="container"]:not([class*="utk"]):not([class*="wiper"]):not([class*="msg"]):not([class*="track"]), #${instanceId} [class*="-bar"], #${instanceId} [class*="wrapper"]:not([class*="utk"]), #${instanceId} [class*="plate"] { background: ${gradientVal2} !important; background-color: transparent !important; }`;
                }

                if (isGlobalRadiusPrev || bgData2.borderRadius > 0) {
                    cssStr += `\n/* border radius override */`;
                    cssStr += `\n#${instanceId} [class*="container"]:not([class*="utk"]):not([class*="wiper"]), #${instanceId} [class*="-bar"], #${instanceId} [class*="wrapper"]:not([class*="utk"]), #${instanceId} [class*="plate"] { border-radius: ${borderRadiusPrev}px !important; overflow: hidden !important; }`;
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
                    cssStr += `\n#${instanceId} p, #${instanceId} div { margin: 0; padding: 0; }`;
                    
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
                // Apply line-height from context
                cssStr += `\n#${instanceId} { line-height: ${context.LINE_HEIGHT || 1.4}; }`;

                innerContainer.appendChild(styleEl);

                // Inject HTML scoped with ID, matching showGraphic wrapping
                const wrapperDiv = document.createElement('div');
                wrapperDiv.id = instanceId;
                wrapperDiv.className = 'lt-root';
                wrapperDiv.setAttribute('data-squash-enabled', graphic.style?.typography?.squatEnabled !== false);
                wrapperDiv.innerHTML = htmlStr;
                innerContainer.appendChild(wrapperDiv);

                layoutStyleWrapper.appendChild(innerContainer);

                containerEl.appendChild(layoutStyleWrapper);
                const meta = {
                    id: graphic.id,
                    instanceId: instanceId,
                    autoScale: autoScale, // Store for recalculateAttachments
                    el: layoutStyleWrapper,
                    hash: JSON.stringify(graphic),
                    appliedAttachOffsetY: 0,
                    appliedAttachOffsetX: 0
                };
                instances[graphic.id] = meta;

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

                // Apply global text squashing to preview instances
                requestAnimationFrame(() => applyGlobalSquashing(rootEl));
            });

            // Trigger docking in preview
            recalculateAttachments(visibleGraphics, settings);
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
            WIPER_GLEAM_WIDTH: wiperSettings.gleamWidth || 150,
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

        // Handle LOGO_URL / IMAGE prioritisation: if standard/empty, use graphic.url (Alpha upload)
        const isStandardLogo = (!ctx.LOGO_URL || ctx.LOGO_URL === tpl.defaultFields?.LOGO_URL || ctx.LOGO_URL === tpl.defaultFields?.logoUrl);
        if (isStandardLogo && graphic.url) {
            ctx.LOGO_URL = graphic.url;
        }

        console.log("RENDERER CONTEXT FOR:", graphic.id, tpl.id, ctx);
        return ctx;
    }

    // Start — only run if this is the output.html renderer context
    if (container) {
        initRenderer();
    }

})(); // end IIFE
