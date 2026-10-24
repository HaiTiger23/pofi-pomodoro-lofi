<template>
  <div class="window-controls" role="group" aria-label="Điều khiển cửa sổ">
    <button class="icon-button" aria-label="Chuyển sang chế độ dock" title="Thu gọn thành dock" @click="run('setDockMode', true)"><i class="ri-layout-bottom-line" aria-hidden="true"></i></button>
    <button class="icon-button" aria-label="Thu nhỏ cửa sổ" title="Thu nhỏ" @click="run('minimizeWindow')"><i class="ri-subtract-line" aria-hidden="true"></i></button>
    <button class="icon-button" :aria-label="maximized ? 'Khôi phục cửa sổ' : 'Phóng to cửa sổ'" :title="maximized ? 'Khôi phục' : 'Phóng to'" @click="run('toggleMaximizeWindow')"><i :class="maximized ? 'ri-file-copy-line' : 'ri-checkbox-blank-line'" aria-hidden="true"></i></button>
    <button class="icon-button window-close" aria-label="Đóng ứng dụng" title="Đóng" @click="run('closeWindow')"><i class="ri-close-line" aria-hidden="true"></i></button>
    <span v-if="error" class="window-control-error" role="alert">{{ error }}</span>
  </div>
</template>
<script>
export default {
  data: () => ({ maximized: false, error: '' }),
  async mounted() {
    this.removeWindowState = window.electronAPI.onWindowState(state => { this.maximized = state.maximized; });
    try { this.maximized = (await window.electronAPI.getWindowState()).maximized; }
    catch { /* The maximize action refreshes state if the initial read fails. */ }
  },
  beforeUnmount() { this.removeWindowState?.(); },
  methods: {
    async run(method, ...args) {
      this.error = '';
      try {
        const state = await window.electronAPI[method](...args);
        if (state && typeof state.maximized === 'boolean') this.maximized = state.maximized;
      } catch { this.error = 'Chưa điều khiển được cửa sổ. Hãy thử lại.'; }
    }
  }
};
</script>
