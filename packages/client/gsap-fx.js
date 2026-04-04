/**
 * GSAPFX — CG System Animation Library
 * Provides high-level animation presets for CG templates.
 */
(function(window) {
    'use strict';

    // Register GSAP plugins if available
    if (window.gsap) {
        if (window.TextPlugin) gsap.registerPlugin(TextPlugin);
        if (window.EasePack) gsap.registerPlugin(EasePack);
    }

    const GSAPFX = {
        /**
         * Normalizes CSS-style ease names to GSAP equivalents.
         */
        normalizeEase: function(ease) {
            if (!ease) return "power2.out";
            const map = {
                'linear': 'none',
                'ease-in': 'power2.in',
                'ease-out': 'power2.out',
                'ease-in-out': 'power2.inOut',
                'ease-in-sine': 'sine.in',
                'ease-out-sine': 'sine.out',
                'ease-in-out-sine': 'sine.inOut',
                'ease-in-quad': 'quad.in',
                'ease-out-quad': 'quad.out',
                'ease-in-out-quad': 'quad.inOut',
                'ease-in-cubic': 'cubic.in',
                'ease-out-cubic': 'cubic.out',
                'ease-in-out-cubic': 'cubic.inOut',
                'back-in': 'back.in',
                'back-out': 'back.out',
                'back-in-out': 'back.inOut',
                'bounce-in': 'bounce.in',
                'bounce-out': 'bounce.out',
                'bounce-in-out': 'bounce.inOut',
                'elastic-in': 'elastic.in',
                'elastic-out': 'elastic.out',
                'elastic-in-out': 'elastic.inOut'
            };
            // Handle custom cubic-bezier strings if possible, or fallback
            if (ease.startsWith('cubic-bezier')) {
                if (ease.includes('1.56') || ease.includes('0.64')) return "back.out(1.7)"; // Spring approx
                if (ease.includes('-0.55')) return "back.in(1.7)"; // Bounce/Anticipation approx
                return "power2.out";
            }
            return map[ease] || ease;
        },

        /**
         * Standard IN animation.
         */
        standardIn: function(target, config = {}) {
            if (window._GSAP_DEBUG) console.log('[GSAPFX] standardIn', target, config);
            const type = config.type || 'slide';
            const dir = config.direction || 'left';
            const duration = config.duration ?? 0.5;
            const delay = config.delay ?? 0;
            const ease = this.normalizeEase(config.ease || "power2.out");

            const tl = gsap.timeline({ delay: delay });
            if (target) {
                gsap.set(target, { transition: "none", visibility: "visible" });
            }

            if (type === 'none') {
                tl.set(target, { opacity: 1, x: 0, y: 0, scale: 1 });
                return tl;
            }

            if (type === 'fade') {
                tl.fromTo(target, { opacity: 0 }, { opacity: 1, duration: duration, ease: ease });
            } else if (type === 'zoom') {
                tl.fromTo(target, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: duration, ease: ease });
            } else if (type === 'wipe') {
                tl.fromTo(target, { opacity: 0, scaleX: 0, transformOrigin: dir === 'right' ? "right center" : "left center" }, { opacity: 1, scaleX: 1, duration: duration, ease: ease });
            } else {
                // Slide
                const vars = { opacity: 1, x: 0, y: 0, duration: duration, ease: ease };
                const fromVars = { opacity: 0 };
                const dist = 1920; // Full screen width to ensure it's off-screen

                if (dir === 'left') fromVars.x = -dist;
                else if (dir === 'right') fromVars.x = dist;
                else if (dir === 'top') fromVars.y = -1080;
                else if (dir === 'bottom') fromVars.y = 1080;

                tl.fromTo(target, fromVars, vars);
            }
            return tl;
        },

        /**
         * Standard OUT animation.
         */
        standardOut: function(target, config = {}) {
            if (window._GSAP_DEBUG) console.log('[GSAPFX] standardOut', target, config);
            const type = config.type || 'slide';
            const dir = config.direction || 'left';
            const duration = config.duration ?? 0.5;
            const delay = config.delay ?? 0;
            const ease = this.normalizeEase(config.ease || "power2.in");

            const tl = gsap.timeline({ delay: delay });
            if (target) gsap.set(target, { transition: "none" });

            if (type === 'none') {
                tl.set(target, { opacity: 0 });
                return tl;
            }

            if (type === 'fade') {
                tl.to(target, { opacity: 0, duration: duration, ease: ease });
            } else if (type === 'zoom') {
                tl.to(target, { opacity: 0, scale: 0.8, duration: duration, ease: ease });
            } else if (type === 'wipe') {
                tl.to(target, { opacity: 0, scaleX: 0, transformOrigin: dir === 'left' ? "left center" : "right center", duration: duration, ease: ease });
            } else {
                // Slide
                const vars = { opacity: 0, duration: duration, ease: ease };
                const dist = 1920;

                if (dir === 'left') vars.x = -dist;
                else if (dir === 'right') vars.x = dist;
                else if (dir === 'top') vars.y = -1080;
                else if (dir === 'bottom') vars.y = 1080;

                tl.to(target, vars);
            }
            return tl;
        },

        /**
         * Non-destructive text reveal using clip-path.
         */
        revealText: function(target, duration = 1, delay = 0, ease = "power2.out") {
            const tl = gsap.timeline({ delay: delay });
            // Using inset(0 100% 0 0) to hide from right, then animating to inset(0 0 0 0)
            tl.fromTo(target, 
                { clipPath: 'inset(0 100% 0 0)', opacity: 1 }, 
                { clipPath: 'inset(0 0% 0 0)', duration: duration, ease: ease }
            );
            return tl;
        },

        /**
         * Non-destructive text hide using clip-path.
         */
        hideText: function(target, duration = 0.5, delay = 0, ease = "power2.in") {
            const tl = gsap.timeline({ delay: delay });
            tl.to(target, {
                clipPath: 'inset(0 0 0 100%)',
                duration: duration,
                ease: ease
            });
            return tl;
        },

        blurIn: function(target, duration = 1, delay = 0, ease = "power2.out") {
            gsap.set(target, { filter: "blur(20px)", opacity: 0 });
            return gsap.to(target, {
                duration: duration,
                delay: delay,
                filter: "blur(0px)",
                opacity: 1,
                ease: this.normalizeEase(ease)
            });
        },

        blurOut: function(target, duration = 0.5, delay = 0, ease = "power2.in") {
            return gsap.to(target, {
                duration: duration,
                delay: delay,
                filter: "blur(20px)",
                opacity: 0,
                ease: this.normalizeEase(ease)
            });
        },

        applyTextEffect: function(root, config = {}) {
            if (!config || config.type === 'none') return null;
            
            const type = config.type;
            const duration = config.duration ?? 1;
            const delay = config.delay ?? 0.2;
            const stagger = config.stagger ?? 0;
            const ease = this.normalizeEase(config.ease || "power2.out");
            
            const targets = root.querySelectorAll('.title, .subtitle, .modern-title, .rep-title, .na-zywo-text, .rep-clock, .ticker-label, .text-overlay, .sub-text-overlay, .live-text, .news-text-v8, .wiper-text-v8, .utk-msg-box, .utk-item');
            if (targets.length === 0) return null;

            const tl = gsap.timeline({ delay: delay });
            
            if (type === 'typewriter' || type === 'reveal') {
                targets.forEach((target, i) => {
                    tl.add(this.revealText(target, duration, i * stagger, ease), 0);
                });
            } else if (type === 'blur' || type === 'blurIn') {
                tl.fromTo(targets, 
                    { filter: "blur(20px)", opacity: 0 }, 
                    { filter: "blur(0px)", opacity: 1, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'fade') {
                tl.fromTo(targets, 
                    { opacity: 0 }, 
                    { opacity: 1, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'scale') {
                tl.fromTo(targets, 
                    { opacity: 0, scale: 0.5 }, 
                    { opacity: 1, scale: 1, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'slide-up' || type === 'slideReveal') {
                tl.fromTo(targets, 
                    { y: 50, opacity: 0 }, 
                    { y: 0, opacity: 1, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'slide-down') {
                tl.fromTo(targets, 
                    { y: -50, opacity: 0 }, 
                    { y: 0, opacity: 1, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'slide-left') {
                tl.fromTo(targets, 
                    { x: 50, opacity: 0 }, 
                    { x: 0, opacity: 1, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'slide-right') {
                tl.fromTo(targets, 
                    { x: -50, opacity: 0 }, 
                    { x: 0, opacity: 1, duration: duration, stagger: stagger, ease: ease }, 0);
            }
            
            return tl;
        },

        applyTextOutEffect: function(root, config = {}) {
            if (!config || config.type === 'none') return null;
            
            const type = config.type;
            const duration = config.duration ?? 0.5;
            const delay = config.delay ?? 0;
            const stagger = config.stagger ?? 0;
            const ease = this.normalizeEase(config.ease || "power2.in");
            
            const targets = root.querySelectorAll('.title, .subtitle, .modern-title, .rep-title, .na-zywo-text, .rep-clock, .ticker-label, .text-overlay, .sub-text-overlay, .live-text, .news-text-v8, .wiper-text-v8, .utk-msg-box, .utk-item');
            if (targets.length === 0) return null;

            const tl = gsap.timeline({ delay: delay });
            
            targets.forEach(target => {
                if (target.style.clipPath) {
                    gsap.set(target, { clipPath: 'none' }); // Reset reveal before out animation if needed
                }
            });

            if (type === 'fade') {
                tl.to(targets, { opacity: 0, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'blur' || type === 'blurOut') {
                tl.to(targets, { filter: "blur(20px)", opacity: 0, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'scale') {
                tl.to(targets, { scale: 0.5, opacity: 0, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'hide' || type === 'slideHide') {
                targets.forEach((target, i) => {
                    tl.add(this.hideText(target, duration, i * stagger, ease), 0);
                });
            } else if (type === 'slide-up') {
                tl.to(targets, { y: -50, opacity: 0, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'slide-down') {
                tl.to(targets, { y: 50, opacity: 0, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'slide-left') {
                tl.to(targets, { x: -50, opacity: 0, duration: duration, stagger: stagger, ease: ease }, 0);
            } else if (type === 'slide-right') {
                tl.to(targets, { x: 50, opacity: 0, duration: duration, stagger: stagger, ease: ease }, 0);
            }
            
            return tl;
        }
    };

    window.GSAPFX = GSAPFX;
})(window);
