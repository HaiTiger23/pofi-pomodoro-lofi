const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pofiReminder', {
  getState: () => ipcRenderer.invoke('reminder-get-state'),
  dismiss: () => ipcRenderer.invoke('reminder-dismiss'),
  onState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('reminder-state', listener);
    return () => ipcRenderer.removeListener('reminder-state', listener);
  }
});
