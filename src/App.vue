<template>
  <MusicPlayer ref="music" :dock-error="dockError" @expand="expandDock">
    <template #header>
      <header class="app-header" :class="{ 'desktop-header': desktop, 'compact-menu': compactNavigation, 'menu-open': navigationOpen }">
        <a href="#" class="brand" aria-label="Pofi — trang chính" @click.prevent="drawer = null"><img class="brand-logo" src="/pofi-logo.png" alt="" width="30" height="30" /><span>pofi<span class="brand-dot">.</span></span></a>
        <button ref="menuToggle" class="icon-button menu-toggle" :aria-label="navigationOpen ? 'Đóng menu tiện ích' : 'Mở menu tiện ích'" :title="navigationOpen ? 'Đóng menu' : 'Mở menu'" :aria-expanded="navigationOpen" aria-controls="primary-navigation" @click="toggleNavigation"><i :class="navigationOpen ? 'ri-close-line' : 'ri-menu-line'"></i></button>
        <nav id="primary-navigation" class="app-nav" aria-label="Tiện ích tập trung" :inert="compactNavigation && !navigationOpen ? '' : null" :aria-hidden="compactNavigation && !navigationOpen ? 'true' : null">
          <button class="nav-button" :class="{ active: drawer === 'todo' }" title="Công việc" aria-label="Danh sách công việc" :aria-expanded="drawer === 'todo'" @click="toggleDrawer('todo')"><i class="ri-task-line"></i><span>Công việc</span></button>
          <button class="nav-button" :class="{ active: drawer === 'favorites' }" title="Yêu thích" aria-label="Bài hát yêu thích" :aria-expanded="drawer === 'favorites'" @click="toggleDrawer('favorites')"><i class="ri-heart-line"></i><span>Yêu thích</span></button>
          <button class="icon-button" :class="{ active: drawer === 'history' }" aria-label="Lịch sử bài hát" title="Lịch sử bài hát" @click="toggleDrawer('history')"><i class="ri-history-line"></i></button>
          <button class="icon-button" :class="{ active: $store.state.pinned }" :aria-pressed="$store.state.pinned" :disabled="!desktop || pinBusy" aria-label="Ghim cửa sổ" :title="$store.state.pinned ? 'Bỏ ghim cửa sổ' : 'Ghim cửa sổ'" @click="togglePin"><i class="ri-pushpin-line"></i></button>
          <button class="nav-button theme-trigger" :class="{ active: drawer === 'themes' }" title="Giao diện & nền" aria-label="Chọn giao diện" :aria-expanded="drawer === 'themes'" @click="toggleDrawer('themes')"><i :class="theme.icon"></i><span>{{ theme.name }}</span><i class="ri-arrow-down-s-line"></i></button>
          <button class="icon-button" :class="{ active: drawer === 'settings' }" aria-controls="drawer-right-example" aria-label="Cài đặt" title="Cài đặt" @click="toggleDrawer('settings')"><i class="ri-settings-3-line"></i></button>
        </nav>
        <WindowControls v-if="desktop" />
      </header>
    </template>
    <template #timer><PomoDoro /></template>
    <template #panels>
      <SongHistory :open="drawer === 'history'" @close="drawer = null" @play="playSong" />
      <SongFavorites :open="drawer === 'favorites'" @close="drawer = null" @play="playSong" />
      <TodoList :open="drawer === 'todo'" @close="drawer = null" />
      <SideBar :open="drawer === 'settings'" @close="drawer = null" />
      <ThemePicker :open="drawer === 'themes'" @close="drawer = null" />
      <div v-if="storageError || pinError" role="alert" class="toast"><i class="ri-error-warning-line"></i><span>{{ pinError || 'Chưa lưu được dữ liệu. Kiểm tra dung lượng và quyền ghi của ứng dụng.' }}</span><button class="icon-button" @click="storageError = false; pinError = ''" aria-label="Đóng thông báo"><i class="ri-close-line"></i></button></div>
    </template>
  </MusicPlayer>
