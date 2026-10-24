const path = require('path');

// A separate native window leaves the timer, music, dock and main window bounds
// intact. The main process enforces the full ten seconds, including Alt+F4.
class SessionReminder {
  constructor({ createWindow, displayBounds, now = Date.now, schedule = callback => setInterval(callback, 250), cancel = clearInterval, onError = () => {} }) {
    Object.assign(this, { createWindow, displayBounds, now, schedule, cancel, onError });
    this.window = null;
    this.interval = null;
    this.unlockAt = null;
    this.data = null;
    this.lastSeconds = null;
  }
  show(data) {
    this.data = data;
    if (this.window && !this.window.isDestroyed()) {
      if (this.unlockAt !== null) this.unlockAt = this.now() + 10000;
      this.publish(true);
      this.reveal();
      return;
    }
    this.unlockAt = null;
    const window = this.createWindow({
      ...this.displayBounds(), title: 'Pofi · Nhắc đổi ca',
      show: false, frame: false, fullscreen: true, alwaysOnTop: true,
      skipTaskbar: true, resizable: false, movable: false, minimizable: false, maximizable: false,
      autoHideMenuBar: true, backgroundColor: '#20261f',
      icon: path.join(__dirname, '..', 'pofi_logo.png'),
      webPreferences: { preload: path.join(__dirname, 'reminder-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false }
    });
    this.window = window;
    window.removeMenu();
    window.setAlwaysOnTop(true, 'screen-saver');
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') { event.preventDefault(); this.dismiss(); }
    });
    window.on('close', event => { if (this.unlockAt === null || this.now() < this.unlockAt) event.preventDefault(); });
    window.on('closed', () => {
      if (this.window === window) { this.window = null; this.clear(); }
    });
    window.once('ready-to-show', () => {
      if (window !== this.window || window.isDestroyed()) return;
      this.reveal();
      // Count visible time, not file loading time.
      this.unlockAt = this.now() + 10000;
      this.publish(true);
      this.interval = this.schedule(() => this.publish());
    });
    window.loadFile(path.join(__dirname, 'reminder.html')).catch(error => {
      if (window === this.window) { this.dispose(); this.onError(error, data); }
    });
  }
  reveal() {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.setAlwaysOnTop(true, 'screen-saver');
    this.window.show();
    this.window.moveTop();
    this.window.focus();
  }
  state() {
    const remaining = this.unlockAt === null ? 10 : Math.ceil(Math.max(0, this.unlockAt - this.now()) / 1000);
    return { ...this.data, remaining, canDismiss: remaining === 0 };
  }
  publish(force = false) {
    if (!this.window || this.window.isDestroyed()) return;
    const state = this.state();
    if (force || this.lastSeconds !== state.remaining) this.window.webContents.send('reminder-state', state);
    this.lastSeconds = state.remaining;
  }
  dismiss() {
    if (!this.window || !this.state().canDismiss) return false;
    this.dispose();
    return true;
  }
  isTrusted(event) {
    return Boolean(this.window && event.sender === this.window.webContents && event.senderFrame === this.window.webContents.mainFrame);
  }
  clear() {
    if (this.interval !== null) this.cancel(this.interval);
    this.interval = null;
    this.lastSeconds = null;
  }
  dispose() {
    this.clear();
    const window = this.window;
    this.window = null;
    this.unlockAt = null;
    if (window && !window.isDestroyed()) window.destroy();
  }
}
module.exports = { SessionReminder };
