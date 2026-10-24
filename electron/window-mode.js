const DOCK_SIZE = { width: 320, height: 72 };

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
  constructor(window, { workArea, shaped = ['win32', 'linux'].includes(process.platform) }) {
    this.window = window;
    this.workArea = workArea;
    this.shaped = shaped && typeof window.setShape === 'function';
    this.dockMode = false;
    this.pending = Promise.resolve();
    this.refreshShape = () => {
      if (this.dockMode && this.shaped && !window.isDestroyed()) {
        try { window.setShape(pillShape(...window.getSize())); }
        catch { /* Some window managers do not support custom regions. */ }
      }
    };
    window.on('resize', this.refreshShape);
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
    if (enabled) {
      const anchor = window.getBounds();
      this.saved = { bounds: window.getNormalBounds(), maximized: window.isMaximized(), minimum: window.getMinimumSize(), resizable: window.isResizable(), maximizable: window.isMaximizable(), pinned: window.isAlwaysOnTop() };
      if (this.saved.maximized) await new Promise((resolve, reject) => {
        const finish = () => { clearTimeout(timeout); window.removeListener('unmaximize', finish); window.isDestroyed() || window.isMaximized() ? reject(new Error('Cannot restore window')) : resolve(); };
        const timeout = setTimeout(finish, 1000);
        window.once('unmaximize', finish);
        window.unmaximize();
      });
      window.setMinimumSize(260, DOCK_SIZE.height);
      window.setMaximizable(false);
      this.dockMode = true;
      this.dockBounds = fitBounds({ x: anchor.x + (anchor.width - DOCK_SIZE.width) / 2, y: anchor.y + anchor.height - DOCK_SIZE.height, ...DOCK_SIZE }, this.workArea(anchor));
      window.setBounds(this.dockBounds);
      window.setResizable(false);
      window.setAlwaysOnTop(true);
      this.refreshShape();
    } else {
      const current = window.getBounds();
      const desired = { ...this.saved.bounds, x: this.saved.bounds.x + current.x - this.dockBounds.x, y: this.saved.bounds.y + current.y - this.dockBounds.y };
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
  }
  dispose() { this.window.removeListener('resize', this.refreshShape); }
}
module.exports = { WindowMode, DOCK_SIZE, fitBounds, pillShape };
