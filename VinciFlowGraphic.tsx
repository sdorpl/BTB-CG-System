import React, { useEffect, useRef, useId, useMemo, useState } from 'react';
import type { VinciFlowTemplate } from '../../types/TemplateTypes';
import type { LowerThirdGraphic } from '../../types/GraphicTypes';
import Handlebars from 'handlebars';
import { getLayoutTransform } from '../../utils/TemplateUtils';
import gsap from 'gsap';

declare global {
    interface Window {
        lastVinciFlowVisibility: Record<string, boolean>;
    }
}

interface VinciFlowGraphicProps {
    template: VinciFlowTemplate;
    data: LowerThirdGraphic;
    visible: boolean;
}

const VinciFlowGraphic: React.FC<VinciFlowGraphicProps> = ({ template, data, visible }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const styleRef = useRef<HTMLStyleElement | null>(null);

    // Generate a unique ID for this instance to scope CSS/JS
    const rawId = useId();
    // We use a fixed prefix to ensure it works with potential regexes in templates
    const uniqueId = useMemo(() => rawId.replace(/:/g, '') + '_' + Math.random().toString(36).substr(2, 9), [rawId]);
    const instanceId = `lt_${uniqueId}`;

    const [templateInitKey, setTemplateInitKey] = useState(0);
    const [renderKey, setRenderKey] = useState(0);
    const blockShowUntilReinit = useRef(false);
    const [autoScale, setAutoScale] = useState(1);
    const visibleRef = useRef(visible);
    useEffect(() => {
        if (visible && !visibleRef.current) {
            blockShowUntilReinit.current = true;
            setRenderKey(k => k + 1);
        }
        visibleRef.current = visible;
    }, [visible]);

    // Ensure GSAP is globally available for templates
    useEffect(() => {
        (window as any).gsap = gsap;
    }, []);

    // 1. Prepare Context (Memoized)
    const templateContext = useMemo(() => {
        const df = template.defaultFields || {};
        return {
            ID: instanceId,
            TITLE: (data as any).titleHtml
                ? (data as any).titleHtml
                : (data as any).titleLines?.length
                    ? (data as any).titleLines.map((line: any) =>
                        `<div style="font-size:${line.fontSize || df.titleSize || 48}px;font-weight:${line.fontWeight || '800'};color:${line.color || data.style?.typography?.color || '#ffffff'};font-family:'${line.fontFamily || data.style?.typography?.fontFamily || 'Inter'}',sans-serif;text-transform:${line.textTransform || data.style?.typography?.textTransform || 'uppercase'}">${line.text}</div>`
                    ).join('')
                    : (data.title || df.title || ''),
            SUBTITLE: data.subtitle || df.subtitle || '',
            PRIMARY_COLOR: data.style?.background?.color || df.primaryColor || '#0000ff',
            SECONDARY_COLOR: data.accentColor || df.secondaryColor || '#ffffff',
            SUBTITLE_BACKGROUND_COLOR: data.style?.background?.subtitleBackgroundColor || '#000000',
            INTRO_TEXT: (data.showIntro ?? true) ? (data.introText || '') : '',
            ITEMS: (data as any).items || df.items, // FOR TICKER ARRAY
            TICKER_SPEED: (data as any).speed || 100, // CONSTANT SPEED (px/s)

            // Sizes & Typography
            TITLE_SIZE: data.style?.typography?.fontSize || df.titleSize || 48,
            TITLE_WEIGHT: data.style?.typography?.fontWeight || '800',
            TITLE_TRANSFORM: data.style?.typography?.textTransform || 'uppercase',
            TITLE_COLOR: data.style?.typography?.color || '#ffffff',
            TITLE_FONT: data.style?.typography?.fontFamily || 'Arial',

            SUBTITLE_SIZE: data.style?.subtitleTypography?.fontSize || df.subtitleSize || 24,
            SUBTITLE_COLOR: data.style?.subtitleTypography?.color || '#facc15',
            SUBTITLE_FONT: data.style?.subtitleTypography?.fontFamily || 'Arial',

            // Dimensions
            WIDTH: data.style?.dimensions?.width || 'auto',
            HEIGHT: data.style?.dimensions?.height || 'auto',
            AUTO_WIDTH: data.style?.dimensions?.autoWidth ?? true,

            // Background Logic
            PRIMARY_BG: data.style?.background?.type === 'gradient'
                ? `linear-gradient(${data.style.background.gradientAngle ?? 135}deg, ${data.style.background.color || df.primaryColor || '#0000ff'}, ${data.style.background.color2 || '#ffffff'})`
                : (data.style?.background?.color || df.primaryColor || '#0000ff'),

            SUBTITLE_BG: (data.style?.background?.subtitleBackgroundColor) || '#facc15',

            // Box Styles
            BORDER_RADIUS: (data.style?.box?.borderRadius !== undefined) ? `${data.style.box.borderRadius}px` : '0px',
            BOX_SHADOW: (data.style?.box?.shadow)
                ? `${data.style?.box?.shadowOffsetX || 0}px ${data.style?.box?.shadowOffsetY || 10}px ${data.style?.box?.shadowBlur || 30}px ${data.style?.box?.shadowColor || 'rgba(0,0,0,0.3)'}`
                : 'none',

            // Animation — read from data.animation.in/out (set by InspectorPanel)
            ANIMATION_DURATION: (data as any).animation?.in?.duration ?? 0.5,
            ANIMATION_EASE: (data as any).animation?.in?.ease || 'ease-out',
            ANIMATION_OUT_DURATION: (data as any).animation?.out?.duration ?? 0.3,
            ANIMATION_OUT_EASE: (data as any).animation?.out?.ease || 'ease-in',
            ANIMATION_DELAY: (data as any).animation?.in?.delay ?? 0,
            ANIMATION_OUT_DELAY: (data as any).animation?.out?.delay ?? 0,

            // Direction-based transforms for __slt_show/__slt_hide
            ANIMATION_IN_TRANSFORM: (() => {
                const type = (data as any).animation?.in?.type || 'slide';
                const dir = (data as any).animation?.in?.direction || 'bottom';
                if (type === 'fade' || type === 'none') return 'none';
                if (type === 'zoom') return 'scale(0.85)';
                if (type === 'wipe') return 'scaleX(0)';
                switch (dir) {
                    case 'right': return 'translateX(100vw)';
                    case 'top': return 'translateY(-100vh)';
                    case 'bottom': return 'translateY(100vh)';
                    case 'left':
                    default: return 'translateX(-100vw)';
                }
            })(),
            ANIMATION_OUT_TRANSFORM: (() => {
                const type = (data as any).animation?.out?.type || 'slide';
                const dir = (data as any).animation?.out?.direction || 'bottom';
                if (type === 'fade' || type === 'none') return 'none';
                if (type === 'zoom') return 'scale(0.85)';
                if (type === 'wipe') return 'scaleX(0)';
                switch (dir) {
                    case 'right': return 'translateX(100vw)';
                    case 'top': return 'translateY(-100vh)';
                    case 'bottom': return 'translateY(100vh)';
                    case 'left':
                    default: return 'translateX(-100vw)';
                }
            })(),
            // Identity transform
            ANIMATION_IDENTITY: 'translate(0, 0) scale(1)',

            // Flags
            SHOW_SUBTITLE: data.showSubtitle !== false,
        };
    }, [data, template, instanceId]);

    // 2. Prepare String Function
    const prepareString = (str: string) => {
        try {
            const templateDelegate = Handlebars.compile(str);
            return templateDelegate(templateContext);
        } catch (e) {
            console.error("Handlebars compilation error:", e);
            return str;
        }
    };

    // stable key for re-injection (excludes visible and layout)
    const contentKey = useMemo(() => {
        return JSON.stringify({
            title: data.title,
            titleLines: (data as any).titleLines,
            titleHtml: (data as any).titleHtml,
            subtitle: data.subtitle,
            items: (data as any).items,
            speed: (data as any).speed,
            style: data.style,
            animation: (data as any).animation, // Needed to re-inject JS/CSS when animation changes
        });
    }, [data]); // Deeply inspects 'data' instead of specific object references

    const isTransitioning = useRef(false);

    // 2. CSS Injection
    useEffect(() => {
        if (!template.css_template) return;

        const css = prepareString(template.css_template);
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        styleRef.current = style;

        return () => {
            if (styleRef.current) {
                document.head.removeChild(styleRef.current);
                styleRef.current = null;
            }
        };
    }, [template.css_template, contentKey, instanceId]);

    // 3. HTML Injection & JS Execution
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Prevent re-injection if currently transitioning out
        if (isTransitioning.current) {
            return;
        }

        // Inject HTML
        const html = prepareString(template.html_template);
        // Wrapper for scoping
        container.innerHTML = `<div id="${instanceId}" class="lt-root">${html}</div>`;
        const rootEl = document.getElementById(instanceId);

        // Execute JS
        if (rootEl && template.js_template) {
            const jsCode = prepareString(template.js_template);
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

                setTemplateInitKey(prev => prev + 1);
                blockShowUntilReinit.current = false;
            } catch (e) {
                console.error("VinciFlow Script Error for " + template.id, e);
            }
        }

        return () => {
            if (container && !isTransitioning.current) {
                container.innerHTML = '';
            }
        };
    }, [template.html_template, template.js_template, contentKey, instanceId, renderKey]);

    // 4. Lifecycle Management (Show/Hide) & Auto-Scaling
    useEffect(() => {
        const rootEl = document.getElementById(instanceId) as any;

        // Auto-scaling logic: if parent is smaller than 1920, scale down
        const updateScale = () => {
            const parent = containerRef.current?.parentElement;
            if (parent && parent.clientWidth > 0) {
                // Determine if we are on the Output page by checking if we occupy the full window 
                // or have a specific ID/class on upper nodes. A simple heuristic:
                // If parent width is >= window innerWidth minus some scrollbars, we're likely on OutputPage.
                // Or if we're directly inside GraphicRenderer which is 100vw.
                if (parent.clientWidth >= window.innerWidth - 20) {
                    setAutoScale(1);
                } else {
                    const ratio = Math.min(1, parent.clientWidth / 1920);
                    setAutoScale(ratio);
                }
            } else {
                setAutoScale(1);
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);

        if (!rootEl) return () => { window.removeEventListener('resize', updateScale); };

        if (visible) {
            isTransitioning.current = false; // Reset flag on show
            if (blockShowUntilReinit.current) return;
            try {
                if (rootEl.__slt_show && typeof rootEl.__slt_show === 'function') {
                    // Always use a micro-delay to ensure DOM paint before applying transition classes
                    setTimeout(() => {
                        const el = document.getElementById(instanceId) as any;
                        if (visibleRef.current && el && el.__slt_show) {
                            const anim = el.__slt_show();
                            // If it's already on-air and we just re-rendered the DOM, skip the intro animation!
                            if (visibleRef.current && typeof anim?.progress === 'function') {
                                if (window.lastVinciFlowVisibility?.[instanceId]) {
                                    anim.progress(1);
                                }
                            }
                            if (!window.lastVinciFlowVisibility) window.lastVinciFlowVisibility = {};
                            window.lastVinciFlowVisibility[instanceId] = true;
                        }
                    }, 30);
                } else {
                    rootEl.style.display = 'block';
                }
            } catch (err) {
                console.error(`Error in __slt_show for ${instanceId}:`, err);
                rootEl.style.display = 'block';
            }
        } else {
            // Hiding
            if (window.lastVinciFlowVisibility) {
                window.lastVinciFlowVisibility[instanceId] = false;
            }
            try {
                if (rootEl.__slt_hide && typeof rootEl.__slt_hide === 'function') {
                    isTransitioning.current = true;

                    // Call the hide function
                    const hideResult = rootEl.__slt_hide();

                    // Determine how long to wait before allowing DOM changes (wait for CSS transition or GSAP to finish)
                    const durationMs = ((data as any).animation?.out?.duration || 0.5) * 1000;

                    if (hideResult && typeof hideResult.then === 'function') {
                        // It returned a promise (GSAP etc)
                        hideResult.then(() => {
                            isTransitioning.current = false;
                        }).catch((e: any) => {
                            console.error("Animation promise error", e);
                            isTransitioning.current = false;
                        });
                    } else {
                        // Fallback: use a timeout based on the configured out duration
                        setTimeout(() => {
                            isTransitioning.current = false;
                        }, durationMs + 50); // add 50ms buffer
                    }
                } else {
                    rootEl.style.display = 'none';
                }
            } catch (err) {
                console.error(`Error in __slt_hide for ${instanceId}:`, err);
                rootEl.style.display = 'none';
            }
        }

        return () => {
            window.removeEventListener('resize', updateScale);
        };
    }, [visible, instanceId, templateInitKey]);

    // Combine autoScale with user layout
    const layoutStyle = {
        ...getLayoutTransform(data.layout, autoScale),
        width: '1920px',
        height: '1080px',
        pointerEvents: 'none', // pass-through
        '--v-width': data.layout?.width ? `${data.layout.width}px` : '90%',
        '--v-height': data.layout?.height ? `${data.layout.height}px` : 'auto',
    } as React.CSSProperties;

    // Use a wrapper that holds the exact resolution so scale transforms from top-left work
    // without clipping content or forcing 0 height.
    return (
        <div style={layoutStyle}>
            <div
                ref={containerRef}
                style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            />
        </div>
    );
};

export default VinciFlowGraphic;
