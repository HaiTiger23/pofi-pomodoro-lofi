const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', { 
    sendNotification: (data) => {
        ipcRenderer.send('notiFromRender', data);
    },
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
    // Thêm API để bật/tắt chế độ ghim cửa sổ
    togglePinWindow: (shouldPin) => ipcRenderer.invoke('toggle-pin-window', shouldPin),
    // Thêm API để cập nhật badge trên dock macOS
    updateDockBadge: (text, isBreak) => ipcRenderer.invoke('update-dock-badge', text, isBreak),
    // Thêm các API cho bộ đếm thời gian Pomodoro trong main process
    startPomodoroTimer: (minutes, seconds, isBreak) => ipcRenderer.invoke('start-pomodoro-timer', minutes, seconds, isBreak),
    stopPomodoroTimer: () => ipcRenderer.invoke('stop-pomodoro-timer'),
    pausePomodoroTimer: () => ipcRenderer.invoke('pause-pomodoro-timer'),
    resumePomodoroTimer: () => ipcRenderer.invoke('resume-pomodoro-timer'),
    getPomodoroTimerStatus: () => ipcRenderer.invoke('get-pomodoro-timer-status')
})