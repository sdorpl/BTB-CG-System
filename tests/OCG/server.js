const http = require('http');
const fs = require('fs');
const path = require('path');

// Plik, w którym będzie zapisywana cała Twoja baza
const DB_FILE = path.join(__dirname, 'cg_database.json');

const server = http.createServer((req, res) => {
    // Pozwalamy OBS-owi i przeglądarce łączyć się z serwerem
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Wczytywanie z pliku
    if (req.method === 'GET' && req.url === '/load') {
        if (fs.existsSync(DB_FILE)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(fs.readFileSync(DB_FILE));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end('[]'); 
        }
    } 
    // Zapisywanie do pliku w locie
    else if (req.method === 'POST' && req.url === '/save') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            fs.writeFileSync(DB_FILE, body);
            res.writeHead(200);
            res.end('Zapisano');
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3001, () => {
    console.log('✅ Serwer CG dziala!');
    console.log('✅ Baza danych zapisuje sie do: cg_database.json');
    console.log('Nie zamykaj tego okna podczas transmisji.');
});