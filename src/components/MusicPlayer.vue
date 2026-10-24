<template>
  <div class="lofi-shell" :class="{ 'video-mode': showVideoAsBackground, 'dock-mode': dockMode }" :style="{ '--dock-scale': $store.state.dockScale / 100 }">
    <div class="scene-art" :class="{ 'youtube-background': backgroundMode !== 'scene' }" :style="{ backgroundImage: 'url(' + backgroundImage + ')' }"></div>
    <div class="video-layer" :class="{ 'is-visible': showVideoAsBackground }"><div ref="playerRoot"></div></div>
    <div class="scene-wash"></div>
    <div class="app-layout">
      <slot name="header" />
      <main class="focus-stage">
        <section class="focus-space">
          <slot name="timer" />
        </section>
      </main>
      <section class="music-dock" aria-label="Trình phát nhạc">
        <div class="dock-main">
          <div class="now-playing"><img :src="'https://i3.ytimg.com/vi/' + current_music.videoId + '/hqdefault.jpg'" alt="" class="album-art" /><div class="track-info"><p class="eyebrow"><span class="playing-dot" :class="{ playing: videoStatusRun }"></span>{{ videoStatusRun ? 'ĐANG PHÁT' : 'GIAI ĐIỆU CỦA BẠN' }}</p><h2>{{ current_music.title }}</h2><small>YouTube · {{ theme.name }}</small></div></div>
          <div class="transport">
            <button class="icon-button" aria-label="Lùi 10 giây" title="Lùi 10 giây" :disabled="!videoStatus" @click="replayForward(-10)"><i class="ri-replay-10-fill"></i></button>
            <button class="play-button" :aria-label="videoStatusRun ? 'Tạm dừng nhạc' : 'Phát nhạc'" :disabled="!videoStatus" @click="playVideo"><i :class="videoStatusRun ? 'ri-pause-fill' : 'ri-play-fill'"></i></button>
            <button class="icon-button" aria-label="Tới 10 giây" title="Tới 10 giây" :disabled="!videoStatus" @click="replayForward(10)"><i class="ri-forward-10-fill"></i></button>
          </div>
          <div class="dock-tools">
            <button class="icon-button" :class="{ loved: isFavorite(current_music.videoId) }" :aria-pressed="isFavorite(current_music.videoId)" aria-label="Yêu thích bài hiện tại" title="Yêu thích bài hiện tại" @click="toggleFavoriteSong"><i :class="isFavorite(current_music.videoId) ? 'ri-heart-fill' : 'ri-heart-line'"></i></button>
            <button class="icon-button" :aria-pressed="showVideoAsBackground" aria-label="Đổi nền" :title="backgroundMode === 'scene' ? 'Nền ảnh lofi' : backgroundMode === 'youtube' ? 'Nền YouTube mờ' : 'Nền video YouTube'" @click="toggleVideoBackground"><i class="ri-picture-in-picture-line"></i></button>
            <span class="volume-control"><button class="icon-button" :aria-label="volume > 0 ? 'Tắt tiếng' : 'Bật tiếng'" @click="muteVolume"><i :class="volume === 0 ? 'ri-volume-mute-line' : 'ri-volume-up-line'"></i></button><input type="range" aria-label="Âm lượng nhạc" min="0" max="100" v-model.number="volume" /></span>
            <button class="icon-button search-toggle" :aria-expanded="searchOpen" aria-controls="drawer-search" aria-haspopup="dialog" aria-label="Tìm nhạc" title="Tìm nhạc" @click="searchOpen = !searchOpen"><i class="ri-search-line"></i></button>
          </div>
        </div>
        <div class="track-progress"><time>{{ fomartDuration(current_music.currentTime) }}</time><input class="progress-range" type="range" min="0" step="1" :max="Math.max(1, current_music.duration)" :disabled="!videoStatus || !current_music.duration" aria-label="Tiến độ bài hát" v-model.number="range" :style="{ '--range-value': (current_music.duration ? range / current_music.duration * 100 : 0) + '%' }" @change="changeCurrentTime" @pointerdown="pauseRange" @pointerup="resumeRange" @pointercancel="resumeRange" /><time>{{ fomartDuration(current_music.duration) }}</time></div>
        <p v-if="error" role="alert" class="inline-error">{{ error }} <button class="text-button" @click="playSong(current_music.videoId)">Thử lại</button></p>
      </section>
      <button v-if="dockMode" class="icon-button dock-expand" aria-label="Mở rộng ứng dụng" title="Mở rộng giao diện" @click="$emit('expand')"><i class="ri-fullscreen-line" aria-hidden="true"></i></button>
      <span v-if="dockMode" class="dock-resize-handle" role="slider" tabindex="0" aria-label="Kích thước dock" title="Kéo để đổi kích thước dock" aria-valuemin="80" aria-valuemax="160" :aria-valuenow="$store.state.dockScale" :aria-valuetext="$store.state.dockScale + '%'" @pointerdown="startDockResize" @pointermove="moveDockResize" @pointerup="endDockResize" @pointercancel="endDockResize" @lostpointercapture="endDockResize" @keydown="resizeDockKey"><i class="ri-draggable"></i></span>
      <span v-if="dockMode && (dockError || resizeError)" class="dock-status-error" role="alert">{{ dockError || resizeError }}</span>
    </div>
    <DrawerPanel id="drawer-search" title="Tìm nhạc" icon="ri-search-line" :open="searchOpen" panel-class="search-panel" initial-focus=".search-form input" @close="searchOpen = false">
      <MusicSearch v-if="searchOpen" @select="selectSong" />
    </DrawerPanel>
    <slot name="panels" />
  </div>
