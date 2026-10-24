<template>
  <Transition name="drawer">
    <div :id="id" v-show="open" class="panel-overlay" @mousedown.self="$emit('close')">
      <section ref="panel" class="lofi-panel" :class="panelClass" role="dialog" aria-modal="true" :aria-labelledby="id + '-title'" tabindex="-1">
        <header class="panel-header">
          <div><p class="eyebrow">GÓC NHỎ CỦA BẠN</p><h2 :id="id + '-title'"><i :class="icon" aria-hidden="true"></i>{{ title }}</h2></div>
          <button class="icon-button" @click="$emit('close')" aria-label="Đóng bảng"><i class="ri-close-line"></i></button>
        </header>
        <div class="panel-body"><slot /></div>
        <footer v-if="$slots.footer" class="panel-footer"><slot name="footer" /></footer>
      </section>
    </div>
  </Transition>
</template>
<script>
import { nextTick } from 'vue';
export default {
  props: { id: { type: String, required: true }, title: String, icon: String, open: Boolean, panelClass: String, initialFocus: String },
  emits: ['close'],
  watch: {
    open: {
      immediate: true,
      async handler(value) {
        if (value) {
          this.previousFocus = document.activeElement;
          await nextTick();
          if (this.open) (this.initialFocus && this.$refs.panel.querySelector(this.initialFocus) || this.$refs.panel).focus();
        } else if (this.previousFocus && document.contains(this.previousFocus)) this.previousFocus.focus();
      }
    }
  },
  mounted() { document.addEventListener('keydown', this.onKey); },
  beforeUnmount() { document.removeEventListener('keydown', this.onKey); },
  methods: {
    onKey(event) {
      if (!this.open) return;
      if (event.key === 'Escape') { event.preventDefault(); this.$emit('close'); }
      if (event.key !== 'Tab') return;
      const elements = [...this.$refs.panel.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')].filter(element => element.getClientRects().length);
      const first = elements[0], last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === this.$refs.panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === this.$refs.panel)) { event.preventDefault(); first.focus(); }
    }
  }
};
</script>
