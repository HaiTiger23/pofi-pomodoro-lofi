<template>
  <DrawerPanel id="drawer-themes" title="Giao diện & nền" icon="ri-palette-line" :open="open" @close="$emit('close')">
    <button class="glass-toggle" role="switch" :aria-checked="liquidGlass" aria-label="Liquid Glass" data-testid="liquid-glass-toggle" @click="$store.commit('setLiquidGlass', !liquidGlass)">
      <span class="glass-toggle-icon"><i class="ri-drop-line" aria-hidden="true"></i></span>
      <span class="glass-toggle-copy"><strong>Liquid Glass</strong><small>Hiệu ứng kính trên mọi nền</small></span>
      <span class="glass-toggle-track" aria-hidden="true"><span></span></span>
    </button>
    <button v-if="liquidGlass" class="glass-toggle glass-dark-toggle" role="switch" :aria-checked="glassDark" data-testid="glass-dark-toggle" @click="$store.commit('setGlassDark', !glassDark)">
      <span class="glass-toggle-icon"><i class="ri-moon-line" aria-hidden="true"></i></span>
      <span class="glass-toggle-copy"><strong>Kính tối</strong><small>Dùng cho nền sáng</small></span>
      <span class="glass-toggle-track" aria-hidden="true"><span></span></span>
    </button>
    <p class="panel-intro">Chọn ảnh tĩnh, ảnh bài nhạc làm mờ<br />hoặc video YouTube đang phát.</p>
    <div class="background-options" role="group" aria-label="Nguồn nền">
      <button v-for="mode in backgrounds" :key="mode.id" :data-background-mode="mode.id" :class="{ active: backgroundMode === mode.id }" :aria-pressed="backgroundMode === mode.id" @click="$store.commit('setBackgroundMode', mode.id)"><i :class="mode.icon"></i>{{ mode.name }}</button>
    </div>
    <div class="theme-options" role="radiogroup" aria-label="Giao diện lofi" @keydown="onKey">
      <button v-for="theme in themes" :key="theme.id" class="theme-option" :class="{ selected: selected === theme.id }" :data-theme-option="theme.id"
        role="radio" :aria-checked="selected === theme.id" :tabindex="selected === theme.id ? 0 : -1" @click="select(theme.id)">
        <img :src="theme.image" :alt="theme.name" class="theme-preview" loading="lazy" />
        <span class="theme-option-info"><span><strong>{{ theme.name }}</strong><small>{{ theme.subtitle }}</small></span><i :class="selected === theme.id ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'"></i></span>
        <span class="theme-swatches"><span v-for="color in theme.colors" :key="color" :style="{ background: color }"></span></span>
      </button>
    </div>
    <template #footer><i class="ri-check-line"></i> Lựa chọn được lưu tự động trên thiết bị.</template>
  </DrawerPanel>
</template>
<script>
import { nextTick } from 'vue';
import DrawerPanel from './DrawerPanel.vue';
import { THEMES, BACKGROUNDS } from '../../shared/themes';
export default {
  components: { DrawerPanel }, props: { open: Boolean }, emits: ['close'],
  data: () => ({ themes: THEMES, backgrounds: BACKGROUNDS }),
  computed: { selected() { return this.$store.state.theme; }, backgroundMode() { return this.$store.state.backgroundMode; }, liquidGlass() { return this.$store.state.liquidGlass; }, glassDark() { return this.$store.state.glassDark; } },
  methods: {
    select(id) { this.$store.commit('setTheme', id); },
    async onKey(event) {
      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = this.themes.findIndex(theme => theme.id === this.selected);
      const count = this.themes.length;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : count - 1)) % count;
      this.select(this.themes[next].id);
      await nextTick();
      document.querySelector(`[data-theme-option="${this.selected}"]`).focus();
    }
  }
};
</script>
