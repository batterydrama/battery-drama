import './index.css';
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const si = require('systeminformation');

if (require('electron-squirrel-startup')) {
  app.quit();
}

async function getBatteryStatus() {
  try {
    const battery = await si.battery();

    return {
      ok: true,
      hasBattery: Boolean(battery.hasbattery),
      percent:
        typeof battery.percent === 'number' ? Math.round(battery.percent) : null,
      isCharging: Boolean(battery.ischarging),
      acConnected: Boolean(battery.acconnected),
      timeRemaining:
        typeof battery.timeremaining === 'number' ? battery.timeremaining : null,
    };
  } catch (error) {
    return {
      ok: false,
      hasBattery: false,
      percent: null,
      isCharging: false,
      acConnected: false,
      timeRemaining: null,
      error: error.message,
    };
  }
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 760,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
};

app.whenReady().then(() => {
  ipcMain.handle('battery-drama:get-status', getBatteryStatus);

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