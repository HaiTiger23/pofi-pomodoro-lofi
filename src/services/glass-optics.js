// Edge refraction / RGB separation adapted from rdev/liquid-glass-react (MIT).
// Attribution: public/licenses/liquid-glass-react.txt. Lens maps are generated
// locally from rounded geometry instead of copying the reference's bitmap maps.
const SVG_NS = 'http://www.w3.org/2000/svg';
function lensGeometry(width, height, radius) {
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  return { width: w, height: h, radius: Math.max(0, Math.min(Number(radius) || 0, w / 2, h / 2)), band: Math.max(3, Math.min(20, Math.min(w, h) * .16)) };
}
function buildLensMap(width, height, radius, maxResolution = 384) {
  const geometry = lensGeometry(width, height, radius);
  const ratio = Math.min(1, maxResolution / Math.max(geometry.width, geometry.height));
  const w = Math.max(1, Math.round(geometry.width * ratio)), h = Math.max(1, Math.round(geometry.height * ratio));
  const r = geometry.radius * ratio, band = geometry.band * ratio;
  const displacement = new Uint8ClampedArray(w * h * 4), mask = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + .5 - w / 2, py = y + .5 - h / 2;
    const qx = Math.abs(px) - w / 2 + r, qy = Math.abs(py) - h / 2 + r;
    let distance, nx, ny;
    if (qx > 0 && qy > 0) {
      const length = Math.hypot(qx, qy);
      distance = r - length; nx = Math.sign(px) * qx / length; ny = Math.sign(py) * qy / length;
    } else {
      const dx = w / 2 - Math.abs(px), dy = h / 2 - Math.abs(py);
      distance = Math.min(dx, dy); nx = dx < dy ? Math.sign(px) : 0; ny = dx < dy ? 0 : Math.sign(py);
    }
    const t = Math.max(0, Math.min(1, distance / band));
    const strength = distance <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t) ** 2;
    const i = (y * w + x) * 4;
    displacement.set([128 - nx * strength * 126, 128, 128 - ny * strength * 126, 255], i);
    mask.set([255, 255, 255, Math.round(strength * 255)], i);
  }
  return { ...geometry, mapWidth: w, mapHeight: h, displacement, mask };
}
function createFilterBank(document) {
  const svg = document.createElementNS(SVG_NS, 'svg'), defs = document.createElementNS(SVG_NS, 'defs');
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.setAttribute('data-pofi-glass-filters', '');
  svg.style.cssText = 'position:fixed;width:0;height:0;overflow:hidden;pointer-events:none;';
  svg.appendChild(defs); document.body.appendChild(svg);
  const filters = new Map(); let next = 0;
  const element = (tag, attributes, parent = defs) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent.appendChild(node); return node;
  };
  const image = (pixels, width, height) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable');
    const data = context.createImageData(width, height); data.data.set(pixels); context.putImageData(data, 0, 0);
    return canvas.toDataURL('image/png');
  };
  return {
    acquire(width, height, radius) {
      const geometry = lensGeometry(width, height, radius);
      const key = `${geometry.width}:${geometry.height}:${geometry.radius.toFixed(1)}`;
      let entry = filters.get(key);
      if (entry) { entry.refs++; return entry; }
      const map = buildLensMap(width, height, radius), id = `pofi-glass-lens-${++next}`;
      const filter = element('filter', { id, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', x: -geometry.width * .1, y: -geometry.height * .1, width: geometry.width * 1.2, height: geometry.height * 1.2, 'color-interpolation-filters': 'sRGB' });
      try {
        element('feImage', { href: image(map.displacement, map.mapWidth, map.mapHeight), x: 0, y: 0, width: geometry.width, height: geometry.height, preserveAspectRatio: 'none', result: 'lens-map' }, filter);
        element('feImage', { href: image(map.mask, map.mapWidth, map.mapHeight), x: 0, y: 0, width: geometry.width, height: geometry.height, preserveAspectRatio: 'none', result: 'edge-mask' }, filter);
        for (const [i, name] of ['red', 'green', 'blue'].entries()) {
          element('feDisplacementMap', { in: 'SourceGraphic', in2: 'lens-map', scale: (map.band * (.82 + i * .015)).toFixed(2), xChannelSelector: 'R', yChannelSelector: 'B', result: `${name}-shift` }, filter);
          const matrix = Array(20).fill(0); matrix[i * 5 + i] = 1; matrix[19] = 1;
          element('feColorMatrix', { in: `${name}-shift`, type: 'matrix', values: matrix.join(' '), result: name }, filter);
        }
        element('feBlend', { in: 'red', in2: 'green', mode: 'screen', result: 'rg' }, filter);
        element('feBlend', { in: 'rg', in2: 'blue', mode: 'screen', result: 'rgb' }, filter);
        // Restore original alpha after combining channels; adding disjoint masks
        // prevents a dark/beveled seam on translucent light-theme surfaces.
        element('feComposite', { in: 'rgb', in2: 'SourceAlpha', operator: 'in', result: 'rgba' }, filter);
        element('feComposite', { in: 'rgba', in2: 'edge-mask', operator: 'in', result: 'edge' }, filter);
        element('feComposite', { in: 'SourceGraphic', in2: 'edge-mask', operator: 'out', result: 'center' }, filter);
        element('feComposite', { in: 'edge', in2: 'center', operator: 'arithmetic', k1: 0, k2: 1, k3: 1, k4: 0 }, filter);
      } catch (error) { filter.remove(); throw error; }
      entry = { key, id, filter, refs: 1 }; filters.set(key, entry); return entry;
    },
    release(entry) { if (entry && --entry.refs === 0) { entry.filter.remove(); filters.delete(entry.key); } },
    destroy() { filters.clear(); svg.remove(); }
  };
}
module.exports = { lensGeometry, buildLensMap, createFilterBank };
