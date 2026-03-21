const fs = require('fs');
const file = 'templates/ticker_unified_v2.json';
const tpl = JSON.parse(fs.readFileSync(file, 'utf8'));

tpl.css_template = `#{{ID}} .utk-container.v2 {
    position: absolute; bottom: 0; left: 0; width: var(--v-width, 100%); min-height: var(--v-height, 60px);
    background: {{PRIMARY_BG}}; display: flex; align-items: stretch; overflow: hidden;
    border: {{BORDER_WIDTH}}px solid {{BORDER_COLOR}}; border-radius: {{BORDER_RADIUS}}px; box-sizing: border-box;
    font-family: '{{FONT_FAMILY}}', sans-serif; opacity: 0; transform: translateY(100px); box-shadow: {{BOX_SHADOW}};
}
#{{ID}} .utk-wiper {
    position: absolute; left: 0; top: 0; bottom: 0; min-width: 150px; width: auto; padding: 0 40px;
    background: {{WIPER_BG}}; display: flex; align-items: center; justify-content: center;
    box-shadow: 5px 0 15px rgba(0,0,0,0.5); border-radius: {{BORDER_RADIUS}}px; z-index: 100; box-sizing: border-box; flex-shrink: 0; overflow: hidden;
}
#{{ID}} .utk-wiper-gleam {
    position: absolute; top: 0; bottom: 0; left: -100%; width: 60%; display: {{#if WIPER_GLEAM_ENABLED}}block{{else}}none{{/if}};
    background: {{WIPER_GLEAM_BG}}; transform: skewX(-20deg); pointer-events: none;
    animation: utk-gleam-v2 {{WIPER_GLEAM_DURATION}}s infinite ease-in-out;
}
#{{ID}} .utk-wiper-text {
    font-weight: {{WIPER_FONT_WEIGHT}}; font-size: {{WIPER_FONT_SIZE}}px; font-family: {{WIPER_FONT}}, sans-serif;
    color: {{WIPER_TEXT_COLOR}}; letter-spacing: {{WIPER_LETTER_SPACING}}px; position: relative; z-index: 101; white-space: nowrap;
}
#{{ID}} .utk-panel-horizontal, #{{ID}} .utk-panel-single {
    flex: 1; position: relative; overflow: hidden;
}
#{{ID}} .utk-track {
    display: flex; align-items: center; white-space: nowrap; padding-left: 100%; flex: 1; height: 100%;
}
#{{ID}} .utk-item {
    color: {{TITLE_COLOR}}; font-size: {{TITLE_SIZE}}px; font-weight: {{TITLE_WEIGHT}};
    text-transform: {{TITLE_TRANSFORM}}; padding-left: 20px; padding-right: 20px; padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; white-space: nowrap; display: block; box-sizing: border-box; line-height: 1;
}
#{{ID}} .utk-sep { {{SEPARATOR_CSS}} align-self: center; }
#{{ID}} .utk-msg-box {
    width: auto; position: absolute; left: 0; top: 50%; transform: translateY(-50%); display: block;
    padding-left: 20px; padding-right: 20px; padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; box-sizing: border-box; color: {{TITLE_COLOR}}; font-size: {{TITLE_SIZE}}px;
    font-weight: {{TITLE_WEIGHT}}; text-transform: {{TITLE_TRANSFORM}}; white-space: nowrap; font-family: '{{FONT_FAMILY}}', sans-serif;
    opacity: 0; transition: opacity 0.4s ease-in-out; line-height: 1; z-index: 1;
}
#{{ID}} .utk-msg-box.visible { opacity: 1; }
#{{ID}} .utk-wiper.mode-whip-right { animation: utk-slide-right-v2 1s linear forwards; }
#{{ID}} .utk-wiper.mode-whip-back { animation: utk-slide-back-v2 0.5s ease-in-out forwards; }
@keyframes utk-slide-right-v2 { 0% { left: 0%; } 100% { left: calc(100% - var(--wiper-w, 150px)); } }
@keyframes utk-slide-back-v2 { 0% { left: calc(100% - var(--wiper-w, 150px)); } 100% { left: 0%; } }
@keyframes utk-gleam-v2 { 0% { left: -150%; } 100% { left: 150%; } }`;

fs.writeFileSync(file, JSON.stringify(tpl, null, 2), 'utf8');
console.log('Fixed exactly.');
