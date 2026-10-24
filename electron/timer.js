const { validDuration } = require('../shared/validation');

// The deadline is authoritative; delayed callbacks never extend a session.
class PomodoroTimer {
  constructor({ now = Date.now, schedule = (callback, delay) => setInterval(callback, delay), cancel = id => clearInterval(id), onChange = () => {}, onComplete = () => {} } = {}) {
    Object.assign(this, { now, schedule, cancel, onChange, onComplete });
    this.workMinutes = 45;
    this.breakMinutes = 5;
    this.status = 'ready';
    this.deadline = null;
    this.remaining = this.workMinutes * 60000;
    this.interval = null;
  }
  configure(work, rest) {
    if (!validDuration(work) || !validDuration(rest)) throw new Error('Thời lượng phải là số nguyên từ 1 đến 1440 phút.');
    this.workMinutes = Number(work);
    this.breakMinutes = Number(rest);
    if (this.status === 'ready') this.remaining = this.workMinutes * 60000;
    return this.publish();
  }
  start(work = this.workMinutes, rest = this.breakMinutes) {
    this.configure(work, rest);
    this.clear();
    this.status = 'running';
    this.remaining = this.workMinutes * 60000;
    this.deadline = this.now() + this.remaining;
    this.interval = this.schedule(() => this.tick(), 250);
    return this.publish();
  }
  pause() {
    this.tick();
    if (this.status === 'running') {
      this.remaining = Math.max(0, this.deadline - this.now());
      this.deadline = null;
      this.status = 'pause';
      this.clear();
    }
    return this.publish();
  }
  resume() {
    if (this.status === 'pause') {
      this.deadline = this.now() + this.remaining;
      this.status = 'running';
      this.clear();
      this.interval = this.schedule(() => this.tick(), 250);
    }
    return this.publish();
  }
  stop() {
    this.clear();
    this.deadline = null;
    this.status = 'ready';
    this.remaining = this.workMinutes * 60000;
    return this.publish();
  }
  tick() {
    if (this.deadline !== null && this.now() >= this.deadline) {
      if (this.status === 'running') {
        this.deadline += this.breakMinutes * 60000;
        this.status = 'break';
        this.onComplete('work');
      }
      if (this.status === 'break' && this.now() >= this.deadline) {
        this.stop();
        this.onComplete('break');
      }
    }
    return this.publish();
  }
  snapshot() {
    const totalSeconds = Math.ceil(Math.max(0, this.deadline === null ? this.remaining : this.deadline - this.now()) / 1000);
    return {
      status: this.status, minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60,
      isBreak: this.status === 'break', isRunning: ['running', 'break'].includes(this.status)
    };
  }
  publish() { const state = this.snapshot(); this.onChange(state); return state; }
  clear() { if (this.interval !== null) this.cancel(this.interval); this.interval = null; }
  dispose() { this.clear(); }
}
module.exports = { PomodoroTimer };
