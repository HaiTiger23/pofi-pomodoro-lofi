<template>
  <section class="pomodoro" aria-label="Bộ đếm Pomodoro">
    <div class="timer-meta"><span class="phase-pill" :class="{ resting: status === 'break' }"><i :class="status === 'break' ? 'ri-cup-line' : 'ri-focus-3-line'"></i>{{ status === 'break' ? 'Nghỉ một chút' : 'Phiên tập trung' }}</span><span class="session-duration">{{ durations[0] }} phút làm · {{ durations[1] }} phút nghỉ</span></div>
    <div class="timer-digits" :class="{ paused: status === 'pause' }" role="timer" aria-live="off">{{ printNumber(minutes) }}<span>:</span>{{ printNumber(seconds) }}</div>
    <p class="timer-caption" data-testid="timer-caption">{{ titleHeader }}</p>
    <p v-if="error" role="alert" class="inline-error">{{ error }}</p>
    <div class="timer-actions"><button class="primary-button" data-testid="timer-start" :disabled="busy" @click="startTime"><i :class="status === 'running' ? 'ri-pause-fill' : status === 'break' ? 'ri-skip-forward-line' : 'ri-play-fill'"></i>{{ TitleLeftBtn }}</button><button class="secondary-button" :disabled="busy || status === 'ready'" @click="stopTime"><i class="ri-restart-line"></i>Đặt lại</button></div>
    <p class="timer-footnote"><span></span>Việc nhỏ, làm từng chút một.</p>
  </section>
</template>
<script>
import { getTimerAPI } from '../services/timer-api';
export default {
  data() { return { status: 'ready', minutes: this.$store.getters.getDuration, seconds: 0, busy: false, error: '' }; },
  computed: {
    durations() { return [this.$store.getters.getDuration, this.$store.getters.getBreakDuration]; },
    titleHeader() { return { ready: 'Một việc thôi. Thật thong thả.', running: 'Cứ từ tốn, bạn đang làm rất tốt.', pause: 'Nghỉ một nhịp, rồi mình tiếp tục.', break: 'Thả lỏng vai. Đến giờ nghỉ rồi.' }[this.status]; },
    TitleLeftBtn() { return { ready: 'Bắt đầu tập trung', running: 'Tạm dừng', pause: 'Tiếp tục', break: 'Kết thúc nghỉ' }[this.status]; }
  },
  watch: { durations() { this.configure(); } },
  async mounted() {
    this.api = getTimerAPI();
    this.unsubscribe = this.api.onPomodoroState(this.applyState);
    await this.configure();
    try { this.applyState(await this.api.getPomodoroTimerStatus()); } catch { this.error = 'Không thể đọc bộ đếm giờ.'; }
  },
  beforeUnmount() { if (this.unsubscribe) this.unsubscribe(); },
  methods: {
    applyState(state) { if (state) { this.status = state.status; this.minutes = state.minutes; this.seconds = state.seconds; } },
    async configure() {
      if (!this.api) return;
      try { this.applyState(await this.api.configurePomodoroTimer(...this.durations)); }
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
        if (this.status === 'ready') return this.api.startPomodoroTimer(...this.durations);
        if (this.status === 'running') return this.api.pausePomodoroTimer();
        if (this.status === 'pause') return this.api.resumePomodoroTimer();
        return this.api.stopPomodoroTimer();
      });
    },
    stopTime() { return this.command(() => this.api.stopPomodoroTimer()); },
    printNumber(value) { return String(value).padStart(2, '0'); }
  }
};
</script>
