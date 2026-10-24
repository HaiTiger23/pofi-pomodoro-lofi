const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  initializeStorage: legacy => ipcRenderer.invoke('storage-initialize', legacy),
  setStorageItem: (key, value) => ipcRenderer.invoke('storage-set', key, value),
  searchYouTube: (query, cursor) => ipcRenderer.invoke('search-youtube', query, cursor),
  sendNotification: data => ipcRenderer.invoke('show-notification', data),
  togglePinWindow: shouldPin => ipcRenderer.invoke('toggle-pin-window', shouldPin),
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
  setDockMode: enabled => ipcRenderer.invoke('set-dock-mode', enabled),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('toggle-maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  onWindowState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('window-state', listener);
    return () => ipcRenderer.removeListener('window-state', listener);
  },
  configurePomodoroTimer: (work, rest) => ipcRenderer.invoke('configure-pomodoro-timer', work, rest),
  startPomodoroTimer: (work, rest) => ipcRenderer.invoke('start-pomodoro-timer', work, rest),
  stopPomodoroTimer: () => ipcRenderer.invoke('stop-pomodoro-timer'),
  pausePomodoroTimer: () => ipcRenderer.invoke('pause-pomodoro-timer'),
  resumePomodoroTimer: () => ipcRenderer.invoke('resume-pomodoro-timer'),
  getPomodoroTimerStatus: () => ipcRenderer.invoke('get-pomodoro-timer-status'),
  onPomodoroState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('pomodoro-state', listener);
    return () => ipcRenderer.removeListener('pomodoro-state', listener);
  }
});
