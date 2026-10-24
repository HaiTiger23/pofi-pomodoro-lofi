const test = require('node:test');
const assert = require('node:assert/strict');
const { PomodoroTimer } = require('../electron/timer');
function fixture(settings = { autoStartBreaks: true }) {
  let now = 0, next = 0;
  const callbacks = new Map(), completed = [];
  const timer = new PomodoroTimer({
    now: () => now,
    schedule: callback => { callbacks.set(++next, callback); return next; },
    cancel: id => callbacks.delete(id),
    onComplete: phase => completed.push(phase)
  });
  if (Object.keys(settings).length) timer.configure(settings);
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

test('manual transitions wait on the correct break and preserve completed rounds', () => {
  const f = fixture({});
  f.timer.start(1, 1); f.advance(60000);
  let state = f.timer.tick();
  assert.deepEqual([state.status, state.phase, state.completedWork, state.round, state.minutes], ['ready', 'shortBreak', 1, 1, 1]);
  assert.equal(f.callbacks.size, 0);
  f.advance(600000); f.timer.tick();
  assert.deepEqual(f.completed, ['work']);
  f.timer.start(); f.advance(60000); state = f.timer.tick();
  assert.deepEqual([state.status, state.phase, state.completedWork, state.round], ['ready', 'work', 1, 2]);
  assert.deepEqual(f.completed, ['work', 'break']);
});

test('long break replaces short break every configured number of completed work sessions', () => {
  const f = fixture({ workMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 3, longBreakInterval: 2, autoStartBreaks: true, autoStartPomodoros: true });
  f.timer.start();
  f.advance(60000);
  assert.equal(f.timer.tick().phase, 'shortBreak');
  f.advance(60000);
  assert.deepEqual([f.timer.tick().phase, f.timer.snapshot().round], ['work', 2]);
  f.advance(60000);
  assert.deepEqual([f.timer.tick().phase, f.timer.snapshot().minutes, f.timer.snapshot().round], ['longBreak', 3, 2]);
  f.advance(180000);
  assert.deepEqual([f.timer.tick().phase, f.timer.snapshot().completedWork, f.timer.snapshot().round], ['work', 2, 1]);
  assert.equal(f.callbacks.size, 1);
});

test('interval one gives a long break after every work session', () => {
  const f = fixture({ workMinutes: 1, longBreakInterval: 1, longBreakMinutes: 15 });
  f.timer.start(); f.advance(60000);
  assert.deepEqual([f.timer.tick().phase, f.timer.snapshot().minutes, f.timer.snapshot().status], ['longBreak', 15, 'ready']);
});

test('the two auto-start preferences operate independently', () => {
  const f = fixture({ workMinutes: 1, shortBreakMinutes: 1, autoStartBreaks: false, autoStartPomodoros: true });
  f.timer.start(); f.advance(60000);
  assert.equal(f.timer.tick().status, 'ready');
  f.timer.start(); f.advance(60000);
  assert.deepEqual([f.timer.tick().phase, f.timer.snapshot().status], ['work', 'running']);
  assert.equal(f.callbacks.size, 1);
});

for (const [interval, phase] of [[4, 'shortBreak'], [1, 'longBreak']]) {
  test(`pause/resume during ${phase} preserves the phase, milliseconds and one callback`, () => {
    const f = fixture({ workMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 1, longBreakInterval: interval, autoStartBreaks: true });
    f.timer.start(); f.advance(72500);
    let state = f.timer.pause();
    assert.deepEqual([state.phase, state.status, state.seconds, state.isBreak], [phase, 'pause', 48, true]);
    f.advance(600000); f.timer.configure({ longBreakMinutes: 9, shortBreakMinutes: 9 });
    assert.equal(f.timer.snapshot().seconds, 48);
    f.timer.resume(); f.timer.resume();
    assert.equal(f.callbacks.size, 1);
    f.advance(47499); assert.equal(f.timer.tick().phase, phase);
    f.advance(1); state = f.timer.tick();
    assert.deepEqual([state.phase, state.status, state.round], ['work', 'ready', interval === 1 ? 1 : 2]);
  });
}

test('invalid extended settings are rejected atomically', () => {
  const f = fixture(); f.timer.start(1, 1);
  const previous = f.timer.snapshot(), settings = { ...f.timer.settings };
  for (const changes of [{ longBreakMinutes: 0 }, { longBreakMinutes: 2.5 }, { longBreakInterval: 101 }, { longBreakInterval: true }, { longBreakInterval: 0 }, { autoStartBreaks: 'true' }, { autoStartPomodoros: null }, { bad: true }]) {
    assert.throws(() => f.timer.configure({ workMinutes: 2, ...changes }));
    assert.deepEqual(f.timer.settings, settings);
    assert.deepEqual(f.timer.snapshot(), previous);
    assert.equal(f.callbacks.size, 1);
  }
});

test('skip break retains progress, never counts or notifies a skipped break, and honors auto-start work', () => {
  for (const autoStart of [false, true]) {
    for (const mode of ['ready', 'break', 'pause']) {
      const f = fixture({ workMinutes: 1, shortBreakMinutes: 1, autoStartBreaks: mode !== 'ready', autoStartPomodoros: autoStart });
      f.timer.start(); f.advance(60000); f.timer.tick();
      if (mode === 'pause') f.timer.pause();
      const state = f.timer.skipBreak();
      assert.deepEqual([state.phase, state.status, state.completedWork, state.round], ['work', autoStart ? 'running' : 'ready', 1, 2]);
      assert.deepEqual(f.completed, ['work']);
      assert.equal(f.callbacks.size, autoStart ? 1 : 0);
      f.timer.skipBreak();
      assert.deepEqual(f.timer.snapshot(), state);
    }
  }
});

test('settings update a waiting break but preserve active work and elapsed counts', () => {
  const f = fixture({ workMinutes: 1 });
  f.timer.start(); f.advance(60000); f.timer.tick();
  f.timer.configure({ shortBreakMinutes: 7, longBreakInterval: 8 });
  assert.deepEqual([f.timer.snapshot().minutes, f.timer.snapshot().completedWork, f.timer.snapshot().phase], [7, 1, 'shortBreak']);
  f.timer.start(); f.advance(30000); f.timer.configure({ shortBreakMinutes: 9 });
  assert.deepEqual([f.timer.snapshot().minutes, f.timer.snapshot().seconds], [6, 30]);
  const state = f.timer.stop();
  assert.deepEqual([state.phase, state.completedWork, state.round, state.minutes], ['work', 0, 1, 1]);
});

test('automatic catch-up skips hundreds of cycles without drift or notification storms', () => {
  const f = fixture({ workMinutes: 1, shortBreakMinutes: 1, longBreakMinutes: 2, longBreakInterval: 3, autoStartBreaks: true, autoStartPomodoros: true });
  f.timer.start(); f.advance((700 + 1.5) * 60000);
  const state = f.timer.tick();
  assert.deepEqual([state.phase, state.completedWork, state.round, state.seconds], ['shortBreak', 301, 1, 30]);
  assert.equal(f.callbacks.size, 1);
  assert.equal(f.completed.length, 2);
  f.timer.tick(); assert.equal(f.completed.length, 2);
});

test('skip alternates phases, counts skipped work once, and schedules the long break without alerts', () => {
  const f = fixture({ workMinutes: 1, shortBreakMinutes: 2, longBreakMinutes: 5, longBreakInterval: 2 });
  let state = f.timer.skipPhase();
  assert.deepEqual([state.phase, state.completedWork, state.round, state.minutes, state.status], ['shortBreak', 1, 1, 2, 'ready']);
  state = f.timer.skipPhase();
  assert.deepEqual([state.phase, state.completedWork, state.round], ['work', 1, 2]);
  f.timer.start(); f.advance(1000); f.timer.pause();
  state = f.timer.skipPhase();
  assert.deepEqual([state.phase, state.completedWork, state.round, state.minutes], ['longBreak', 2, 2, 5]);
  f.timer.configure({ autoStartPomodoros: true, autoStartBreaks: true });
  state = f.timer.skipPhase();
  assert.deepEqual([state.phase, state.completedWork, state.round, state.status], ['work', 2, 1, 'running']);
  state = f.timer.skipPhase();
  assert.deepEqual([state.phase, state.completedWork, state.round, state.status], ['shortBreak', 3, 1, 'break']);
  assert.equal(f.callbacks.size, 1);
  assert.deepEqual(f.completed, []);
});
