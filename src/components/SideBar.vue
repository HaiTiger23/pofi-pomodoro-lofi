<template>
  <DrawerPanel id="drawer-right-example" title="Theo nhịp của bạn" icon="ri-settings-3-line" :open="open" @close="$emit('close')">
    <p class="panel-intro">Chỉnh vài điều nhỏ,<br />để tập trung thật thoải mái.</p>
    <section class="settings-section"><div class="section-heading"><i class="ri-time-line"></i><h3>Nhịp Pomodoro</h3></div><div class="duration-grid timer-duration-grid">
      <label class="field-label" for="duration">Tập trung<span class="number-field"><input id="duration" type="number" min="1" max="1440" step="1" :value="$store.state.duration" @change="updateDuration" /><span>phút</span></span></label>
      <label class="field-label" for="break">Nghỉ ngắn<span class="number-field"><input id="break" type="number" min="1" max="1440" step="1" :value="$store.state.break_duration" @change="updateBreakDuration" /><span>phút</span></span></label>
      <label class="field-label" for="long-break">Nghỉ dài<span class="number-field"><input id="long-break" type="number" min="1" max="1440" step="1" :value="$store.state.longBreakDuration" @change="updateLongBreakDuration" /><span>phút</span></span></label>
    </div><p v-if="durationError" role="alert" class="inline-error">{{ durationError }}</p><p class="field-hint">Đơn vị phút. Thời lượng mới áp dụng từ phiên tiếp theo; phiên đang chạy hoặc tạm dừng giữ nguyên.</p>
    <div class="timer-preferences">
      <label class="switch-row" for="auto-start-breaks"><span>Tự bắt đầu nghỉ<small>Áp dụng cho cả nghỉ ngắn và nghỉ dài.</small></span><input id="auto-start-breaks" type="checkbox" class="switch-input" :checked="$store.state.autoStartBreaks" @change="$store.commit('setAutoStartBreaks', $event.target.checked)" /></label>
      <label class="switch-row" for="auto-start-pomodoros"><span>Tự bắt đầu tập trung<small>Bắt đầu vòng tiếp theo khi hết giờ nghỉ.</small></span><input id="auto-start-pomodoros" type="checkbox" class="switch-input" :checked="$store.state.autoStartPomodoros" @change="$store.commit('setAutoStartPomodoros', $event.target.checked)" /></label>
      <label class="switch-row interval-row" for="long-break-interval"><span>Nghỉ dài sau<small>Mỗi {{ $store.state.longBreakInterval }} vòng tập trung hoàn thành.</small></span><span class="number-field"><input id="long-break-interval" type="number" min="1" max="100" step="1" :value="$store.state.longBreakInterval" @change="updateLongBreakInterval" /><span>vòng</span></span></label>
    </div></section>
    <section class="settings-section"><div class="section-heading"><i class="ri-fullscreen-line"></i><h3>Nhắc đổi ca</h3></div><label class="switch-row" for="fullscreen-reminders"><span>Thông báo toàn màn hình<small>Ghim trên cùng khi hết ca làm hoặc nghỉ. Đếm ngược 10 giây rồi mới cho phép đóng.</small></span><input id="fullscreen-reminders" type="checkbox" class="switch-input" :checked="$store.state.fullscreenReminders" :disabled="!desktop" @change="$store.commit('setFullscreenReminders', $event.target.checked)" /></label><p v-if="!desktop" class="field-hint">Tùy chọn này dùng trong ứng dụng máy tính.</p></section>
    <section class="settings-section"><div class="section-heading"><i class="ri-picture-in-picture-line"></i><h3>Thanh dock</h3></div><label class="switch-row" for="dock-scale"><span>Kích thước<small>Nhớ riêng vị trí cửa sổ và dock.</small></span><output for="dock-scale">{{ $store.state.dockScale }}%</output></label><input id="dock-scale" class="dock-scale-range" type="range" min="80" max="160" step="1" :value="$store.state.dockScale" :disabled="!desktop" @input="updateDockScale" /><p class="field-hint">Kéo tay nắm ở mép phải dock để đổi nhanh kích thước. Vị trí và kích thước được lưu khi mở lại app.</p><p v-if="dockSizeError" class="inline-error" role="alert">{{ dockSizeError }}</p></section>
    <section class="settings-section"><soundList /></section>
    <section class="settings-section"><div class="section-heading"><i class="ri-pushpin-line"></i><h3>Luôn ở bên cạnh</h3></div><label class="switch-row"><span>Ghim cửa sổ<small>Giữ app ở góc màn hình trong lúc làm việc.</small></span><input type="checkbox" class="switch-input" v-model="isPinned" :disabled="!desktop" @change="togglePinWindow" /></label><p v-if="pinError" class="inline-error" role="alert">{{ pinError }}</p></section>
    <template #footer>Pofi · Một chút tập trung, một chút bình yên.</template>
  </DrawerPanel>
</template>
<script>
import DrawerPanel from './DrawerPanel.vue';
import soundList from './soundList.vue';
import { validDuration, validInterval } from '../../shared/validation';
export default {
  components: { soundList, DrawerPanel }, props: { open: Boolean }, emits: ['close'],
  data: () => ({ desktop: Boolean(window.electronAPI), durationError: '', pinError: '', dockSizeError: '' }),
  computed: {
    isPinned: { get() { return this.$store.state.pinned; }, set(value) { this.$store.commit('setPinned', value); } }
  },
  methods: {
    async updateDockScale(event) {
      try { const state = await window.electronAPI.setDockScale(Number(event.target.value)); this.$store.commit('setDockScale', state.dockScale); this.dockSizeError = ''; }
      catch { event.target.value = this.$store.state.dockScale; this.dockSizeError = 'Chưa đổi được kích thước dock. Hãy thử lại.'; }
    },
    updateDuration(event) { this.saveDuration(event, 'updateDuration', this.$store.state.duration); },
    updateBreakDuration(event) { this.saveDuration(event, 'updateBreakDuration', this.$store.state.break_duration); },
    updateLongBreakDuration(event) { this.saveDuration(event, 'updateLongBreakDuration', this.$store.state.longBreakDuration); },
    updateLongBreakInterval(event) {
      if (!validInterval(event.target.value)) { this.durationError = 'Nhập số vòng nguyên từ 1 đến 100.'; event.target.value = this.$store.state.longBreakInterval; return; }
      this.durationError = '';
      this.$store.commit('updateLongBreakInterval', Number(event.target.value));
    },
    saveDuration(event, mutation, previous) {
      if (!validDuration(event.target.value)) { this.durationError = 'Nhập số nguyên từ 1 đến 1440 phút.'; event.target.value = previous; return; }
      this.durationError = '';
      this.$store.commit(mutation, Number(event.target.value));
    },
    async togglePinWindow() {
      try { this.isPinned = await window.electronAPI.togglePinWindow(this.isPinned); this.pinError = ''; }
      catch { this.isPinned = !this.isPinned; this.pinError = 'Không thể ghim cửa sổ.'; }
    }
  }
};
</script>