</template>
<script>
import MusicPlayer from './components/MusicPlayer.vue';
import PomoDoro from './components/PomoDoro.vue';
import SideBar from './components/SideBar.vue';
import SongHistory from './components/History.vue';
import SongFavorites from './components/Favorites.vue';
import TodoList from './components/toDoList.vue';
import ThemePicker from './components/ThemePicker.vue';
import { THEMES } from '../shared/themes';
import { attachGlassLighting } from './services/liquid-glass';
import WindowControls from './components/WindowControls.vue';
export default {
  components: { MusicPlayer, PomoDoro, SideBar, SongHistory, SongFavorites, TodoList, ThemePicker, WindowControls },
  data: () => ({ drawer: null, storageError: false, desktop: Boolean(window.electronAPI), pinBusy: false, pinError: '', dockError: '', navigationOpen: false, compactNavigation: window.matchMedia('(max-width: 519px)').matches }),
  computed: {
    theme() { return THEMES.find(theme => theme.id === this.$store.state.theme) || THEMES[0]; },
    liquidGlass() { return this.$store.state.liquidGlass; }
  },
  watch: {
    theme: { immediate: true, handler(theme) { document.documentElement.dataset.theme = theme.id; } },
    liquidGlass: { immediate: true, handler(enabled) { document.documentElement.dataset.glass = String(enabled); } }
  },
  async mounted() {
    this.removeGlassLighting = attachGlassLighting(document);
    window.addEventListener('storage-error', this.handleStorageError);
    this.navigationQuery = window.matchMedia('(max-width: 519px)');
    this.navigationQuery.addEventListener('change', this.onNavigationWidth);
    document.addEventListener('pointerdown', this.onNavigationOutside, true);
    document.addEventListener('keydown', this.onNavigationKey);
    if (window.electronAPI?.onWindowState) this.removeWindowState = window.electronAPI.onWindowState(this.applyWindowState);
    if (window.electronAPI?.getWindowState) { try { this.applyWindowState(await window.electronAPI.getWindowState()); } catch { /* Keep window controls available for retry. */ } }
  },
  beforeUnmount() {
    this.removeGlassLighting?.(); this.removeWindowState?.(); window.removeEventListener('storage-error', this.handleStorageError);
    this.navigationQuery?.removeEventListener('change', this.onNavigationWidth);
    document.removeEventListener('pointerdown', this.onNavigationOutside, true);
    document.removeEventListener('keydown', this.onNavigationKey);
  },
  methods: {
    toggleNavigation() {
      this.drawer = null;
      this.$refs.music?.closeSearch();
      this.navigationOpen = !this.navigationOpen;
      if (this.navigationOpen) this.$nextTick(() => this.$refs.menuToggle?.focus());
    },
    closeNavigation(restoreFocus = false) {
      this.navigationOpen = false;
      if (restoreFocus && this.compactNavigation) this.$refs.menuToggle?.focus();
    },
    onNavigationWidth(event) { this.compactNavigation = event.matches; this.closeNavigation(); },
    onNavigationOutside(event) { if (this.navigationOpen && !event.target.closest('.app-header')) this.closeNavigation(); },
    onNavigationKey(event) { if (event.key === 'Escape' && this.navigationOpen) this.closeNavigation(true); },
    applyWindowState(state) {
      this.$store.commit('setPinned', state.pinned);
      this.$store.commit('setDockMode', state.dockMode);
      if (state.dockMode) { this.drawer = null; this.closeNavigation(); }
    },
    async expandDock() {
      this.dockError = '';
      try { this.applyWindowState(await window.electronAPI.setDockMode(false)); }
      catch { this.dockError = 'Chưa mở rộng được. Hãy thử lại.'; }
    },
    async togglePin() {
      this.closeNavigation(true);
      this.pinBusy=true;
      try { this.$store.commit('setPinned',await window.electronAPI.togglePinWindow(!this.$store.state.pinned));this.pinError=''; }
      catch { this.pinError='Chưa ghim được cửa sổ. Hãy thử lại.'; }
      finally { this.pinBusy=false; }
    },
    toggleDrawer(name) { this.closeNavigation(true); this.drawer = this.drawer === name ? null : name; },
    playSong(song) { this.$refs.music.playSong(song.videoId); this.drawer = null; },
    handleStorageError() { this.storageError = true; }
  }
};
</script>
