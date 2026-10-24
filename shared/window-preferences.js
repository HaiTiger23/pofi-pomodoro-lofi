const validDockScale = value => ['string','number'].includes(typeof value) && String(value).trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 80 && Number(value) <= 160;
function windowLayout(raw) {
  let value;
  try { value = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const position = bounds => bounds && ['x','y'].every(key => Number.isFinite(bounds[key]) && Math.abs(bounds[key]) <= 100000);
  const layout = {};
  if (position(value.normal) && Number.isFinite(value.normal.width) && value.normal.width >= 320 && value.normal.width <= 10000 && Number.isFinite(value.normal.height) && value.normal.height >= 340 && value.normal.height <= 10000) {
    layout.normal = Object.fromEntries(['x','y','width','height'].map(key => [key, Math.round(value.normal[key])]));
    layout.maximized = value.maximized === true;
  }
  if (position(value.dock)) layout.dock = { x: Math.round(value.dock.x), y: Math.round(value.dock.y) };
  return layout;
}
module.exports = { validDockScale, windowLayout };
