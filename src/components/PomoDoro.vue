<template>
  <section class="pomodoro" aria-label="Bộ đếm Pomodoro">
    <div class="timer-meta"><span class="phase-pill" :class="{ resting: isBreak }"><i :class="isBreak ? 'ri-cup-line' : 'ri-focus-3-line'"></i>{{ phaseTitle }}</span><span class="session-duration">Vòng {{ round }}/{{ longBreakInterval }} · {{ completedWork }} hoàn thành</span></div>
    <div class="timer-digits" :class="{ paused: status === 'pause' }" role="timer" aria-live="off">{{ printNumber(minutes) }}<span>:</span>{{ printNumber(seconds) }}</div>
    <p class="timer-caption" data-testid="timer-caption">{{ titleHeader }}</p>
    <p v-if="error" role="alert" class="inline-error">{{ error }}</p>
    <div class="timer-actions"><button class="primary-button" data-testid="timer-start" :aria-label="timerControlLabel" :title="timerControlLabel" :aria-pressed="isRunning" :disabled="busy" @click="startTime"><svg v-if="$store.state.dockMode" class="timer-dock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="14" r="7" /><path d="M12 3v4M9 3h6M18 8l1.5-1.5M12 10v4l2.5 1.5" /></svg><i v-else :class="isRunning ? 'ri-pause-fill' : 'ri-play-fill'" aria-hidden="true"></i><span>{{ TitleLeftBtn }}</span></button><button class="secondary-button" data-testid="timer-skip" aria-label="Bỏ qua phiên" :title="isBreak ? 'Bỏ qua nghỉ, chuyển sang tập trung' : 'Bỏ qua tập trung, chuyển sang nghỉ'" :disabled="busy" @click="skipTime"><i class="ri-skip-forward-line"></i><span>Skip</span></button></div>
    <p class="timer-footnote"><span></span>Việc nhỏ, làm từng chút một.</p>
  </section>
</template>
<script>
import { getTimerAPI } from '../services/timer-api';
export default {
  data() { return { status: 'ready', phase: 'work', completedWork: 0, round: 1, longBreakInterval: this.$store.state.longBreakInterval, minutes: this.$store.getters.getDuration, seconds: 0, busy: false, error: '' }; },
  computed: {
    timerControlLabel() { return this.isRunning ? 'Tạm dừng đồng hồ' : this.status === 'pause' ? 'Tiếp tục đồng hồ' : 'Bắt đầu đồng hồ'; },
    settings() { return this.$store.getters.getTimerSettings; },
    isBreak() { return this.phase !== 'work'; },
    isRunning() { return this.status === 'running' || this.status === 'break'; },
    phaseTitle() { return { work: 'Phiên tập trung', shortBreak: 'Nghỉ ngắn', longBreak: 'Nghỉ dài' }[this.phase]; },
    titleHeader() {
      if (this.status === 'pause') return 'Nghỉ một nhịp, rồi mình tiếp tục.';
      if (this.isBreak) return this.phase === 'longBreak' ? 'Một chặng đã xong. Nghỉ lâu một chút nhé.' : 'Thả lỏng vai. Đến giờ nghỉ rồi.';
      return this.status === 'ready' ? 'Một việc thôi. Thật thong thả.' : 'Cứ từ tốn, bạn đang làm rất tốt.';
    },
    TitleLeftBtn() { return this.isRunning ? 'Tạm dừng' : this.status === 'pause' ? 'Tiếp tục' : this.isBreak ? 'Bắt đầu nghỉ' : 'Bắt đầu tập trung'; }
  },
  watch: { settings() { this.configure(); } },
  async mounted() {
    this.api = getTimerAPI();
    this.unsubscribe = this.api.onPomodoroState(this.applyState);
    await this.configure();
    try { this.applyState(await this.api.getPomodoroTimerStatus()); } catch { this.error = 'Không thể đọc bộ đếm giờ.'; }
  },
  beforeUnmount() { if (this.unsubscribe) this.unsubscribe(); },
  methods: {
    applyState(state) { if (state) { for (const key of ['status', 'phase', 'minutes', 'seconds', 'completedWork', 'round', 'longBreakInterval']) this[key] = state[key]; } },
    async configure() {
      if (!this.api) return;
      try { this.applyState(await this.api.configurePomodoroTimer(this.settings)); }
      catch { this.error = 'Không thể cập nhật thời lượng.'; }
    },
    async command(action) {
      if (this.busy) return;
      this.busy = true;
      this.error = '';
      try { this.applyState(await action()); } catch { this.error = 'Không thể điều khiển bộ đếm giờ. Hãy thử lại.'; }
      finally { this.busy = false; }
    },
    startTime() {
      return this.command(() => {
        if (this.status === 'ready') return this.api.startPomodoroTimer(this.settings);
        if (this.isRunning) return this.api.pausePomodoroTimer();
        if (this.status === 'pause') return this.api.resumePomodoroTimer();
        return this.api.stopPomodoroTimer();
      });
    },
    skipTime() { return this.command(() => this.api.skipPomodoroPhase()); },
    printNumber(value) { return String(value).padStart(2, '0'); }
  }
};
</script>
