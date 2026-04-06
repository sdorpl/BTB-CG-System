const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('connectAPI', {
    onInitConfig: (cb) => ipcRenderer.on('init-config', (_e, data) => cb(data)),
    connectLocal: () => ipcRenderer.send('connect-local'),
    connectRemote: (url) => ipcRenderer.send('connect-remote', url),
});
