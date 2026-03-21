const fs = require('fs');
const file = 'templates/ticker_unified_v2.json';
const tplStr = fs.readFileSync(file, 'utf8');
const tpl = JSON.parse(tplStr);

let css = tpl.css_template;

// Change .utk-panel-single to align-items: center
css = css.replace(
    '#{{ID}} .utk-panel-horizontal, #{{ID}} .utk-panel-single {\n    flex: 1; position: relative; overflow: hidden; display: flex; align-items: stretch;\n}',
    '#{{ID}} .utk-panel-horizontal, #{{ID}} .utk-panel-single {\n    flex: 1; position: relative; overflow: hidden; display: flex; align-items: center;\n}'
);

// Restore .utk-msg-box to absolute positioning without any width restrictions and rely on parent's align-items: center
css = css.replace(
    /.*#\{\{ID\}\} \.utk-msg-box \{([^}]+)\}.*/,
    (str, inner) => {
        return `#{{ID}} .utk-msg-box {
    position: absolute; width: auto; left: 0;
    padding-left: 20px; padding-right: 20px; padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; box-sizing: border-box; color: {{TITLE_COLOR}}; font-size: {{TITLE_SIZE}}px;
    font-weight: {{TITLE_WEIGHT}}; text-transform: {{TITLE_TRANSFORM}}; white-space: nowrap;
    opacity: 0; transition: opacity 0.4s ease-in-out;
    z-index: 1;
}`;
    }
);

css = css.replace(
    /.*#\{\{ID\}\} \.utk-item \{([^}]+)\}.*/,
    (str, inner) => {
        return `#{{ID}} .utk-item {
    color: {{TITLE_COLOR}}; font-size: {{TITLE_SIZE}}px; font-weight: {{TITLE_WEIGHT}};
    text-transform: {{TITLE_TRANSFORM}}; padding-left: 20px; padding-right: 20px; padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; white-space: nowrap; display: flex; align-items: center; height: 100%; box-sizing: border-box;
}`;
    }
);


tpl.css_template = css;
fs.writeFileSync(file, JSON.stringify(tpl, null, 2), 'utf8');
console.log('Fixed vertical centering');
