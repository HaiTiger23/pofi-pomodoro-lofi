const test = require('node:test');
const assert = require('node:assert/strict');
const { PomodoroTimer } = require('../electron/timer');
function fixture() {
  let now = 0, next = 0;
  const callbacks = new Map(), completed = [];
  const timer = new PomodoroTimer({
    now: () => now,
    schedule: callback => { callbacks.set(++next, callback); return next; },
    cancel: id => callbacks.delete(id),
    onComplete: phase => completed.push(phase)
  });
  return { timer, callbacks, completed, advance: value => { now += value; } };
}
test('deadline survives delayed callbacks and transitions independently of renderer', () => {
  const f = fixture();
  f.timer.start(1, 1);
  f.advance(65000);
  assert.equal(f.timer.tick().status, 'break');
  assert.equal(f.timer.snapshot().seconds, 55);
  assert.deepEqual(f.completed, ['work']);
  f.advance(55000);
  assert.equal(f.timer.tick().status, 'ready');
  assert.deepEqual(f.completed, ['work', 'break']);
  f.timer.tick();
  assert.equal(f.callbacks.size, 0);
  assert.deepEqual(f.completed, ['work', 'break']);
});
test('sleep spanning both phases completes once without extending the break', () => {
  const f = fixture();
  f.timer.start(1, 2);
  f.advance(600000);
  assert.equal(f.timer.tick().status, 'ready');
  assert.deepEqual(f.completed, ['work', 'break']);
  assert.equal(f.callbacks.size, 0);
});
test('pause and repeated resume preserve subsecond remaining time and one interval', () => {
  const f = fixture();
  f.timer.start(1, 1);
  f.advance(12500);
  assert.equal(f.timer.pause().seconds, 48);
  f.advance(600000);
  assert.equal(f.timer.snapshot().seconds, 48);
  assert.equal(f.callbacks.size, 0);
  f.timer.resume(); f.timer.resume();
  assert.equal(f.callbacks.size, 1);
  f.advance(47499);
  assert.equal(f.timer.tick().status, 'running');
  f.advance(1);
  assert.equal(f.timer.tick().status, 'break');
});
test('restart replaces the old callback; stop and skip never notify', () => {
  const f = fixture();
  f.timer.start(1, 1); f.timer.start(2, 1);
  assert.equal(f.callbacks.size, 1);
  f.advance(1000);
  assert.deepEqual([f.timer.tick().minutes, f.timer.snapshot().seconds], [1, 59]);
  f.timer.stop(); f.advance(600000); f.timer.tick();
  assert.deepEqual(f.completed, []);
  f.timer.start(1, 1); f.advance(60000); f.timer.tick(); f.timer.stop();
  assert.deepEqual(f.completed, ['work']);
});
test('invalid configuration does not replace an active timer', () => {
  const f = fixture();
  f.timer.start('1', '5');
  for (const value of [0, -1, NaN, Infinity, '', ' ', 1.2, 1441, true, [], {}]) assert.throws(() => f.timer.start(value, 1));
  assert.equal(f.callbacks.size, 1);
  assert.equal(f.timer.snapshot().status, 'running');
});
test('settings changes affect future phases without resetting elapsed work', () => {
  const f = fixture();
  f.timer.start(1, 1); f.advance(30000);
  f.timer.configure(5, 2);
  assert.equal(f.timer.snapshot().seconds, 30);
  f.advance(30000);
  assert.equal(f.timer.tick().minutes, 2);
  f.timer.stop();
  assert.equal(f.timer.snapshot().minutes, 5);
});
