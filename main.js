const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

// Pobieranie ścieżki użytkownika do zapisu bazy danych (aby minąć błędy Read-Only w paczkach ASAR)
const userDataPath = app.getPath('userData');
process.env.APPDATA_PATH = userDataPath;

// Uruchamiamy backend (Express/Socket.io/SQLite) ze zmodyfikowanego server.js
// Ten require spowoduje natychmiastowe uruchomienie serwera lokalnego
require('./server.js');

function createWindow() {
    // Określamy szerokość i wysokość głównego okna "Dashboardu"
    const mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        title: "CG Master - Control Station",
        // icon: path.join(__dirname, 'icon.png'), // Opcjonalnie, jeśli dodany zostanie plik ikony
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Ukrywamy listwę menu systemowego z góry, aby Control Panel był czystszy (widok premium)
    mainWindow.removeMenu();

    // Domyślnie server.js działa na porcie 3000
    const port = process.env.PORT || 3000;

    // Minimalne opóźnienie w przypadku dłuższego startu serwera/inicjalizacji bazy
    setTimeout(() => {
        mainWindow.loadURL(`http://localhost:${port}`);
    }, 1000);

    // Aby umożliwić otwieranie linków w oddzielnych oknach w aplikacji natywnej (np. z "Open Source" albo "Docs")
    // można również obsłużyć nawigację z "href" otwierając w nowym oknie natywnym zamiast w głównej przeglądarce.

    // Opcjonalne skróty klawiszowe z poziomu aplikacji (np. do odświeżenia lub otwierania DevTools)
    globalShortcut.register('CommandOrControl+Shift+I', () => {
        mainWindow.webContents.toggleDevTools();
    });
    
    globalShortcut.register('F5', () => {
        mainWindow.webContents.reloadIgnoringCache();
    });
}

// Gdy środowisko Electrona zainicjuje się poprawnie, możemy stworzyć okno.
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Zwalnianie skrótów klawiszowych przy wyjściu z aplikacji
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// Wychodzimy z aplikacji, jeśli wszystkie okna zostały zamknięte
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
