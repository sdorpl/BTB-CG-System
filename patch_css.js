const fs = require('fs');

const file = 'templates/ticker_unified_v2.json';
const tplStr = fs.readFileSync(file, 'utf8');
const tpl = JSON.parse(tplStr);

let cssStr = tpl.css_template;
// Replace utk-panel-single and msg-box absolute positioning
cssStr = cssStr.replace(
    /.*?\/\* --- PANELS --- \*\/#\{\{ID\}\} \.utk-panel-horizontal, #\{\{ID\}\} \.utk-panel-single \{\n    flex: 1;\n    position: relative;\n    height: 100%;\n    overflow: hidden;\n\}.*/s,
    (str) => {
        // We only want to replace specific parts, let's just do standard string replacements
        return str; // No-op, we'll do literal replacements
    }
);

cssStr = cssStr.replace('height: 100%;\n    overflow: hidden;\n}', 'overflow: hidden;\n    display: flex;\n    align-items: stretch;\n}');
cssStr = cssStr.replace('position: absolute;\n    width: 100%;\n    height: 100%;\n    display: flex;\n', 'flex: 1;\n    display: flex;\n');

tpl.css_template = cssStr;
fs.writeFileSync(file, JSON.stringify(tpl, null, 2), 'utf8');
console.log('Patched', file);
