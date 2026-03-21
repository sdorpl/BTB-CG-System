const fs = require('fs');
const file = 'templates/ticker_unified_v2.json';
const tplStr = fs.readFileSync(file, 'utf8');
const tpl = JSON.parse(tplStr);

// 1. Add separator feature
tpl.features.separator = true;

// 2. Fix CSS
let css = tpl.css_template;

// Add overflow: hidden to wiper if not there
if (!css.includes('overflow: hidden', css.indexOf('.utk-wiper {'))) {
    css = css.replace(/#\{\{ID\}\} \.utk-wiper \{([^}]+)\}/, (match, inner) => {
        return `#{{ID}} .utk-wiper {${inner} overflow: hidden; }`;
    });
}

// Ensure .utk-msg-box has padding-top and padding-bottom from PADDING_Y
if (!css.includes('padding-top: {{PADDING_Y}}px;', css.indexOf('.utk-msg-box {'))) {
    css = css.replace(/#\{\{ID\}\} \.utk-msg-box \{([^}]+)\}/, (match, inner) => {
        return `#{{ID}} .utk-msg-box {${inner} padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; }`;
    });
}

// Add same padding to .utk-item
if (!css.includes('padding-top: {{PADDING_Y}}px;', css.indexOf('.utk-item {'))) {
    css = css.replace(/#\{\{ID\}\} \.utk-item \{([^}]+)\}/, (match, inner) => {
        return `#{{ID}} .utk-item {${inner} padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; }`;
    });
}

tpl.css_template = css;

// Ensure defaultFields has correct separator fallback
tpl.defaultFields.separatorStyle = "skewed";

fs.writeFileSync(file, JSON.stringify(tpl, null, 2), 'utf8');
console.log('Features and CSS patched in', file);
