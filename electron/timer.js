const { TIMER_DEFAULTS, validateTimerSettings } = require('../shared/validation');

// The deadline is authoritative; delayed callbacks never extend a session.
class PomodoroTimer {
  constructor({ now = Date.now, schedule = (callback, delay) => setInterval(callback, delay), cancel = id => clearInterval(id), onChange = () => {}, onComplete = () => {} } = {}) {
    Object.assign(this, { now, schedule, cancel, onChange, onComplete });
    this.settings = { ...TIMER_DEFAULTS };
    this.phase = 'work';
    this.completedWork = 0;
    this.status = 'ready';
    this.deadline = null;
    this.remaining = this.phaseDuration();
    this.interval = null;
  }
  configure(work, rest) {
    if (work && typeof work === 'object' && (Array.isArray(work) || !Object.keys(work).length)) throw new Error('Cài đặt bộ đếm không hợp lệ.');
    const changes = work && typeof work === 'object' ? work : { workMinutes: work, shortBreakMinutes: rest };
    const settings = validateTimerSettings({ ...this.settings, ...changes });
    this.settings = settings;
    if (this.status === 'ready') this.remaining = this.phaseDuration();
    return this.publish();
  }
  phaseDuration() {
    return this.settings[{ work: 'workMinutes', shortBreak: 'shortBreakMinutes', longBreak: 'longBreakMinutes' }[this.phase]] * 60000;
  }
  runPhase(startAt) {
    this.status = this.phase === 'work' ? 'running' : 'break';
    this.deadline = startAt + this.remaining;
    if (this.interval === null) this.interval = this.schedule(() => this.tick(), 250);
  }
  start(...settings) {
    if (settings.length) this.configure(...settings);
    this.clear();
    this.remaining = this.phaseDuration();
    this.runPhase(this.now());
    return this.publish();
  }
  pause() {
    this.tick();
    if (this.deadline !== null) {
      this.remaining = Math.max(0, this.deadline - this.now());
      this.deadline = null;
      this.status = 'pause';
      this.clear();
    }
    return this.publish();
  }
  resume() {
    if (this.status === 'pause') {
      this.runPhase(this.now());
    }
    return this.publish();
  }
  stop() {
    this.clear();
    this.deadline = null;
    this.status = 'ready';
    this.phase = 'work';
    this.completedWork = 0;
    this.remaining = this.phaseDuration();
    return this.publish();
  }
  nextPhase(phase, startAt, autoStart) {
    this.phase = phase;
    this.remaining = this.phaseDuration();
    this.deadline = null;
    this.status = 'ready';
    if (autoStart) this.runPhase(startAt);
    else this.clear();
  }
  skipBreak() {
    if (this.phase !== 'work') this.nextPhase('work', this.now(), this.settings.autoStartPomodoros);
    return this.publish();
  }
  skipPhase() {
    if (this.phase === 'work') {
      this.completedWork++;
      this.nextPhase(this.completedWork % this.settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak', this.now(), this.settings.autoStartBreaks);
    } else this.nextPhase('work', this.now(), this.settings.autoStartPomodoros);
    return this.publish();
  }
  tick() {
    const now = this.now(), notifications = new Map();
    const remember = (phase, autoStarted) => {
      const kind = phase === 'work' ? 'work' : 'break';
      notifications.delete(kind);
      notifications.set(kind, { phase, nextPhase: this.phase, completedWork: this.completedWork, autoStarted });
    };
    while (this.deadline !== null && now >= this.deadline) {
      // Skip complete cycles after sleep in constant time. Only the latest work
      // and break completion are notified, avoiding a backlog of alerts.
      const s = this.settings;
      if (this.phase === 'work' && s.autoStartBreaks && s.autoStartPomodoros) {
        const cycleMs = (s.workMinutes * s.longBreakInterval + s.shortBreakMinutes * (s.longBreakInterval - 1) + s.longBreakMinutes) * 60000;
        const cycles = Math.floor((now - this.deadline) / cycleMs);
        if (cycles > 0) {
          this.completedWork += cycles * s.longBreakInterval;
          this.deadline += cycles * cycleMs;
          remember('work', true);
          remember(this.completedWork % s.longBreakInterval === 0 ? 'longBreak' : 'shortBreak', true);
        }
      }
      const endedAt = this.deadline, finished = this.phase;
      if (finished === 'work') {
        this.completedWork++;
        this.nextPhase(this.completedWork % s.longBreakInterval === 0 ? 'longBreak' : 'shortBreak', endedAt, s.autoStartBreaks);
      } else this.nextPhase('work', endedAt, s.autoStartPomodoros);
      remember(finished, this.deadline !== null);
    }
    const state = this.publish();
    for (const [kind, detail] of notifications) this.onComplete(kind, detail);
    return state;
  }
  snapshot() {
    const totalSeconds = Math.ceil(Math.max(0, this.deadline === null ? this.remaining : this.deadline - this.now()) / 1000);
    return {
      status: this.status, minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60,
      phase: this.phase, isBreak: this.phase !== 'work', isRunning: this.deadline !== null,
      completedWork: this.completedWork, longBreakInterval: this.settings.longBreakInterval,
      round: this.phase === 'work' ? this.completedWork % this.settings.longBreakInterval + 1 : (this.completedWork % this.settings.longBreakInterval || this.settings.longBreakInterval)
    };
  }
  publish() { const state = this.snapshot(); this.onChange(state); return state; }
  clear() { if (this.interval !== null) this.cancel(this.interval); this.interval = null; }
  dispose() { this.clear(); }
}
module.exports = { PomodoroTimer };
