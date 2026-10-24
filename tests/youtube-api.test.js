const test = require('node:test');
const assert = require('node:assert/strict');
const { createAPILoader, createPlayerAdapter } = require('../src/services/youtube-api');
function fixture() {
  const scripts = [], timeouts = new Map(), scope = {};
  let next = 0;
  const document = {
    createElement: () => ({ removed: false, remove() { this.removed = true; } }),
    head: { appendChild(script) { scripts.push(script); } }
  };
  const load = createAPILoader({ scope, document, later: callback => { timeouts.set(++next, callback); return next; }, cancelLater: id => timeouts.delete(id) });
  return { load, scope, scripts, timeouts };
}
test('YouTube SDK loads once over HTTPS and concurrent players share it', async () => {
  const f = fixture(), first = f.load(), second = f.load();
  assert.equal(first, second);
  assert.equal(f.scripts.length, 1);
  assert.equal(f.scripts[0].src, 'https://www.youtube.com/iframe_api');
  f.scope.YT = { Player() {} }; f.scope.onYouTubeIframeAPIReady();
  assert.equal(await first, f.scope.YT);
  assert.equal(await f.load(), f.scope.YT);
  assert.equal(f.scripts.length, 1);
  assert.equal(f.timeouts.size, 0);
});
test('failed SDK load releases the cached promise and Retry issues a fresh request', async () => {
  const f = fixture(), first = f.load();
  f.scripts[0].onerror();
  await assert.rejects(first, { code: 'API_NETWORK' });
  assert.equal(f.scripts[0].removed, true);
  assert.equal(f.timeouts.size, 0);
  const second = f.load();
  assert.notEqual(second, first);
  assert.equal(f.scripts.length, 2);
  f.scope.YT = { Player() {} }; f.scope.onYouTubeIframeAPIReady();
  assert.equal(await second, f.scope.YT);
});
test('SDK timeout can also be retried and ignores an obsolete script error', async () => {
  const f = fixture(), first = f.load(), staleError = f.scripts[0].onerror;
  [...f.timeouts.values()][0]();
  await assert.rejects(first, { code: 'API_TIMEOUT' });
  const second = f.load(); staleError();
  f.scope.YT = { Player() {} }; f.scope.onYouTubeIframeAPIReady();
  assert.equal(await second, f.scope.YT);
  assert.equal(f.timeouts.size, 0);
});

function adapterFixture() {
  const natives = [];
  let finishAPI;
  const sdk = new Promise(resolve => { finishAPI = resolve; });
  const element = { ownerDocument: { defaultView: { location: { origin: 'http://127.0.0.1:8080' } } } };
  const player = createPlayerAdapter(element, { videoId: 'DnewVhYNt-I', playerVars: { controls: 0 } }, () => sdk);
  const YT = { Player: function (_element, options) {
    this.options = options; this.destroyed = false; this.volume = 0;
    this.getDuration = () => 120; this.getIframe = () => ({ title: 'Lofi' });
    this.setVolume = value => { this.volume = value; };
    this.destroy = () => { this.destroyed = true; };
    natives.push(this);
  } };
  return { player, natives, finishAPI: () => finishAPI(YT) };
}
test('native adapter forwards readiness and methods with the real embedding origin', async () => {
  const f = adapterFixture(), events = [];
  f.player.on('ready', () => events.push('ready'));
  f.finishAPI(); await Promise.resolve();
  const native = f.natives[0];
  assert.equal(native.options.playerVars.origin, 'http://127.0.0.1:8080');
  native.options.events.onReady({ target: native });
  assert.equal(await f.player.getDuration(), 120);
  await f.player.setVolume(37); assert.equal(native.volume, 37);
  assert.deepEqual(events, ['ready']);
  await f.player.destroy(); assert.equal(native.destroyed, true);
});
test('switching away before the SDK arrives never creates a stale iframe', async () => {
  const f = adapterFixture(), pendingRead = f.player.getDuration();
  await f.player.destroy();
  f.finishAPI(); await Promise.resolve();
  assert.equal(f.natives.length, 0);
  await assert.rejects(pendingRead, /đã đóng/);
});
test('destroy before player ready releases pending calls and ignores late native events', async () => {
  const f = adapterFixture(), events = [];
  f.player.on('ready', () => events.push('ready'));
  f.player.on('error', () => events.push('error'));
  f.finishAPI(); await Promise.resolve();
  const native = f.natives[0], pendingRead = f.player.getDuration();
  await f.player.destroy();
  native.options.events.onReady({ target: native }); native.options.events.onError({ data: 100 });
  await assert.rejects(pendingRead, /đã đóng/);
  assert.deepEqual(events, []);
  assert.equal(native.destroyed, true);
});
