const DOCK_SIZE = { width: 320, height: 72 };
const { validDockScale, windowLayout } = require('../shared/window-preferences');

function fitBounds(bounds, area) {
  const width = Math.min(bounds.width, area.width), height = Math.min(bounds.height, area.height);
  return {
    x: Math.round(Math.max(area.x, Math.min(bounds.x, area.x + area.width - width))),
    y: Math.round(Math.max(area.y, Math.min(bounds.y, area.y + area.height - height))),
    width, height
  };
}

function pillShape(width, height) {
  const radius = Math.min(width, height) / 2;
  return Array.from({ length: height }, (_, y) => {
    const edge = Math.max(0, radius - Math.min(y + .5, height - y - .5));
    const inset = Math.ceil(radius - Math.sqrt(Math.max(0, radius * radius - edge * edge)));
    return { x: inset, y, width: Math.max(1, width - inset * 2), height: 1 };
  });
}

class WindowMode {
  constructor(window, { workArea, shaped = ['win32', 'linux'].includes(process.platform), layout, scale = 100, onChange = () => {} }) {
    this.window = window;
    this.workArea = workArea;
    this.shaped = shaped && typeof window.setShape === 'function';
    this.dockMode = false;
    this.pending = Promise.resolve();
    this.layout = windowLayout(layout);
    this.scale = validDockScale(scale) ? Number(scale) : 100;
    this.onChange = onChange;
    this.switching = false;
    if (this.layout.normal) {
      window.setBounds(fitBounds(this.layout.normal, this.workArea(this.layout.normal)));
      if (this.layout.maximized) window.maximize();
    }
    this.refreshShape = () => {
      if (this.dockMode && this.shaped && !window.isDestroyed()) {
        try { window.setShape(pillShape(...window.getSize())); }
        catch { /* Some window managers do not support custom regions. */ }
      }
    };
    window.on('resize', this.refreshShape);
    this.remember = () => {
      if (this.switching || window.isDestroyed()) return;
      if (this.dockMode) {
        this.dockBounds = window.getBounds();
        this.layout.dock = { x: this.dockBounds.x, y: this.dockBounds.y };
      } else {
        this.layout.normal = window.getNormalBounds();
        this.layout.maximized = window.isMaximized();
      }
      this.onChange();
    };
    for (const event of ['move','resize','maximize','unmaximize']) window.on(event, this.remember);
  }
  dockSize() { return { width: Math.round(DOCK_SIZE.width * this.scale / 100), height: Math.round(DOCK_SIZE.height * this.scale / 100) }; }
  setDockScale(value) {
    if (!validDockScale(value)) return Promise.reject(new TypeError('Invalid dock scale'));
    this.pending = this.pending.catch(() => {}).then(() => {
      if (this.window.isDestroyed()) return;
      this.scale = Number(value);
      if (this.dockMode) {
        const desired = { ...this.window.getBounds(), ...this.dockSize() };
        this.dockBounds = fitBounds(desired, this.workArea(desired));
        this.window.setBounds(this.dockBounds);
        this.refreshShape();
      }
      this.remember();
    });
    return this.pending;
  }
  setDockMode(enabled) {
    if (typeof enabled !== 'boolean') return Promise.reject(new TypeError('Invalid dock mode'));
    // Serialize rapid clicks so an unfinished restore cannot overwrite saved bounds.
    this.pending = this.pending.catch(() => {}).then(() => this.switchMode(enabled));
    return this.pending;
  }
  async switchMode(enabled) {
    const window = this.window;
    if (enabled === this.dockMode || window.isDestroyed()) return;
    this.switching = true;
    try {
    if (enabled) {
      const anchor = window.getBounds();
      this.saved = { bounds: window.getNormalBounds(), maximized: window.isMaximized(), minimum: window.getMinimumSize(), resizable: window.isResizable(), maximizable: window.isMaximizable(), pinned: window.isAlwaysOnTop() };
      this.layout.normal = { ...this.saved.bounds };
      this.layout.maximized = this.saved.maximized;
      if (this.saved.maximized) await new Promise((resolve, reject) => {
        const finish = () => { clearTimeout(timeout); window.removeListener('unmaximize', finish); window.isDestroyed() || window.isMaximized() ? reject(new Error('Cannot restore window')) : resolve(); };
        const timeout = setTimeout(finish, 1000);
        window.once('unmaximize', finish);
        window.unmaximize();
      });
      window.setMinimumSize(256, 58);
      window.setMaximizable(false);
      this.dockMode = true;
      const size = this.dockSize();
      const desired = this.layout.dock ? { ...this.layout.dock, ...size } : { x: anchor.x + (anchor.width - size.width) / 2, y: anchor.y + anchor.height - size.height, ...size };
      this.dockBounds = fitBounds(desired, this.workArea(desired));
      window.setBounds(this.dockBounds);
      window.setResizable(false);
      window.setAlwaysOnTop(true);
      this.refreshShape();
    } else {
      const current = window.getBounds();
      this.layout.dock = { x: current.x, y: current.y };
      const desired = this.saved.bounds;
      this.dockMode = false;
      if (this.shaped) {
        try { window.setShape([]); }
        catch { /* Restoring size must also work without custom window regions. */ }
      }
      window.setResizable(this.saved.resizable);
      window.setMaximizable(this.saved.maximizable);
      window.setMinimumSize(...this.saved.minimum);
      window.setBounds(fitBounds(desired, this.workArea(desired)));
      window.setAlwaysOnTop(this.saved.pinned);
      if (this.saved.maximized) window.maximize();
      this.saved = null;
    }
    } finally { this.switching = false; this.remember(); }
  }
  dispose() {
    this.window.removeListener('resize', this.refreshShape);
    for (const event of ['move','resize','maximize','unmaximize']) this.window.removeListener(event, this.remember);
  }
}
module.exports = { WindowMode, DOCK_SIZE, fitBounds, pillShape };
