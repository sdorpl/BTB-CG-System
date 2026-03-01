const CHANNEL_NAME = 'cg_channel';
const channel = new BroadcastChannel(CHANNEL_NAME);

const container = document.getElementById('render-container');
let activeGraphics = {}; // Map of graphic.id -> DOM element metadata
let templates = [];

// Layout Util ported from TemplateUtils
function getLayoutTransform(layout, autoScale = 1) {
    const x = layout?.x || 0;
    const y = layout?.y || 0;
    const scale = layout?.scale || 1;
    const rotation = layout?.rotation || 0;
    return `scale(${autoScale}) translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;
}

// Ensure GSAP is global for eval
window.gsap = gsap;

// On load, fetch DB locally just in case panel hasn't broadcasted yet
async function initRenderer() {
    try {
        const stored = localStorage.getItem('cg_db');
        if (stored) {
            handleStateUpdate(JSON.parse(stored));
        } else {
            const res = await fetch('db.json');
            handleStateUpdate(await res.json());
        }
    } catch (e) {
        console.error("Renderer Init Failed:", e);
    }
}

// Channel Listener
channel.onmessage = (event) => {
    if (event.data.type === 'SYNC_STATE') {
        handleStateUpdate(event.data.payload);
    }
};

function handleStateUpdate(state) {
    templates = state.templates || [];
    const graphics = state.graphics || [];

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
            showGraphic(graphic);
        } else {
            // It's already visible but properties might have changed (text editing)
            // For now, if text is edited live, we re-render it. 
            // In a pro system we'd diff text and update DOM, but re-rendering is easier for GSAP
            const existingHash = activeGraphics[graphic.id].hash;
            const newHash = JSON.stringify({
                title: graphic.title, subtitle: graphic.subtitle,
                titleHtml: graphic.titleHtml, titleLines: graphic.titleLines,
                layout: graphic.layout, animation: graphic.animation
            });

            if (existingHash !== newHash) {
                // Update properties by fast re-render without out-animation
                container.removeChild(activeGraphics[graphic.id].el);
                delete activeGraphics[graphic.id];
                showGraphic(graphic);
            }
        }
    });
}

function showGraphic(data) {
    const tpl = templates.find(t => t.id === data.templateId);
    if (!tpl) return;

    const instanceId = `lt_${data.id.replace(/-/g, '')}`;
    const df = tpl.defaultFields || {};

    // Compile Handlebars context (Mimicking VinciFlowGraphic.tsx)
    const ctx = {
        ID: instanceId,
        TITLE: data.titleHtml || (data.titleLines?.length ? data.titleLines.map(l => `<div style="font-size:${l.fontSize || 48}px;font-weight:${l.fontWeight || '800'};color:${l.color || '#fff'};font-family:'${l.fontFamily || 'Inter'}',sans-serif;text-transform:${l.textTransform || 'uppercase'}">${l.text}</div>`).join('') : (data.title || df.title || '')),
        SUBTITLE: data.subtitle || df.subtitle || '',
        PRIMARY_COLOR: data.style?.background?.color || df.primaryColor || '#0000ff',
        SECONDARY_COLOR: data.accentColor || df.secondaryColor || '#ffffff',
        PRIMARY_BG: data.style?.background?.type === 'gradient'
            ? `linear-gradient(${data.style.background.gradientAngle ?? 135}deg, ${data.style.background.color || df.primaryColor || '#0000ff'}, ${data.style.background.color2 || '#ffffff'})`
            : (data.style?.background?.color || df.primaryColor || '#0000ff'),
        ITEMS: data.items || df.items,
        TICKER_SPEED: data.speed || 100,

        // Font helpers
        TITLE_SIZE: data.style?.typography?.fontSize || df.titleSize || 48,
        TITLE_WEIGHT: data.style?.typography?.fontWeight || '800',
        TITLE_TRANSFORM: data.style?.typography?.textTransform || 'uppercase',
        TITLE_COLOR: data.style?.typography?.color || '#ffffff',
        TITLE_FONT: data.style?.typography?.fontFamily || 'Arial',
        SUBTITLE_SIZE: data.style?.subtitleTypography?.fontSize || df.subtitleSize || 24,

        // Animation mappings
        ANIMATION_DURATION: data.animation?.in?.duration ?? 0.5,
        ANIMATION_EASE: data.animation?.in?.ease || 'ease-out',
        ANIMATION_OUT_DURATION: data.animation?.out?.duration ?? 0.3,
        ANIMATION_OUT_EASE: data.animation?.out?.ease || 'ease-in',
        ANIMATION_DELAY: data.animation?.in?.delay ?? 0,
        ANIMATION_OUT_DELAY: data.animation?.out?.delay ?? 0,
        ANIMATION_IDENTITY: 'translate(0, 0) scale(1)'
    };

    // Calculate Transform In from directions
    ctx.ANIMATION_IN_TRANSFORM = (() => {
        const type = data.animation?.in?.type || 'slide';
        const dir = data.animation?.in?.direction || 'bottom';
        if (type === 'fade' || type === 'none') return 'none';
        if (type === 'zoom') return 'scale(0.85)';
        if (type === 'wipe') return 'scaleX(0)';
        switch (dir) {
            case 'right': return 'translateX(100vw)';
            case 'top': return 'translateY(-100vh)';
            case 'bottom': return 'translateY(100vh)';
            case 'left': default: return 'translateX(-100vw)';
        }
    })();

    // Calculate Transform Out
    ctx.ANIMATION_OUT_TRANSFORM = (() => {
        const type = data.animation?.out?.type || 'slide';
        const dir = data.animation?.out?.direction || 'bottom';
        if (type === 'fade' || type === 'none') return 'none';
        if (type === 'zoom') return 'scale(0.85)';
        if (type === 'wipe') return 'scaleX(0)';
        switch (dir) {
            case 'right': return 'translateX(100vw)';
            case 'top': return 'translateY(-100vh)';
            case 'bottom': return 'translateY(100vh)';
            case 'left': default: return 'translateX(-100vw)';
        }
    })();

    const prepareStr = (str) => {
        try {
            return Handlebars.compile(str)(ctx);
        } catch (e) {
            console.error(e); return str;
        }
    };

    // Construct Wrapper Element
    const wrapper = document.createElement('div');
    wrapper.className = `graphic-layer`;

    // Apply Transform and Layout wrapper
    const layoutWrapper = document.createElement('div');
    layoutWrapper.id = instanceId;

    // Position layer
    const autoScale = 1;
    wrapper.style.transform = getLayoutTransform(data.layout, autoScale);
    wrapper.style.transformOrigin = '0 0';
    wrapper.style.width = data.layout?.width ? `${data.layout.width}px` : (data.type === 'TICKER' ? '100%' : 'var(--v-width, 90%)');

    // Inject HTML
    layoutWrapper.innerHTML = prepareStr(tpl.html_template);
    wrapper.appendChild(layoutWrapper);

    // Inject Custom CSS (scoped to instanceId)
    if (tpl.css_template) {
        let cssStr = prepareStr(tpl.css_template);
        // Remove any #id that the Handlebars template might have injected itself
        cssStr = cssStr.replace(new RegExp(`#${instanceId}\\s+`, 'g'), '');
        // Scope all typical classes strictly to this instance without doubling
        cssStr = cssStr.replace(/\.(rep-|lt-|modern-|plate|title|subtitle|ticker|dot)[a-zA-Z0-9_-]*/g, `#${instanceId} $&`);

        const style = document.createElement('style');
        style.textContent = cssStr;
        wrapper.appendChild(style);
    }

    container.appendChild(wrapper);

    // Save metadata
    activeGraphics[data.id] = {
        el: wrapper,
        instanceId: instanceId,
        hash: JSON.stringify({
            title: data.title, subtitle: data.subtitle,
            titleHtml: data.titleHtml, titleLines: data.titleLines,
            layout: data.layout, animation: data.animation
        }),
        isHiding: false
    };

    // Execute internal JS & Animation wrapper
    if (tpl.js_template) {
        const jsCode = prepareStr(tpl.js_template);
        try {
            const runner = new Function('root', 'gsap', `try { ${jsCode} } catch(e) { console.error('Tpl error', e); }`);
            runner(layoutWrapper, window.gsap);

            // Allow DOM repaints before executing GSAP show animations logic
            requestAnimationFrame(() => {
                if (layoutWrapper.__slt_show) {
                    layoutWrapper.__slt_show();
                }
            });
        } catch (e) {
            console.error("Vinci JS error", e);
        }
    }
}

function hideGraphic(id) {
    const meta = activeGraphics[id];
    if (!meta || meta.isHiding) return;

    meta.isHiding = true;
    const layoutWrapper = document.getElementById(meta.instanceId);

    // Hide Animation
    if (layoutWrapper && layoutWrapper.__slt_hide) {
        try {
            const outDurationMs = (layoutWrapper.__slt_out_duration || 0.5) * 1000 + 100; // Small buffer
            layoutWrapper.__slt_hide();

            // Remove from DOM after delay
            setTimeout(() => {
                if (meta.el.parentNode) {
                    meta.el.parentNode.removeChild(meta.el);
                }
                delete activeGraphics[id];
            }, outDurationMs);
        } catch (e) {
            console.error("Hide error", e);
            container.removeChild(meta.el);
            delete activeGraphics[id];
        }
    } else {
        container.removeChild(meta.el);
        delete activeGraphics[id];
    }
}

// Start
initRenderer();
