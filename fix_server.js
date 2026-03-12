const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
s = s.replace(/\/\/ MAGIC_DEBUG_ENDPOINT\s*app\.post\('\/debug_log', express\.json\(\), \(req, res\) => \{\s*console\.log\('BROWSER LOG:', req\.body\);\s*res\.sendStatus\(200\);\s*\}\);/, '');
s = s.replace(`app.use(express.static(__dirname));\n`, `app.use(express.static(__dirname));\napp.post('/debug_log', express.json(), (req, res) => { console.log('BROWSER LOG:', req.body); res.sendStatus(200); });\n`);
fs.writeFileSync('server.js', s);
