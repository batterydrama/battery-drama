const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('batteryDramaAPI', {
  getBatteryStatus: () => ipcRenderer.invoke('battery-drama:get-status'),
});