const { app, BrowserWindow, ipcMain, shell, Notification, dialog, powerMonitor, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const sound = require('sound-play');
const { PomodoroTimer } = require('./electron/timer');
const { SettingsStorage } = require('./electron/storage');
const { YouTubeSearch, registerSearchRoute } = require('./electron/youtube-search');
const { WindowMode } = require('./electron/window-mode');
const { SessionReminder } = require('./electron/session-reminder');
const { normalize } = require('./shared/validation');
const youtubeSearch = new YouTubeSearch();

let mainWindow;
let httpServer;
let settings;
let timer;
let appOrigin;
let windowMode;
let sessionReminder;
let latestCompletion;
let windowSaveTimeout;
const devUrl = !app.isPackaged && process.env.POFI_DEV_URL;

function notify(title, body, type = 'info') {
  if (Notification.isSupported()) new Notification({ title, body, silent: true }).show();
  playNotificationSound(type);
}
function playNotificationSound(type) {
  const filename = type === 'finish' ? 'success-fanfare-trumpets-6185.mp3' : 'simple-notification-152054.mp3';
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  const audio = path.join(base, 'sounds', filename);
  if (fs.existsSync(audio)) sound.play(audio, 1).catch(() => console.warn('Không thể phát âm báo.'));
}
function completePhase(phase, detail) {
  const body = phase === 'work' ? `Đã hoàn thành một vòng. Đến giờ ${detail.nextPhase === 'longBreak' ? 'nghỉ dài' : 'nghỉ ngắn'}.` : 'Đã hết thời gian nghỉ, hãy bắt đầu làm việc';
  const type = phase === 'work' ? 'info' : 'finish';
  if (settings.values.fullscreen_reminders !== 'true') { notify('Pofi', body, type); return; }
  // A delayed tick can finish both work and rest. Present the latest transition
  // once, instead of stacking full-screen windows after waking the computer.
  latestCompletion = { body, type };
  queueMicrotask(() => {
    const completion = latestCompletion;
    latestCompletion = null;
    if (!completion || !mainWindow) return;
    if (settings.values.fullscreen_reminders !== 'true') { notify('Pofi', completion.body, completion.type); return; }
    const state = timer.snapshot(), s = timer.settings;
    try {
      sessionReminder.show({ ...state, ...completion, theme: settings.values.ui_theme, glass: settings.values.liquid_glass === 'true',
        duration: state.phase === 'work' ? s.workMinutes : state.phase === 'longBreak' ? s.longBreakMinutes : s.shortBreakMinutes,
        autoStarted: state.isRunning });
      playNotificationSound(completion.type);
    } catch { notify('Pofi', completion.body, completion.type); }
  });
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
  return { pinned: mainWindow.isAlwaysOnTop(), maximized: mainWindow.isMaximized(), dockMode: Boolean(windowMode?.dockMode), dockScale: windowMode?.scale || 100 };
}
function saveWindowPreferences() {
  clearTimeout(windowSaveTimeout);
  windowSaveTimeout = null;
  if (!windowMode) return;
  settings.set('window_layout', windowMode.layout);
  settings.set('dock_scale', windowMode.scale);
}
function windowPreferencesChanged() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('window-state', windowState());
  clearTimeout(windowSaveTimeout);
  windowSaveTimeout = setTimeout(() => {
    try { saveWindowPreferences(); } catch { console.warn('Không thể lưu vị trí cửa sổ.'); }
  }, 200);
}
function registerIPC() {
  const handle = (channel, callback) => ipcMain.handle(channel, (event, ...args) => {
    if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) throw new Error('Untrusted renderer');
    return callback(...args);
  });
  handle('storage-initialize', legacy => settings.initialize(legacy));
  handle('storage-set', (key, value) => {
    const saved = settings.set(key, value);
    if (key === 'fullscreen_reminders' && saved === 'false') sessionReminder.dispose();
    return saved;
  });
  for (const [channel, callback] of [['reminder-get-state', () => sessionReminder.state()], ['reminder-dismiss', () => sessionReminder.dismiss()]]) {
    ipcMain.handle(channel, event => {
      if (!sessionReminder.isTrusted(event)) throw new Error('Untrusted renderer');
      return callback();
    });
  }
  handle('search-youtube', async (query, cursor) => {
    try { return await youtubeSearch.searchPage(query, cursor); }
    catch (error) { return { error: error.message }; }
  });
  handle('toggle-pin-window', shouldPin => {
    mainWindow.setAlwaysOnTop(Boolean(shouldPin));
    return mainWindow.isAlwaysOnTop();
  });
  handle('get-window-state', windowState);
  handle('set-dock-scale', async value => {
    await windowMode.setDockScale(value);
    saveWindowPreferences();
    return windowState();
  });
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
  handle('configure-pomodoro-timer', (...settings) => timer.configure(...settings));
  handle('start-pomodoro-timer', (...settings) => timer.start(...settings));
  handle('skip-pomodoro-break', () => timer.skipBreak());
  handle('skip-pomodoro-phase', () => timer.skipPhase());
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
      // App preferences are persisted by SettingsStorage. Give remote playback
      // a fresh, in-memory browser session on launch instead of reusing stale
      // YouTube site data from previous runs. The old profile is left intact.
      partition: 'pofi-playback',
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      devTools: Boolean(devUrl)
    }
  });
  mainWindow = window;
  windowMode = new WindowMode(window, { workArea: bounds => screen.getDisplayMatching(bounds).workArea,
    layout: normalize('window_layout', settings.values.window_layout), scale: normalize('dock_scale', settings.values.dock_scale),
    onChange: windowPreferencesChanged });
  if (process.platform !== 'darwin') window.removeMenu();
  for (const event of ['maximize', 'unmaximize', 'always-on-top-changed']) window.on(event, () => {
    if (!window.webContents.isDestroyed()) window.webContents.send('window-state', windowState());
  });
  window.once('ready-to-show', () => revealWindow(window));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== appOrigin) { event.preventDefault(); openExternal(url); }
  });
  mainWindow.on('closed', () => {
    sessionReminder.dispose();
    try { saveWindowPreferences(); } catch { console.warn('Không thể lưu vị trí cửa sổ.'); }
    windowMode.dispose(); windowMode = null; mainWindow = null;
  });
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
    if (sessionReminder?.window) sessionReminder.reveal();
    else revealWindow(mainWindow);
  });
  app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId('com.pofi-hai-dev.id');
    if (process.platform === 'darwin') app.dock.setIcon(path.join(__dirname, 'pofi_logo.png'));
    settings = new SettingsStorage(path.join(app.getPath('userData'), 'settings.json'));
    sessionReminder = new SessionReminder({ createWindow: options => new BrowserWindow(options),
      displayBounds: () => screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds,
      onError: (_error, data) => notify('Pofi', data.body, data.type) });
    timer = new PomodoroTimer({ onChange: publishTimer, onComplete: completePhase });
    registerIPC();
    appOrigin = devUrl ? new URL(devUrl).origin : await startServer();
    console.log(`Pofi running at ${appOrigin}`);
    powerMonitor.on('resume', () => timer.tick());
    await createWindow();
    app.on('activate', () => {
      if (sessionReminder.window) sessionReminder.reveal();
      else if (!mainWindow) createWindow().catch(reportStartupError);
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
app.on('before-quit', () => {
  if (sessionReminder) sessionReminder.dispose();
  try { saveWindowPreferences(); } catch { console.warn('Không thể lưu vị trí cửa sổ.'); }
  if (timer) timer.dispose(); if (httpServer) httpServer.close();
});
