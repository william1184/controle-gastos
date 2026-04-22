const { app, BrowserWindow } = require('electron');
const path = require('path');
const serve = require('electron-serve');

const loadURL = serve({ directory: 'out' });
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
  });

  if (isDev) {
    win.loadURL('http://localhost:3000');
    // win.webContents.openDevTools(); // Opcional
  } else {
    // Carrega a aplicação usando o protocolo customizado do electron-serve
    loadURL(win);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
