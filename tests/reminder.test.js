const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { SessionReminder } = require('../electron/session-reminder');

class ReminderWindow extends EventEmitter {
  constructor(options) {
    super(); this.options = options; this.destroyed = false; this.shown = 0; this.levels = []; this.sent = [];
    this.webContents = new EventEmitter();
    this.webContents.mainFrame = {};
    this.webContents.setWindowOpenHandler = handler => { this.openHandler = handler; };
    this.webContents.send = (...args) => this.sent.push(args);
  }
  isDestroyed() { return this.destroyed; }
  removeMenu() {}
  setAlwaysOnTop(...args) { this.levels.push(args); }
  show() { this.shown++; }
  focus() {}
  moveTop() {}
  loadFile(file) { this.file = file; return Promise.resolve(); }
  destroy() { this.destroyed = true; this.emit('closed'); }
  close() { const event = { preventDefault() { this.prevented = true; } }; this.emit('close', event); if (!event.prevented) this.destroy(); }
}
function fixture() {
  let now = 0, next = 0;
  const windows = [], callbacks = new Map();
  const reminder = new SessionReminder({
    createWindow: options => { const window = new ReminderWindow(options); windows.push(window); return window; },
    displayBounds: () => ({ x: -1920, y: 0, width: 1920, height: 1080 }),
    now: () => now, schedule: callback => { callbacks.set(++next, callback); return next; }, cancel: id => callbacks.delete(id)
  });
  return { reminder, windows, callbacks, advance: ms => { now += ms; } };
}
test('reminder is full-screen on the chosen monitor and uses the highest topmost level', () => {
  const f = fixture(); f.reminder.show({ phase: 'longBreak' });
  const window = f.windows[0];
  assert.equal(window.options.fullscreen, true);
  assert.equal(window.options.skipTaskbar, true);
  assert.equal(window.options.webPreferences.sandbox, true);
  assert.equal(window.options.webPreferences.nodeIntegration, false);
  assert.deepEqual([window.options.x, window.options.width], [-1920, 1920]);
  assert.deepEqual(window.levels[0], [true, 'screen-saver']);
  assert.deepEqual(window.openHandler({}), { action: 'deny' });
  assert.equal(window.shown, 0);
  window.emit('ready-to-show');
  assert.equal(window.shown, 1);
  assert.equal(f.reminder.state().remaining, 10);
});
test('ten seconds start after loading and cannot be bypassed by IPC, Escape or Alt+F4', () => {
  const f = fixture(); f.reminder.show({ phase: 'shortBreak' });
  const window = f.windows[0];
  f.advance(20000);
  assert.equal(f.reminder.dismiss(), false);
  window.close(); assert.equal(window.destroyed, false);
  window.emit('ready-to-show');
  f.advance(9999);
  assert.equal(f.reminder.state().remaining, 1);
  assert.equal(f.reminder.dismiss(), false);
  window.close(); assert.equal(window.destroyed, false);
  window.webContents.emit('before-input-event', { preventDefault() {} }, { type: 'keyDown', key: 'Escape' });
  assert.equal(window.destroyed, false);
  f.advance(1);
  assert.equal(f.reminder.state().canDismiss, true);
  assert.equal(f.reminder.dismiss(), true);
  assert.equal(window.destroyed, true);
  assert.equal(f.callbacks.size, 0);
});
test('new transitions reuse one window, reset the countdown, and do not stack callbacks', () => {
  const f = fixture(); f.reminder.show({ phase: 'shortBreak' });
  f.windows[0].emit('ready-to-show'); f.advance(9000);
  f.reminder.show({ phase: 'work', completedWork: 3 });
  assert.equal(f.windows.length, 1);
  assert.equal(f.callbacks.size, 1);
  assert.equal(f.reminder.state().remaining, 10);
  assert.equal(f.reminder.state().phase, 'work');
  assert.equal(f.reminder.state().completedWork, 3);
  f.reminder.dispose();
  assert.equal(f.callbacks.size, 0);
  f.reminder.show({ phase: 'longBreak' });
  assert.equal(f.windows.length, 2);
});
test('only the dedicated reminder renderer can use the reminder IPC', () => {
  const f = fixture(); f.reminder.show({ phase: 'work' });
  const webContents = f.windows[0].webContents;
  assert.equal(f.reminder.isTrusted({ sender: webContents, senderFrame: webContents.mainFrame }), true);
  assert.equal(f.reminder.isTrusted({ sender: {}, senderFrame: webContents.mainFrame }), false);
  assert.equal(f.reminder.isTrusted({ sender: webContents, senderFrame: {} }), false);
  f.reminder.dispose();
  assert.equal(f.reminder.isTrusted({ sender: webContents, senderFrame: webContents.mainFrame }), false);
});
test('closing after the countdown or quitting disposes the timer without blocking shutdown', () => {
  const f = fixture(); f.reminder.show({ phase: 'work' }); f.windows[0].emit('ready-to-show');
  f.advance(10000); f.windows[0].close();
  assert.equal(f.reminder.window, null);
  assert.equal(f.callbacks.size, 0);
  f.reminder.show({ phase: 'shortBreak' }); f.windows[1].emit('ready-to-show');
  f.reminder.dispose(); f.reminder.dispose();
  assert.equal(f.windows[1].destroyed, true);
  assert.equal(f.callbacks.size, 0);
});
