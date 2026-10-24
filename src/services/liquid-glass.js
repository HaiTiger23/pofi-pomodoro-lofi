// Keep highlights local to the surface under the pointer. No perpetual animation
// or layout changes; reduced-motion and touch users get the static glass material.
const surfaces = '.app-nav,.focus-space,.music-dock,.lofi-panel,.glass-toggle,.dock-mode .app-layout,button:not(:disabled)';
export function attachGlassLighting(root) {
  let active;
  let frame = 0;
  let pointer;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clear = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    pointer = null;
    if (active) {
      active.style.removeProperty('--glass-x');
      active.style.removeProperty('--glass-y');
      active = null;
    }
  };
  const update = () => {
    frame = 0;
    const point = pointer;
    if (!point) return;
    if (active !== point.surface) {
      clear();
      active = point.surface;
    }
    const rect = active.getBoundingClientRect();
    active.style.setProperty('--glass-x', `${Math.max(0, Math.min(rect.width, point.x - rect.left))}px`);
    active.style.setProperty('--glass-y', `${Math.max(0, Math.min(rect.height, point.y - rect.top))}px`);
  };
  const move = event => {
    if (root.documentElement.dataset.glass !== 'true' || reducedMotion.matches || event.pointerType === 'touch') { clear(); return; }
    const surface = event.target.closest?.(surfaces);
    if (!surface) { clear(); return; }
    pointer = { surface, x: event.clientX, y: event.clientY };
    if (!frame) frame = window.requestAnimationFrame(update);
  };
  root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerleave', clear);
  window.addEventListener('blur', clear);
  reducedMotion.addEventListener('change', clear);
  return () => {
    clear();
    root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerleave', clear);
    window.removeEventListener('blur', clear);
    reducedMotion.removeEventListener('change', clear);
  };
}
