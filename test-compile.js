const fs = require("fs");
const Handlebars = require("handlebars");

const db = JSON.parse(fs.readFileSync("db.json", "utf8"));
const template = db.templates.find(t => t.id === "republika-lower-third");
const graphic = db.graphics.find(g => g.templateId === "republika-lower-third");

const instanceId = `lt_${graphic.id.replace(/-/g, "")}`;
const data = graphic;
const df = template.defaultFields || {};

const ctx = {
    ID: instanceId,
    TITLE: data.titleHtml || "",
    SUBTITLE: data.subtitle || df.subtitle || "",
    PRIMARY_COLOR: "#0000ff",
    SECONDARY_COLOR: "#ffffff",
    PRIMARY_BG: "#0000ff",
    ITEMS: data.items || df.items,
    TICKER_SPEED: data.speed || 100,

    ANIMATION_DURATION: 0.5,
    ANIMATION_EASE: "ease-out",
    ANIMATION_OUT_DURATION: 0.3,
    ANIMATION_OUT_EASE: "ease-in",
    ANIMATION_DELAY: 0,
    ANIMATION_OUT_DELAY: 0,
    ANIMATION_IDENTITY: "translate(0, 0) scale(1)",
    
    ANIMATION_IN_TRANSFORM: "none",
    ANIMATION_OUT_TRANSFORM: "none"
};

const jsCode = Handlebars.compile(template.js_template)(ctx);
const wrappedCode = [
    '(function(root, gsap) {',
    '    try {',
    jsCode,
    '    } catch (e) {',
    '        console.error("INNER TEMPLATE ERROR:", e);',
    '    }',
    `})(document.getElementById("${instanceId}"), window.gsap);`
].join('\n');

console.log("--- WRAPPED CODE ---");
console.log(wrappedCode);

try {
    // Only check syntax, don't execute (it would fail without DOM)
    new Function(wrappedCode);
    console.log("Syntax is OK");
} catch(e) {
    console.log("Syntax Error Detected:");
    console.log(e);
}
