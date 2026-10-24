import { createFilterBank, lensGeometry } from './glass-optics';

const surfaces = '.app-nav,.focus-space,.music-dock,.lofi-panel:not(.search-panel),.glass-toggle,.dock-mode .app-layout,.primary-button,.secondary-button,.play-button,.icon-button,.nav-button,.background-options>button,.phase-pill';
export function attachGlassMaterial(root) {
  const view = root.defaultView;
  const records = new Map();
  let bank, scanFrame = 0, enabled = false, disposed = false, fallback = false;
  const remove = element => {
    const record = records.get(element);
    if (!record) return;
    resize?.unobserve(element);
    bank?.release(record.filter);
    record.warp.remove();
    element.classList.remove('pofi-glass-surface');
    if (record.positioned) element.classList.remove('pofi-glass-relative');
    records.delete(element);
  };
  const measure = (element, record) => {
    const style = view.getComputedStyle(element);
    const { width, height, radius } = lensGeometry(element.offsetWidth, element.offsetHeight, parseFloat(style.borderTopLeftRadius));
    const key = `${width}:${height}:${radius}`;
    if (key === record.key) return;
    let filter;
    if (!fallback) {
      try { filter = bank.acquire(width, height, radius); }
      catch { fallback = true; root.documentElement.dataset.glassOptics = 'frosted'; }
    }
    bank.release(record.filter); record.filter = filter; record.key = key;
    record.warp.style.borderRadius = `${radius}px`;
    record.warp.style.filter = filter ? `url("#${filter.id}")` : 'none';
  };
  const visible = element => element.isConnected && element.offsetWidth > 0 && element.offsetHeight > 0 && !element.closest('.window-controls,.search-panel');
  const scan = () => {
    scanFrame = 0;
    if (!enabled || disposed) return;
    const next = new Set([...root.querySelectorAll(surfaces)].filter(visible));
    for (const element of records.keys()) if (!next.has(element)) remove(element);
    for (const element of next) {
      let record = records.get(element);
      if (!record) {
        const warp = root.createElement('span');
        warp.className = 'pofi-glass-warp'; warp.setAttribute('aria-hidden', 'true');
        const positioned = view.getComputedStyle(element).position === 'static';
        record = { warp, positioned, filter: null, key: null };
        records.set(element, record);
        element.classList.add('pofi-glass-surface');
        if (positioned) element.classList.add('pofi-glass-relative');
        element.prepend(warp);
        resize?.observe(element);
      }
      measure(element, record);
    }
  };
  const scheduleScan = () => { if (enabled && !scanFrame && !disposed) scanFrame = view.requestAnimationFrame(scan); };
  const resize = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(scheduleScan) : null;
  const changes = new view.MutationObserver(mutations => {
    if (mutations.some(mutation => {
      if (mutation.type === 'attributes') return mutation.target.matches?.('.lofi-shell,.panel-overlay');
      if (mutation.target.closest?.('[data-pofi-glass-filters]')) return false;
      return [...mutation.addedNodes, ...mutation.removedNodes].some(node => node.nodeType === 1 && !node.matches?.('.pofi-glass-warp,[data-pofi-glass-filters]'));
    })) scheduleScan();
  });
  const sync = () => {
    const selected = root.documentElement.dataset.glass === 'true';
    if (selected === enabled) { if (enabled) { for (const record of records.values()) record.key = null; scheduleScan(); } return; }
    enabled = selected;
    if (enabled) {
      fallback = false; bank = createFilterBank(root); root.documentElement.dataset.glassOptics = 'refractive';
      changes.observe(root.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','style'] });
      scan();
    } else {
      changes.disconnect(); resize?.disconnect();
      if (scanFrame) view.cancelAnimationFrame(scanFrame);
      scanFrame = 0;
      for (const element of records.keys()) remove(element);
      bank?.destroy(); bank = null;
      delete root.documentElement.dataset.glassOptics;
    }
  };
  const appearance = new view.MutationObserver(sync);
  appearance.observe(root.documentElement, { attributes: true, attributeFilter: ['data-glass','data-theme'] });
  sync();
  view.addEventListener('resize', scheduleScan);
  return () => {
    disposed = true; appearance.disconnect(); changes.disconnect(); resize?.disconnect();
    if (scanFrame) view.cancelAnimationFrame(scanFrame);
    for (const element of records.keys()) remove(element);
    bank?.destroy(); delete root.documentElement.dataset.glassOptics;
    view.removeEventListener('resize', scheduleScan);
  };
}
