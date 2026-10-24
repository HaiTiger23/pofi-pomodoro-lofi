const test = require('node:test');
const assert = require('node:assert/strict');
const { lensGeometry, buildLensMap } = require('../src/services/glass-optics');

test('glass keeps a neutral, undisplaced center and bends only the rounded edge band', () => {
  const map = buildLensMap(200, 100, 22);
  const center = (50 * map.mapWidth + 100) * 4;
  assert.deepEqual([...map.displacement.slice(center,center+4)], [128,128,128,255]);
  assert.equal(map.mask[center+3],0);
  const left=(50*map.mapWidth+5)*4, right=(50*map.mapWidth+194)*4;
  assert.ok(map.mask[left+3]>0);
  assert.equal(map.mask[left+3],map.mask[right+3]);
  assert.ok(map.displacement[left]>128);
  assert.ok(map.displacement[right]<128);
  assert.equal(map.displacement[left]+map.displacement[right],256);
  assert.equal(map.mask[3],0);
});
test('maps bound their raster cost, preserve aspect ratio, and clamp capsule radii', () => {
  const map=buildLensMap(1920,1080,999);
  assert.deepEqual([map.mapWidth,map.mapHeight],[384,216]);
  assert.equal(map.displacement.length,384*216*4);
  assert.equal(map.radius,540);
  assert.equal(map.band,20);
  assert.deepEqual(lensGeometry(320,72,999),{width:320,height:72,radius:36,band:11.52});
  assert.equal(buildLensMap(1,1,999).displacement.length,4);
});
