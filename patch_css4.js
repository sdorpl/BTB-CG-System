const fs = require('fs');
const file = 'templates/ticker_unified_v2.json';
const tplStr = fs.readFileSync(file, 'utf8');
const tpl = JSON.parse(tplStr);

let css = tpl.css_template;

// 1. Revert .utk-panel-single to standard relative
css = css.replace(/#\{\{ID\}\} \.utk-panel-horizontal, #\{\{ID\}\} \.utk-panel-single \{[^}]+\}/, 
    `#{{ID}} .utk-panel-horizontal, #{{ID}} .utk-panel-single {
    flex: 1; position: relative; overflow: hidden;
}`);

// 2. Fix utk-msg-box vertical centering explicitly via top 50% / translateY(-50%)
css = css.replace(/#\{\{ID\}\} \.utk-msg-box \{[^}]+\}/, 
    `#{{ID}} .utk-msg-box {
    width: auto; position: absolute; left: 0; top: 50%; transform: translateY(-50%); display: block;
    padding-left: 20px; padding-right: 20px; padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; box-sizing: border-box; color: {{TITLE_COLOR}}; font-size: {{TITLE_SIZE}}px;
    font-weight: {{TITLE_WEIGHT}}; text-transform: {{TITLE_TRANSFORM}}; white-space: nowrap; font-family: '{{FONT_FAMILY}}', sans-serif;
    opacity: 0; transition: opacity 0.4s ease-in-out; line-height: 1;
}`);

tpl.css_template = css;
fs.writeFileSync(file, JSON.stringify(tpl, null, 2), 'utf8');
console.log('Absolute vertical centering patch applied.');
