const fs = require('fs');
const http = require('http');

let appJs = fs.readFileSync('app.js', 'utf8');
if (!appJs.includes('// MAGIC_DEBUG_INJECTOR')) {
    const injector = `
// MAGIC_DEBUG_INJECTOR
window.onerror = function(msg, url, line, col, error) {
   fetch('/debug_log', {
       method: 'POST', 
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({type: 'error', msg, url, line, col, stack: error ? error.stack : ''})
   });
};
const originalConsoleLog = console.log;
console.log = function(...args) {
    fetch('/debug_log', {
       method: 'POST', 
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({type: 'log', args: args.map(a => String(a))})
    });
    originalConsoleLog.apply(console, args);
};
const originalConsoleError = console.error;
console.error = function(...args) {
    fetch('/debug_log', {
       method: 'POST', 
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({type: 'error_log', args: args.map(a => String(a))})
    });
    originalConsoleError.apply(console, args);
};
`;
    fs.writeFileSync('app.js', injector + appJs);
}

let serverJs = fs.readFileSync('server.js', 'utf8');
if (!serverJs.includes('// MAGIC_DEBUG_ENDPOINT')) {
    const endpoint = `
// MAGIC_DEBUG_ENDPOINT
app.post('/debug_log', express.json(), (req, res) => {
    console.log("BROWSER LOG:", req.body);
    res.sendStatus(200);
});
`;
    fs.writeFileSync('server.js', endpoint + serverJs);
}
console.log("Injected.");
