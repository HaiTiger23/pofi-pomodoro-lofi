const test = require('node:test');
const assert = require('node:assert/strict');
const { PlayerController } = require('../src/services/youtube-player');
function fixture() {
  const players = [], intervals = new Map(), timeouts = new Map(), updates = [], ready = [], errors = [];
  let next = 0;
  const root = { ownerDocument: { createElement: () => ({}) }, replaceChildren() {}, appendChild() {} };
  const controller = new PlayerController({
    root, schedule: callback => { intervals.set(++next, callback); return next; }, cancel: id => intervals.delete(id),
    later: callback => { timeouts.set(++next, callback); return next; }, cancelLater: id => timeouts.delete(id),
    onUpdate: state => updates.push(state), onReady: value => ready.push(value), onError: error => errors.push(error),
    create: () => {
      const listeners = new Map();
      const player = {
        destroyed: false, plays: 0, volume: 0,
        on: (type, callback) => { const listener = { type, callback }; listeners.set(type, callback); return listener; },
        off: listener => listeners.delete(listener.type),
        emit: (type, value) => listeners.get(type)?.(value),
        getIframe: async () => ({ title: 'Lofi' }), getDuration: async () => 120, getCurrentTime: async () => 12,
        setVolume: async value => { player.volume = value; },
        playVideo: async () => { player.plays++; }, pauseVideo: async () => {}, seekTo: async () => {},
        destroy: async () => { player.destroyed = true; }
      };
      players.push(player);
      return player;
    }
  });
  return { controller, players, intervals, timeouts, updates, ready, errors };
}
test('switching songs destroys old player and ignores late metadata and polls', async () => {
  const f = fixture();
  f.controller.load('DnewVhYNt-I');
  const first = f.players[0];
  const lateReady = first.emit('ready');
  f.controller.load('ukHK1GVyr0I');
  await lateReady;
  assert.equal(first.destroyed, true);
  assert.equal(first.plays, 0);
  assert.equal(f.ready.length, 0);
  await f.players[1].emit('ready');
  f.players[1].emit('stateChange', { data: 1 });
  f.players[1].emit('stateChange', { data: 1 });
  assert.equal(f.intervals.size, 1);
  assert.equal(f.timeouts.size, 0);
  await [...f.intervals.values()][0]();
  assert.equal(f.updates.at(-1).currentTime, 12);
  f.controller.load('DnewVhYNt-I');
  assert.equal(f.intervals.size, 0);
  f.controller.destroy();
  assert.equal(f.timeouts.size, 0);
});
test('pause stops polling; unmount destroys player and callbacks', async () => {
  const f = fixture();
  f.controller.load('DnewVhYNt-I');
  await f.players[0].emit('ready');
  f.players[0].emit('stateChange', { data: 1 });
  f.players[0].emit('stateChange', { data: 2 });
  assert.equal(f.intervals.size, 0);
  f.controller.destroy();
  assert.equal(f.players[0].destroyed, true);
  assert.equal(f.timeouts.size, 0);
  f.players[0].emit('stateChange', { data: 1 });
  assert.equal(f.intervals.size, 0);
});
test('unavailable videos stop loading and can be retried', () => {
  const f = fixture();
  f.controller.load('DnewVhYNt-I');
  [...f.timeouts.values()][0]();
  assert.equal(f.errors.length, 1);
  assert.equal(f.controller.ready, false);
  assert.equal(f.players[0].destroyed, true);
  f.controller.load('ukHK1GVyr0I');
  assert.equal(f.players.length, 2);
  f.controller.destroy();
});
test('startup cues the saved song silently; manual play and subsequent selections still work', async () => {
  const f = fixture();
  f.controller.load('DnewVhYNt-I', 100, { autoplay: false });
  await f.players[0].emit('ready');
  assert.equal(f.controller.ready, true);
  assert.equal(f.players[0].plays, 0);
  assert.equal(f.intervals.size, 0);
  await f.controller.toggle();
  assert.equal(f.players[0].plays, 1);
  f.controller.load('ukHK1GVyr0I');
  await f.players[1].emit('ready');
  assert.equal(f.players[1].plays, 1);
  f.controller.destroy();
});

test('ambient players muted before ready do not autoplay', async () => {
  const f = fixture();
  let enabled = true;
  f.controller.shouldPlay = () => enabled;
  f.controller.load('DnewVhYNt-I', 50);
  enabled = false;
  await f.controller.setVolume(0);
  await f.players[0].emit('ready');
  assert.equal(f.players[0].volume, 0);
  assert.equal(f.players[0].plays, 0);
  f.controller.destroy();
});

test('player distinguishes blocked videos from network and embed identity errors', () => {
  for (const [data, expected] of [[100,/xóa|riêng tư/],[101,/mã 101/],[150,/mã 150/],[153,/xác nhận/],[2,/không hợp lệ/]]) {
    const f = fixture(); f.controller.load('DnewVhYNt-I');
    f.players[0].emit('error', { data });
    assert.match(f.errors[0], expected);
    assert.equal(f.players[0].destroyed, true);
    assert.equal(f.timeouts.size, 0);
  }
  const f = fixture(); f.controller.load('DnewVhYNt-I');
  f.players[0].emit('error', Object.assign(new Error('SDK không kết nối'), { code: 'API_NETWORK' }));
  assert.equal(f.errors[0], 'SDK không kết nối');
});

test('blocked autoplay keeps the ready player available for a manual play click', async () => {
  const f = fixture(); f.controller.load('DnewVhYNt-I');
  await f.players[0].emit('ready');
  f.players[0].emit('stateChange', { data: 1 });
  f.players[0].emit('autoplayBlocked', {});
  assert.equal(f.controller.ready, true);
  assert.equal(f.controller.playing, false);
  assert.equal(f.intervals.size, 0);
  await f.controller.toggle();
  assert.equal(f.players[0].plays, 2);
  assert.deepEqual(f.errors, []);
  f.controller.destroy();
});
