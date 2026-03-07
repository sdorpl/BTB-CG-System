const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const DB_FILE = path.join(__dirname, 'db.json');
let appState = null;

// Read db.json to memory
function loadState() {
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        appState = JSON.parse(raw);
        console.log("Loaded state from db.json");
    } catch (e) {
        console.error("Failed to load db.json:", e);
        appState = { settings: {}, templates: [], graphics: [] };
    }
}

function saveState() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(appState, null, 2), 'utf-8');
        // console.log("State saved to db.json");
    } catch (e) {
        console.error("Failed to save db.json:", e);
    }
}

loadState();

// Serve static files from the current directory
app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log(`[+] Client connected: ${socket.id}`);
    
    // Send current state to newly connected client
    socket.emit('initialState', appState);

    // Listen for state updates from the control panel
    socket.on('updateState', (newState) => {
        appState = newState;
        // Broadcast the updated state to ALL connected clients
        io.emit('stateUpdated', appState);
        // Persist to disk
        saveState();
    });

    socket.on('disconnect', () => {
        console.log(`[-] Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  CG Server running on port ${PORT}`);
    console.log(`  Control Panel: http://localhost:${PORT}/`);
    console.log(`  Output URL: http://localhost:${PORT}/output.html`);
    console.log(`========================================`);
});
