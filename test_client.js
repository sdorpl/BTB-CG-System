const io = require("socket.io-client");
const socket = io("http://localhost:3001");
socket.on("connect", () => {
    console.log("Connected to server");
});
socket.on("initialState", (state) => {
    console.log("Received state. Graphics total:", state.graphics.length);
    const visibleGraphics = state.graphics.filter(g => g.visible);
    console.log("Visible graphics:", visibleGraphics.map(g => ({name: g.name, id: g.id, type: g.type})));
    socket.disconnect();
    process.exit(0);
});
