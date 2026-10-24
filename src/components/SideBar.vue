<template>
  <DrawerPanel id="drawer-right-example" title="Theo nhịp của bạn" icon="ri-settings-3-line" :open="open" @close="$emit('close')">
    <p class="panel-intro">Chỉnh vài điều nhỏ,<br />để tập trung thật thoải mái.</p>
    <section class="settings-section"><div class="section-heading"><i class="ri-time-line"></i><h3>Nhịp Pomodoro</h3></div><div class="duration-grid">
      <label class="field-label" for="duration">Tập trung<span class="number-field"><input id="duration" type="number" min="1" max="1440" step="1" :value="$store.state.duration" @change="updateDuration" /><span>phút</span></span></label>
      <label class="field-label" for="break">Nghỉ ngơi<span class="number-field"><input id="break" type="number" min="1" max="1440" step="1" :value="$store.state.break_duration" @change="updateBreakDuration" /><span>phút</span></span></label>
    </div><p v-if="durationError" role="alert" class="inline-error">{{ durationError }}</p><p class="field-hint">Thay đổi thời lượng áp dụng cho phiên tiếp theo.</p></section>
    <section class="settings-section"><soundList /></section>
    <section class="settings-section"><div class="section-heading"><i class="ri-pushpin-line"></i><h3>Luôn ở bên cạnh</h3></div><label class="switch-row"><span>Ghim cửa sổ<small>Giữ app ở góc màn hình trong lúc làm việc.</small></span><input type="checkbox" class="switch-input" v-model="isPinned" :disabled="!desktop" @change="togglePinWindow" /></label><p v-if="pinError" class="inline-error" role="alert">{{ pinError }}</p></section>
    <template #footer>Pofi · Một chút tập trung, một chút bình yên.</template>
  </DrawerPanel>
</template>
<script>
import DrawerPanel from './DrawerPanel.vue';
import soundList from './soundList.vue';
import { validDuration } from '../../shared/validation';
export default {
  components: { soundList, DrawerPanel }, props: { open: Boolean }, emits: ['close'],
  data: () => ({ desktop: Boolean(window.electronAPI), durationError: '', pinError: '' }),
  computed: {
    isPinned: { get() { return this.$store.state.pinned; }, set(value) { this.$store.commit('setPinned', value); } }
  },
  methods: {
    updateDuration(event) { this.saveDuration(event, 'updateDuration', this.$store.state.duration); },
    updateBreakDuration(event) { this.saveDuration(event, 'updateBreakDuration', this.$store.state.break_duration); },
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
