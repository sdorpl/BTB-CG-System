const fs = require("fs");
const db = JSON.parse(fs.readFileSync("db.json", "utf8"));
let changed = false;

db.templates.filter(t => t.id.includes("republika")).forEach(t => {
    let js = t.js_template;

    if (t.id === "republika-composite") {
        js = `(() => {
    const root = document.getElementById("{{ID}}");
    const container = root.querySelector(".rep-container");
    const clockEl = root.querySelector(".rep-clock");
    const tickerTrack = root.querySelector(".ticker-track");
    let timer;
    const updateTime = () => {
        const now = new Date();
        const h = String(now.getHours());
        const m = String(now.getMinutes()).padStart(2, "0");
        if(clockEl) clockEl.textContent = h + ":" + m;
    };
    root.__slt_show = () => {
        const delay = parseFloat("{{ANIMATION_DELAY}}") || 0;
        const el = root.querySelector("[class*=\\"container\\"], [class*=\\"plate\\"], [class*=\\"box\\"], [class*=\\"bar\\"], [class*=\\"panel\\"]") || root.children[0];
        if(el) el.style.transitionDelay = delay + "s";
        if(container) {
            void container.offsetWidth;
            container.style.opacity = "1";
            container.style.transform = "{{ANIMATION_IDENTITY}}";
        }
        updateTime();
        timer = setInterval(updateTime, 1000);
    };
    root.__slt_hide = () => {
        const el = root.querySelector("[class*=\\"container\\"], [class*=\\"plate\\"], [class*=\\"box\\"], [class*=\\"bar\\"], [class*=\\"panel\\"]") || root.children[0];
        if(el) el.style.transitionDelay = "{{ANIMATION_OUT_DELAY}}s";
        if (typeof container !== "undefined" && container) {
            container.style.transition = "all {{ANIMATION_OUT_DURATION}}s {{ANIMATION_OUT_EASE}} {{ANIMATION_OUT_DELAY}}s";
            container.style.opacity = "0";
            container.style.transform = "{{ANIMATION_OUT_TRANSFORM}}";
        }
        if (typeof timer !== "undefined") clearInterval(timer);
    };
})();`;
    } else if (t.id === "republika-lower-third") {
        js = `(() => {
    const root = document.getElementById("{{ID}}");
    const container = root.querySelector(".rep-top-bar");
    root.__slt_show = () => {
        const delay = parseFloat("{{ANIMATION_DELAY}}") || 0;
        const el = root.querySelector("[class*=\\"container\\"], [class*=\\"plate\\"], [class*=\\"box\\"], [class*=\\"bar\\"], [class*=\\"panel\\"]") || root.children[0];
        if(el) el.style.transitionDelay = delay + "s";
        if(container) {
            void container.offsetWidth;
            container.style.opacity = "1";
            container.style.transform = "{{ANIMATION_IDENTITY}}";
        }
    };
    root.__slt_hide = () => {
        const el = root.querySelector("[class*=\\"container\\"], [class*=\\"plate\\"], [class*=\\"box\\"], [class*=\\"bar\\"], [class*=\\"panel\\"]") || root.children[0];
        if(el) el.style.transitionDelay = "{{ANIMATION_OUT_DELAY}}s";
        if (typeof container !== "undefined" && container) {
            container.style.transition = "all {{ANIMATION_OUT_DURATION}}s {{ANIMATION_OUT_EASE}} {{ANIMATION_OUT_DELAY}}s";
            container.style.opacity = "0";
            container.style.transform = "{{ANIMATION_OUT_TRANSFORM}}";
        }
    };
})();`;
    } else if (t.id === "republika-ticker") {
        js = `(() => {
    const root = document.getElementById("{{ID}}");
    const container = root.querySelector(".rep-bottom-bar");
    const tickerTrack = root.querySelector(".ticker-track");
    root.__slt_show = () => {
        const delay = parseFloat("{{ANIMATION_DELAY}}") || 0;
        const el = root.querySelector("[class*=\\"container\\"], [class*=\\"plate\\"], [class*=\\"box\\"], [class*=\\"bar\\"], [class*=\\"panel\\"]") || root.children[0];
        if(el) el.style.transitionDelay = delay + "s";
        if(container) {
            void container.offsetWidth;
            container.style.opacity = "1";
            container.style.transform = "{{ANIMATION_IDENTITY}}";
        }
        if (tickerTrack) {
            setTimeout(() => {
                const trackWidth = tickerTrack.scrollWidth || 0;
                const speedPxPerSec = (parseFloat("{{speed}}") || parseFloat("{{TICKER_SPEED}}") || 50);
                if (speedPxPerSec > 0 && trackWidth > 0) {
                    const durationInSeconds = trackWidth / speedPxPerSec;
                    tickerTrack.style.animation = "none";
                    void tickerTrack.offsetWidth;
                    tickerTrack.style.animation = "rep-scroll " + durationInSeconds + "s linear infinite";
                }
            }, 100);
        }
    };
    root.__slt_hide = () => {
        const el = root.querySelector("[class*=\\"container\\"], [class*=\\"plate\\"], [class*=\\"box\\"], [class*=\\"bar\\"], [class*=\\"panel\\"]") || root.children[0];
        if(el) el.style.transitionDelay = "{{ANIMATION_OUT_DELAY}}s";
        if (typeof container !== "undefined" && container) {
            container.style.transition = "all {{ANIMATION_OUT_DURATION}}s {{ANIMATION_OUT_EASE}} {{ANIMATION_OUT_DELAY}}s";
            container.style.opacity = "0";
            container.style.transform = "{{ANIMATION_OUT_TRANSFORM}}";
        }
    };
})();`;
    } else if (t.id === "republika-clock") {
        js = `(() => {
    const root = document.getElementById("{{ID}}");
    const container = root.querySelector(".rep-left-panel");
    const clockEl = root.querySelector(".rep-clock");
    let timer;
    const updateTime = () => {
        const now = new Date();
        const h = String(now.getHours());
        const m = String(now.getMinutes()).padStart(2, "0");
        if(clockEl) clockEl.textContent = h + ":" + m;
    };
    root.__slt_show = () => {
        const delay = parseFloat("{{ANIMATION_DELAY}}") || 0;
        const el = root.querySelector("[class*=\\"container\\"], [class*=\\"plate\\"], [class*=\\"box\\"], [class*=\\"bar\\"], [class*=\\"panel\\"]") || root.children[0];
        if(el) el.style.transitionDelay = delay + "s";
        if(container) {
            void container.offsetWidth;
            container.style.opacity = "1";
            container.style.transform = "{{ANIMATION_IDENTITY}}";
        }
        updateTime();
        timer = setInterval(updateTime, 1000);
    };
    root.__slt_hide = () => {
        const el = root.querySelector("[class*=\\"container\\"], [class*=\\"plate\\"], [class*=\\"box\\"], [class*=\\"bar\\"], [class*=\\"panel\\"]") || root.children[0];
        if(el) el.style.transitionDelay = "{{ANIMATION_OUT_DELAY}}s";
        if (typeof container !== "undefined" && container) {
            container.style.transition = "all {{ANIMATION_OUT_DURATION}}s {{ANIMATION_OUT_EASE}} {{ANIMATION_OUT_DELAY}}s";
            container.style.opacity = "0";
            container.style.transform = "{{ANIMATION_OUT_TRANSFORM}}";
        }
        if (typeof timer !== "undefined") clearInterval(timer);
    };
})();`;
    } else if (t.id === "republika-logo") {
        js = `(() => {
    const root = document.getElementById("{{ID}}");
    const container = root.querySelector(".rep-logo-box");
    root.__slt_show = () => {
        const delay = parseFloat("{{ANIMATION_DELAY}}") || 0;
        const el = root.querySelector("[class*=\\"container\\"], [class*=\\"plate\\"], [class*=\\"box\\"], [class*=\\"bar\\"], [class*=\\"panel\\"]") || root.children[0];
        if(el) el.style.transitionDelay = delay + "s";
        if(container) {
            void container.offsetWidth;
            container.style.opacity = "1";
            container.style.transform = "{{ANIMATION_IDENTITY}}";
        }
    };
    root.__slt_hide = () => {
        const el = root.querySelector("[class*=\\"container\\"], [class*=\\"plate\\"], [class*=\\"box\\"], [class*=\\"bar\\"], [class*=\\"panel\\"]") || root.children[0];
        if(el) el.style.transitionDelay = "{{ANIMATION_OUT_DELAY}}s";
        if (typeof container !== "undefined" && container) {
            container.style.transition = "all {{ANIMATION_OUT_DURATION}}s {{ANIMATION_OUT_EASE}} {{ANIMATION_OUT_DELAY}}s";
            container.style.opacity = "0";
            container.style.transform = "{{ANIMATION_OUT_TRANSFORM}}";
        }
    };
})();`;
    }

    if (t.js_template !== js) {
        t.js_template = js;
        changed = true;
        console.log("Fixed template logic for", t.id);
    }
});

if (changed) {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2), "utf8");
    console.log("Written templates to db.json");
} else {
    console.log("No changes needed");
}