</template>
<script>
import YouTubePlayer from 'youtube-player';
import { PlayerController } from '../services/youtube-player';
import MusicSearch from './MusicSearch.vue';
import DrawerPanel from './DrawerPanel.vue';
import { getItem, setItem } from '../services/storage';
import { THEMES } from '../../shared/themes';
import { validVideoId } from '../../shared/validation';
export default {
  components: { MusicSearch, DrawerPanel },
  props: { dockError: String },
  emits: ['expand'],
  computed: {
    dockMode() { return this.$store.state.dockMode; },
    theme() { return THEMES.find(theme => theme.id === this.$store.state.theme) || THEMES[0]; },
    backgroundMode() { return this.$store.state.backgroundMode; },
    showVideoAsBackground() { return this.backgroundMode === 'video'; },
    backgroundImage() { return this.backgroundMode === 'scene' ? this.theme.image : 'https://i3.ytimg.com/vi/' + this.current_music.videoId + '/hqdefault.jpg'; }
  },
  data: () => ({
    searchOpen: false, videoStatusRun: false, videoStatus: false,
    current_music: { title: 'Đang tải video…', videoId: getItem('latestSong'), duration: 0, currentTime: 0 },
    range: 0, volume: 100, oldVolume: 100, error: '', dragging: false, resizeError: '', dockResize: null
  }),
  mounted() {
    this.controller = new PlayerController({
      create: YouTubePlayer, root: this.$refs.playerRoot,
      onUpdate: state => {
        if ('ready' in state) this.videoStatus = state.ready;
        if ('playing' in state) this.videoStatusRun = state.playing;
        if ('duration' in state) this.current_music.duration = state.duration;
        if ('currentTime' in state) {
          this.current_music.currentTime = state.currentTime;
          if (!this.dragging) this.range = state.currentTime;
        }
      },
      onReady: song => {
        this.current_music.title = song.title;
        this.$store.commit('addToHistory', { ...song, channelTitle: 'YouTube', timestamp: new Date().toISOString() });
      },
      onEnd: () => this.playSong(this.getRandomVideoId()),
      onError: message => { this.error = message; this.current_music.title = 'Video không khả dụng'; }
    });
    this.playSong(this.current_music.videoId);
    window.addEventListener('keydown', this.onKey);
  },
  beforeUnmount() { this.controller.destroy(); window.removeEventListener('keydown', this.onKey); if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame); },
  watch: {
    dockMode(enabled) { if (enabled) this.searchOpen = false; },
    volume(value) { if (this.controller) this.controller.setVolume(value).catch(this.handleControlError); }
  },
  methods: {
    async applyDockScale(value) {
      try { const state = await window.electronAPI.setDockScale(value); this.$store.commit('setDockScale', state.dockScale); this.resizeError = ''; }
      catch { this.resizeError = 'Chưa đổi được kích thước dock.'; }
    },
    startDockResize(event) {
      if (event.button !== 0) return;
      event.preventDefault();
      this.dockResize = { x: event.screenX, scale: this.$store.state.dockScale };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    moveDockResize(event) {
      if (!this.dockResize) return;
      this.pendingDockScale = Math.max(80, Math.min(160, Math.round(this.dockResize.scale + (event.screenX - this.dockResize.x) / 3.2)));
      if (this.resizeFrame) return;
      this.resizeFrame = requestAnimationFrame(() => { this.resizeFrame = null; this.applyDockScale(this.pendingDockScale); });
    },
    endDockResize(event) {
      this.dockResize = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    resizeDockKey(event) {
      const values = { ArrowLeft: this.$store.state.dockScale - 5, ArrowDown: this.$store.state.dockScale - 5, ArrowRight: this.$store.state.dockScale + 5, ArrowUp: this.$store.state.dockScale + 5, Home: 80, End: 160 };
      if (!(event.key in values)) return;
      event.preventDefault(); this.applyDockScale(Math.max(80, Math.min(160, values[event.key])));
    },
    closeSearch() { this.searchOpen = false; },
    onKey(event) { if (event.key === 'Escape') this.searchOpen = false; },
    selectSong(id) { this.playSong(id); this.searchOpen = false; },
    playSong(videoId) {
      if (!validVideoId(videoId)) return;
      this.error = '';
      this.current_music = { title: 'Đang tải video…', videoId, duration: 0, currentTime: 0 };
      this.range = 0;
      this.dragging = false;
      setItem('latestSong', videoId);
      try { this.controller.load(videoId, this.volume); } catch (error) { this.handleControlError(error); }
    },
    handleControlError(error) {
      console.warn('YouTube player:', error && error.message);
      this.error = 'Không thể điều khiển video. Hãy chọn lại bài hát.';
    },
    toggleVideoBackground() { const modes=['scene','youtube','video'];this.$store.commit('setBackgroundMode',modes[(modes.indexOf(this.backgroundMode)+1)%modes.length]); },
    playVideo() { this.controller.toggle().catch(this.handleControlError); },
    pauseRange() { this.dragging = true; },
    resumeRange() { this.dragging = false; },
    changeCurrentTime(event) {
      this.range = Number(event.target.value);
      this.controller.seek(this.range).catch(this.handleControlError);
    },
    replayForward(seconds) {
      const time = Math.max(0, Math.min(this.current_music.duration, Number(this.range) + seconds));
      this.controller.seek(time).catch(this.handleControlError);
    },
    fomartDuration(seconds = 0) {
      const value = Math.max(0, Math.floor(Number(seconds) || 0));
      const parts = [Math.floor(value / 60) % 60, value % 60].map(part => String(part).padStart(2, '0'));
      if (value >= 3600) parts.unshift(String(Math.floor(value / 3600)).padStart(2, '0'));
      return parts.join(':');
    },
    getRandomVideoId() {
      const ids = [...new Set([...this.$store.getters.getFavoriteSongs, ...this.$store.getters.getSongHistory].map(song => song.videoId))];
      const next = ids.filter(id => id !== this.current_music.videoId);
      return next.length ? next[Math.floor(Math.random() * next.length)] : this.current_music.videoId;
    },
    toggleFavoriteSong() {
      this.$store.commit('toggleFavorite', { videoId: this.current_music.videoId, title: this.current_music.title, channelTitle: 'YouTube' });
    },
    isFavorite(id) { return this.$store.getters.isFavorite(id); },
    muteVolume() {
      if (this.volume > 0) { this.oldVolume = this.volume; this.volume = 0; }
      else this.volume = this.oldVolume || 100;
    }
  }
};
</script>
