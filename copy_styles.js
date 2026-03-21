const fs = require('fs');

const whipStr = fs.readFileSync('templates/ticker_whip.json', 'utf8');
const v2Str = fs.readFileSync('templates/ticker_unified_v2.json', 'utf8');

const whip = JSON.parse(whipStr);
const v2 = JSON.parse(v2Str);

v2.defaultFields = JSON.parse(JSON.stringify(whip.defaultFields));
v2.defaultStyle = JSON.parse(JSON.stringify(whip.defaultStyle || {}));
v2.defaultAnimation = JSON.parse(JSON.stringify(whip.defaultAnimation || {}));
v2.defaultLayout = JSON.parse(JSON.stringify(whip.defaultLayout || {}));

v2.defaultFields.tickerMode = "whip";
v2.defaultFields.separatorStyle = "skewed";

v2.css_template = `#{{ID}} .utk-container.v2 {
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
    flex: 1; position: relative; overflow: hidden; display: flex; align-items: stretch;
}
#{{ID}} .utk-track {
    display: flex; align-items: stretch; white-space: nowrap; padding-left: 100%; flex: 1;
}
#{{ID}} .utk-item {
    color: {{TITLE_COLOR}}; font-size: {{TITLE_SIZE}}px; font-weight: {{TITLE_WEIGHT}};
    text-transform: {{TITLE_TRANSFORM}}; padding-left: 20px; padding-right: 20px; padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; white-space: nowrap; display: flex; align-items: center;
}
#{{ID}} .utk-sep { {{SEPARATOR_CSS}} align-self: center; }
#{{ID}} .utk-msg-box {
    flex: 1; display: flex; align-items: center; justify-content: flex-start;
    padding-left: 20px; padding-right: 20px; padding-top: {{PADDING_Y}}px; padding-bottom: {{PADDING_Y}}px; box-sizing: border-box; color: {{TITLE_COLOR}}; font-size: {{TITLE_SIZE}}px;
    font-weight: {{TITLE_WEIGHT}}; text-transform: {{TITLE_TRANSFORM}}; white-space: nowrap;
    opacity: 0; transition: opacity 0.4s ease-in-out;
}
#{{ID}} .utk-msg-box.visible { opacity: 1; }
#{{ID}} .utk-wiper.mode-whip-right { animation: utk-slide-right-v2 1s linear forwards; }
#{{ID}} .utk-wiper.mode-whip-back { animation: utk-slide-back-v2 0.5s ease-in-out forwards; }
@keyframes utk-slide-right-v2 { 0% { left: 0%; } 100% { left: calc(100% - var(--wiper-w, 150px)); } }
@keyframes utk-slide-back-v2 { 0% { left: calc(100% - var(--wiper-w, 150px)); } 100% { left: 0%; } }
@keyframes utk-gleam-v2 { 0% { left: -150%; } 100% { left: 150%; } }`;

fs.writeFileSync('templates/ticker_unified_v2.json', JSON.stringify(v2, null, 2), 'utf8');
console.log('Restored fully functional V2 template');
