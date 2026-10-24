const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { WindowMode, fitBounds, pillShape } = require('../electron/window-mode');

class WindowFixture extends EventEmitter {
  constructor() { super(); this.bounds = { x: 100, y: 80, width: 460, height: 620 }; this.normal = { ...this.bounds }; this.minimum = [320, 340]; this.resizable = true; this.maximizable = true; this.maximized = false; this.shape = []; this.pinned = false; }
  isDestroyed() { return false; }
  getBounds() { return { ...this.bounds }; }
  getNormalBounds() { return this.maximized ? { ...this.normal } : this.getBounds(); }
  getSize() { return [this.bounds.width, this.bounds.height]; }
  getMinimumSize() { return [...this.minimum]; }
  isResizable() { return this.resizable; }
  isMaximizable() { return this.maximizable; }
  isMaximized() { return this.maximized; }
  isAlwaysOnTop() { return this.pinned; }
  setAlwaysOnTop(value) { this.pinned = value; }
  setMinimumSize(...size) { this.minimum = size; }
  setResizable(value) { this.resizable = value; }
  setMaximizable(value) { this.maximizable = value; }
  setBounds(bounds) { this.bounds = { ...bounds }; this.emit('resize'); }
  setShape(shape) { this.shape = shape; }
  maximize() { this.normal = this.getBounds(); this.maximized = true; this.bounds = { x: 0, y: 0, width: 1920, height: 1040 }; this.emit('maximize'); }
  unmaximize() { this.maximized = false; this.bounds = { ...this.normal }; this.emit('unmaximize'); }
}
const area = { x: 0, y: 0, width: 1920, height: 1040 };

test('dock restores exact normal bounds and window limits after rapid repeated commands', async () => {
  const window = new WindowFixture(), original = window.getBounds();
  const mode = new WindowMode(window, { workArea: () => area, shaped: true });
  await Promise.all([mode.setDockMode(true), mode.setDockMode(true)]);
  assert.equal(mode.dockMode, true);
  assert.deepEqual(window.getSize(), [320, 72]);
  assert.equal(window.resizable, false);
  assert.equal(window.maximizable, false);
  assert.equal(window.pinned, true);
  assert.equal(window.shape.length, 72);
  await mode.setDockMode(false);
  assert.deepEqual(window.getBounds(), original);
  assert.deepEqual(window.minimum, [320, 340]);
  assert.equal(window.resizable, true);
  assert.equal(window.maximizable, true);
  assert.equal(window.pinned, false);
  assert.deepEqual(window.shape, []);
  await mode.setDockMode(false);
  await assert.rejects(mode.setDockMode('yes'), /Invalid dock mode/);
  await mode.setDockMode(true);
  await mode.setDockMode(false);
  assert.deepEqual(window.getBounds(), original);
  mode.dispose();
  assert.equal(window.listenerCount('resize'), 0);
});

test('a maximized app returns to maximized mode and retains its normal rectangle', async () => {
  const window = new WindowFixture(), normal = window.getBounds();
  window.setAlwaysOnTop(true);
  window.maximize();
  const mode = new WindowMode(window, { workArea: () => area, shaped: false });
  await mode.setDockMode(true);
  assert.equal(window.maximized, false);
  await mode.setDockMode(false);
  assert.equal(window.maximized, true);
  assert.equal(window.pinned, true);
  assert.deepEqual(window.getNormalBounds(), normal);
});

test('normal window and dock remember independent positions across monitors', async () => {
  const window = new WindowFixture(), original = window.getBounds();
  const other = { x: -1280, y: 0, width: 1280, height: 720 };
  const mode = new WindowMode(window, { workArea: bounds => bounds.x < 0 ? other : area, shaped: false });
  await mode.setDockMode(true);
  window.setBounds({ ...window.getBounds(), x: -1270, y: 640 });
  await mode.setDockMode(false);
  assert.deepEqual(window.getBounds(), original);
  window.setBounds({ ...original, x: 900, y: 300 });
  await mode.setDockMode(true);
  assert.deepEqual(window.getBounds(), { x: -1270, y: 640, width: 320, height: 72 });
  await mode.setDockMode(false);
  assert.deepEqual(window.getBounds(), { ...original, x: 900, y: 300 });
});

test('dock size scales content bounds, preserves normal geometry, and serializes rapid mode changes', async () => {
  const window = new WindowFixture(), original = window.getBounds();
  const mode = new WindowMode(window, { workArea: () => area, shaped: true });
  await mode.setDockMode(true);
  window.setBounds({ ...window.getBounds(), x: 500, y: 700 });
  await mode.setDockScale(160);
  assert.deepEqual(window.getBounds(), { x: 500, y: 700, width: 512, height: 115 });
  assert.equal(window.shape.length, 115);
  for (const scale of [0, 79, 161, 100.5, true, {}, '']) await assert.rejects(mode.setDockScale(scale));
  assert.equal(mode.scale, 160);
  await Promise.all([mode.setDockMode(false), mode.setDockScale(80), mode.setDockMode(true)]);
  assert.deepEqual(window.getSize(), [256, 58]);
  assert.equal(window.pinned, true);
  await mode.setDockMode(false);
  assert.deepEqual(window.getBounds(), original);
  assert.deepEqual(mode.layout.dock, { x: 500, y: 700 });
});

test('saved positions and scale restore after restart and fit safely when a monitor disappears', async () => {
  const layout = { normal: { x: -1500, y: 100, width: 460, height: 620 }, dock: { x: -1800, y: 900 }, maximized: true };
  const window = new WindowFixture();
  const mode = new WindowMode(window, { workArea: () => area, layout, scale: 130 });
  assert.equal(window.maximized, true);
  assert.deepEqual(window.getNormalBounds(), { x: 0, y: 100, width: 460, height: 620 });
  await mode.setDockMode(true);
  assert.deepEqual(window.getBounds(), { x: 0, y: 900, width: 416, height: 94 });
  await mode.setDockMode(false);
  assert.equal(window.maximized, true);
  assert.deepEqual(window.getNormalBounds(), { x: 0, y: 100, width: 460, height: 620 });
});

test('screen fitting handles negative origins and capsule regions stay within their rectangle', () => {
  assert.deepEqual(fitBounds({ x: -50, y: -30, width: 320, height: 72 }, { x: -1280, y: -20, width: 1280, height: 720 }), { x: -320, y: -20, width: 320, height: 72 });
  const shape = pillShape(320, 72);
  assert.equal(shape.length, 72);
  assert.ok(shape.every(rect => rect.x >= 0 && rect.x + rect.width <= 320 && rect.y >= 0 && rect.y + rect.height <= 72));
  assert.equal(shape[0].width, shape[71].width);
  assert.ok(shape[0].width < shape[35].width);
});

test('unsupported window shapes never prevent returning to the full app', async () => {
  const window = new WindowFixture(), original = window.getBounds();
  window.setShape = () => { throw new Error('Unsupported window region'); };
  const mode = new WindowMode(window, { workArea: () => area, shaped: true });
  await mode.setDockMode(true);
  assert.equal(window.pinned, true);
  await mode.setDockMode(false);
  assert.deepEqual(window.getBounds(), original);
  assert.equal(window.pinned, false);
  assert.equal(window.resizable, true);
});
