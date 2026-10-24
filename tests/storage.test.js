const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { SettingsStorage } = require('../electron/storage');
const { normalize, validDuration, migrateAppearance } = require('../shared/validation');
function fileFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pofi-storage-'));
  t.after(() => { for (const name of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, name)); fs.rmdirSync(dir); });
  return path.join(dir, 'settings.json');
}
test('migration persists across origins and restarts, retaining authoritative desktop values', t => {
  const file = fileFixture(t);
  const first = new SettingsStorage(file);
  first.initialize({ duration_pomodoro: '25', pofi_tasks: JSON.stringify([{ id: 1, title: 'Viết báo cáo', priority: 'high' }]) });
  first.set('favorite_songs', JSON.stringify([{ videoId: 'DnewVhYNt-I', title: 'Lofi' }]));
  first.set('ui_theme', 'night');
  first.set('background_mode', 'youtube');
  const second = new SettingsStorage(file).initialize({ duration_pomodoro: '45', pofi_tasks: '[]', favorite_songs: '[]' });
  assert.equal(second.duration_pomodoro, '25');
  assert.equal(second.ui_theme, 'night');
  assert.equal(second.background_mode, 'youtube');
  assert.equal(JSON.parse(second.pofi_tasks)[0].title, 'Viết báo cáo');
  assert.equal(JSON.parse(second.favorite_songs).length, 1);
  assert.equal(fs.existsSync(file + '.tmp'), false);
});
test('malformed JSON is backed up and invalid individual values recover safely', t => {
  const file = fileFixture(t);
  fs.writeFileSync(file, '{broken');
  const values = new SettingsStorage(file).initialize({ duration_pomodoro: '-5', song_history: 'not json', pofi_tasks: '{}' });
  assert.equal(values.duration_pomodoro, '45');
  assert.equal(values.song_history, '[]');
  assert.equal(values.pofi_tasks, '[]');
  const backup = fs.readdirSync(path.dirname(file)).find(name => name.includes('.corrupt-'));
  assert.equal(fs.readFileSync(path.join(path.dirname(file), backup), 'utf8'), '{broken');
});
test('normalization rejects invalid shapes and duplicate entries', () => {
  const tasks = JSON.parse(normalize('pofi_tasks', JSON.stringify([null, {}, { id: 1, title: ' Test ', priority: 'invalid', completed: 'true' }, { id: 1, title: 'Duplicate' }])));
  assert.deepEqual(tasks, [{ id: 1, title: 'Test', completed: false, priority: 'medium', createdAt: null }]);
  const songs = Array.from({ length: 60 }, (_, i) => ({ videoId: String(i).padStart(11, '0'), title: 'Song' }));
  assert.equal(JSON.parse(normalize('song_history', JSON.stringify(songs))).length, 50);
  assert.equal(normalize('favorite_songs', 'null'), '[]');
  assert.throws(() => normalize('__proto__', '{}'));
  assert.equal(validDuration(true), false);
  assert.equal(normalize('ui_theme', 'unknown'), 'warm');
  assert.equal(normalize('background_mode', 'unknown'), 'scene');
});
test('failed writes retain the previous in-memory state', t => {
  const file = fileFixture(t);
  const store = new SettingsStorage(file);
  store.initialize({ duration_pomodoro: '25' });
  fs.mkdirSync(file + '.tmp');
  assert.throws(() => store.set('duration_pomodoro', '30'));
  assert.equal(store.values.duration_pomodoro, '25');
  fs.rmdirSync(file + '.tmp');
  assert.equal(new SettingsStorage(file).initialize().duration_pomodoro, '25');
});
test('empty first run on a new port allows later legacy import without overwriting new edits', t => {
  const file = fileFixture(t);
  const store = new SettingsStorage(file);
  store.initialize({});
  store.set('duration_pomodoro', '45');
  const restored = new SettingsStorage(file).initialize({ duration_pomodoro: '25', pofi_tasks: JSON.stringify([{ id: 1, title: 'Old task' }]) });
  assert.equal(restored.duration_pomodoro, '45');
  assert.equal(JSON.parse(restored.pofi_tasks)[0].title, 'Old task');
});

test('retired glass theme migrates to the night background with a separate glass preference', t => {
  const file = fileFixture(t);
  fs.writeFileSync(file, JSON.stringify({ ui_theme: 'glass', background_mode: 'video', _claimedKeys: ['ui_theme', 'background_mode'] }));
  const store = new SettingsStorage(file);
  let values = store.initialize({ ui_theme: 'garden', liquid_glass: 'false' });
  assert.equal(values.ui_theme, 'night');
  assert.equal(values.background_mode, 'video');
  assert.equal(values.liquid_glass, 'true');
  store.set('liquid_glass', false);
  values = new SettingsStorage(file).initialize({ ui_theme: 'glass' });
  assert.equal(values.ui_theme, 'night');
  assert.equal(values.liquid_glass, 'false');
});

test('glass preference is independent of palettes and background sources in legacy storage', t => {
  const file = fileFixture(t);
  const store = new SettingsStorage(file);
  assert.equal(store.initialize({ ui_theme: 'glass' }).liquid_glass, 'true');
  store.set('ui_theme', 'garden');
  store.set('background_mode', 'youtube');
  let values = new SettingsStorage(file).initialize();
  assert.equal(values.liquid_glass, 'true');
  assert.equal(values.ui_theme, 'garden');
  assert.equal(values.background_mode, 'youtube');
  assert.equal(normalize('liquid_glass', 'false'), 'false');
  assert.equal(normalize('liquid_glass', 'invalid'), 'false');
  assert.equal(normalize('liquid_glass', true), 'true');
  assert.deepEqual(migrateAppearance({ ui_theme: 'glass', liquid_glass: 'false' }), { ui_theme: 'night', liquid_glass: 'false' });
});
