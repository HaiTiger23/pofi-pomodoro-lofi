const { app, BrowserWindow, ipcMain, shell, Notification, dialog, powerMonitor, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const sound = require('sound-play');
const { PomodoroTimer } = require('./electron/timer');
const { SettingsStorage } = require('./electron/storage');
const { YouTubeSearch, registerSearchRoute } = require('./electron/youtube-search');
const { WindowMode } = require('./electron/window-mode');
const youtubeSearch = new YouTubeSearch();

let mainWindow;
let httpServer;
let settings;
let timer;
let appOrigin;
let windowMode;
const devUrl = !app.isPackaged && process.env.POFI_DEV_URL;

function notify(title, body, type = 'info') {
  if (Notification.isSupported()) new Notification({ title, body, silent: true }).show();
  const filename = type === 'finish' ? 'success-fanfare-trumpets-6185.mp3' : 'simple-notification-152054.mp3';
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  const audio = path.join(base, 'sounds', filename);
  if (fs.existsSync(audio)) sound.play(audio, 1).catch(() => console.warn('Không thể phát âm báo.'));
}
function publishTimer(state) {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.webContents.isDestroyed()) window.webContents.send('pomodoro-state', state);
  }
  if (process.platform === 'darwin') {
    app.dock.setBadge(state.status === 'ready' ? '' : `${state.isBreak ? '☕' : '⏱'} ${Math.ceil((state.minutes * 60 + state.seconds) / 60)}m`);
  }
}
function windowState() {
  return { pinned: mainWindow.isAlwaysOnTop(), maximized: mainWindow.isMaximized(), dockMode: Boolean(windowMode?.dockMode) };
}
function registerIPC() {
  const handle = (channel, callback) => ipcMain.handle(channel, (event, ...args) => {
    if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error('Untrusted renderer');
    return callback(...args);
  });
  handle('storage-initialize', legacy => settings.initialize(legacy));
  handle('storage-set', (key, value) => settings.set(key, value));
  handle('search-youtube', async (query, cursor) => {
    try { return await youtubeSearch.searchPage(query, cursor); }
    catch (error) { return { error: error.message }; }
  });
  handle('toggle-pin-window', shouldPin => {
    mainWindow.setAlwaysOnTop(Boolean(shouldPin));
    return mainWindow.isAlwaysOnTop();
  });
  handle('get-window-state', windowState);
  handle('set-dock-mode', async enabled => {
    await windowMode.setDockMode(enabled);
    const state = windowState();
    mainWindow.webContents.send('window-state', state);
    return state;
  });
  handle('minimize-window', () => { mainWindow.minimize(); return true; });
  handle('toggle-maximize-window', async () => {
    if (windowMode.dockMode) await windowMode.setDockMode(false);
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return windowState();
  });
  handle('close-window', () => {
    const window = mainWindow;
    setImmediate(() => { if (!window.isDestroyed()) window.close(); });
    return true;
  });
  handle('configure-pomodoro-timer', (work, rest) => timer.configure(work, rest));
  handle('start-pomodoro-timer', (work, rest) => timer.start(work, rest));
  handle('stop-pomodoro-timer', () => timer.stop());
  handle('pause-pomodoro-timer', () => timer.pause());
  handle('resume-pomodoro-timer', () => timer.resume());
  handle('get-pomodoro-timer-status', () => timer.tick());
  handle('show-notification', message => {
    if (!message || typeof message.title !== 'string') return false;
    notify(message.title.slice(0, 200), String(message.body || message.content || '').slice(0, 1000), message.type);
    return true;
  });
}
function startServer(port = 8282) {
  const server = express();
  registerSearchRoute(server, youtubeSearch);
  const dist = path.join(__dirname, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Chưa có giao diện. Hãy chạy npm run build:vue.');
  server.use(express.static(dist));
  return new Promise((resolve, reject) => {
    const listen = currentPort => {
      const candidate = server.listen(currentPort, '127.0.0.1');
      candidate.once('error', error => {
        if (error.code === 'EADDRINUSE' && currentPort < port + 100) listen(currentPort + 1);
        else reject(error);
      });
      candidate.once('listening', () => {
        httpServer = candidate;
        resolve(`http://localhost:${candidate.address().port}`);
      });
    };
    listen(port);
  });
}
function openExternal(url) {
  try {
    if (['https:', 'http:'].includes(new URL(url).protocol)) shell.openExternal(url).catch(() => {});
  } catch { /* Ignore malformed external links. */ }
}
async function createWindow() {
  const window = new BrowserWindow({
    width: 460, height: 620, minWidth: 320, minHeight: 340,
    show: false, skipTaskbar: false, title: 'Pofi · Góc tập trung',
    frame: false, autoHideMenuBar: true, hasShadow: false, backgroundColor: '#20261f',
    icon: path.join(__dirname, 'pofi_logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      devTools: Boolean(devUrl)
    }
  });
  mainWindow = window;
  windowMode = new WindowMode(window, { workArea: bounds => screen.getDisplayMatching(bounds).workArea });
  if (process.platform !== 'darwin') window.removeMenu();
  for (const event of ['maximize', 'unmaximize', 'always-on-top-changed']) window.on(event, () => {
    if (!window.webContents.isDestroyed()) window.webContents.send('window-state', windowState());
  });
  window.once('ready-to-show', () => revealWindow(window));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== appOrigin) { event.preventDefault(); openExternal(url); }
  });
  mainWindow.on('closed', () => { windowMode.dispose(); windowMode = null; mainWindow = null; });
  await mainWindow.loadURL(appOrigin);
}
function revealWindow(window) {
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.setSkipTaskbar(false);
  window.show();
  window.focus();
}
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    revealWindow(mainWindow);
  });
  app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId('com.pofi-hai-dev.id');
    if (process.platform === 'darwin') app.dock.setIcon(path.join(__dirname, 'pofi_logo.png'));
    settings = new SettingsStorage(path.join(app.getPath('userData'), 'settings.json'));
    timer = new PomodoroTimer({ onChange: publishTimer, onComplete: phase => notify('Pofi', phase === 'work'
      ? 'Đã hết thời gian làm việc, hãy nghỉ ngơi'
      : 'Đã hết thời gian nghỉ, hãy bắt đầu làm việc', phase === 'work' ? 'info' : 'finish') });
    registerIPC();
    appOrigin = devUrl ? new URL(devUrl).origin : await startServer();
    console.log(`Pofi running at ${appOrigin}`);
    powerMonitor.on('resume', () => timer.tick());
    await createWindow();
    app.on('activate', () => {
      if (!mainWindow) createWindow().catch(reportStartupError);
      else revealWindow(mainWindow);
    });
  }).catch(reportStartupError);
}
function reportStartupError(error) {
  console.error(error);
  dialog.showErrorBox('Không thể mở Pofi', error.message);
  app.quit();
}
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (timer) timer.dispose(); if (httpServer) httpServer.close(); });
