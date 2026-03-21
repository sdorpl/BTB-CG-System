const fs = require('fs');
const file = 'templates/ticker_unified_v2.json';
const tplStr = fs.readFileSync(file, 'utf8');
const tpl = JSON.parse(tplStr);

let css = tpl.css_template;

// 1. Remove display: flex from .utk-msg-box and add top: 50%; transform: translateY(-50%);
css = css.replace(
    /.*#\{\{ID\}\} \.utk-msg-box \{([^}]+)\}.*/,
    (str, inner) => {
        return `#{{ID}} .utk-msg-box {
    position: absolute; width: auto; left: 0; top: 50%; transform: translateY(-50%);
    padding-left: 20px; padding-right: 20px; padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; box-sizing: border-box; color: {{TITLE_COLOR}}; font-size: {{TITLE_SIZE}}px;
    font-weight: {{TITLE_WEIGHT}}; text-transform: {{TITLE_TRANSFORM}}; white-space: nowrap;
    opacity: 0; transition: opacity 0.4s ease-in-out;
    z-index: 1; display: block;
}`;
    }
);

// 2. Remove display: flex from .utk-item, let parent (.utk-track) handle centering
css = css.replace(
    /.*#\{\{ID\}\} \.utk-item \{([^}]+)\}.*/,
    (str, inner) => {
        return `#{{ID}} .utk-item {
    color: {{TITLE_COLOR}}; font-size: {{TITLE_SIZE}}px; font-weight: {{TITLE_WEIGHT}};
    text-transform: {{TITLE_TRANSFORM}}; padding-left: 20px; padding-right: 20px; padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; white-space: nowrap; display: block; box-sizing: border-box;
}`;
    }
);

// 3. Ensure .utk-track uses align-items: center so .utk-item is vertically centered
css = css.replace(
    /.*#\{\{ID\}\} \.utk-track \{([^}]+)\}.*/,
    (str, inner) => {
        return `#{{ID}} .utk-track {
    display: flex; align-items: center; white-space: nowrap; padding-left: 100%; flex: 1; height: 100%;
}`;
    }
);

tpl.css_template = css;
fs.writeFileSync(file, JSON.stringify(tpl, null, 2), 'utf8');
console.log('Fixed CSS absolute centering');
