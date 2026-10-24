import { createStore } from 'vuex';
import { getItem, getJSON, setItem, setJSON } from './services/storage';
import { duration, validInterval, validVideoId } from '../shared/validation';
function addUnique(list, song, limit) {
  if (!song || !validVideoId(song.videoId)) return list;
  const next = [song, ...list.filter(item => item.videoId !== song.videoId)];
  return limit ? next.slice(0, limit) : next;
}
export default createStore({
  state: {
    theme: getItem('ui_theme'),
    backgroundMode: getItem('background_mode'),
    liquidGlass: getItem('liquid_glass') === 'true',
    glassDark: getItem('liquid_glass_dark') === 'true',
    pinned: false,
    dockMode: false,
    dockScale: Number(getItem('dock_scale')),
    duration: duration(getItem('duration_pomodoro')),
    break_duration: duration(getItem('break_pomodoro'), 5),
    longBreakDuration: duration(getItem('long_break_pomodoro'), 15),
    longBreakInterval: Number(getItem('long_break_interval')),
    autoStartBreaks: getItem('auto_start_breaks') === 'true',
    autoStartPomodoros: getItem('auto_start_pomodoros') === 'true',
    fullscreenReminders: getItem('fullscreen_reminders') === 'true',
    songHistory: getJSON('song_history'),
    favoriteSongs: getJSON('favorite_songs')
  },
  mutations: {
    setTheme(state, value) { state.theme = setItem('ui_theme', value); },
    setBackgroundMode(state, value) { state.backgroundMode = setItem('background_mode', value); },
    setLiquidGlass(state, value) { state.liquidGlass = setItem('liquid_glass', value) === 'true'; },
    setGlassDark(state, value) { state.glassDark = setItem('liquid_glass_dark', value) === 'true'; },
    setPinned(state, value) { state.pinned = Boolean(value); },
    setDockMode(state, value) { state.dockMode = Boolean(value); },
    setDockScale(state, value) { state.dockScale = Number(value); },
    updateDuration(state, value) { state.duration = duration(value, state.duration); setItem('duration_pomodoro', state.duration); },
    updateBreakDuration(state, value) { state.break_duration = duration(value, state.break_duration); setItem('break_pomodoro', state.break_duration); },
    updateLongBreakDuration(state, value) { state.longBreakDuration = duration(value, state.longBreakDuration); setItem('long_break_pomodoro', state.longBreakDuration); },
    updateLongBreakInterval(state, value) { if (validInterval(value)) state.longBreakInterval = Number(setItem('long_break_interval', value)); },
    setAutoStartBreaks(state, value) { state.autoStartBreaks = setItem('auto_start_breaks', value) === 'true'; },
    setAutoStartPomodoros(state, value) { state.autoStartPomodoros = setItem('auto_start_pomodoros', value) === 'true'; },
    setFullscreenReminders(state, value) { state.fullscreenReminders = setItem('fullscreen_reminders', value) === 'true'; },
    addToHistory(state, song) { state.songHistory = setJSON('song_history', addUnique(state.songHistory, song, 50)); },
    addToFavorites(state, song) { state.favoriteSongs = setJSON('favorite_songs', addUnique(state.favoriteSongs, song)); },
    removeFromFavorites(state, id) { state.favoriteSongs = setJSON('favorite_songs', state.favoriteSongs.filter(song => song.videoId !== id)); },
    removeSongFromHistory(state, id) { state.songHistory = setJSON('song_history', state.songHistory.filter(song => song.videoId !== id)); },
    toggleFavorite(state, song) {
      state.favoriteSongs = setJSON('favorite_songs', state.favoriteSongs.some(item => item.videoId === song.videoId)
        ? state.favoriteSongs.filter(item => item.videoId !== song.videoId) : addUnique(state.favoriteSongs, song));
    }
  },
  getters: {
    getDuration: state => state.duration,
    getBreakDuration: state => state.break_duration,
    getTimerSettings: state => ({ workMinutes: state.duration, shortBreakMinutes: state.break_duration, longBreakMinutes: state.longBreakDuration, longBreakInterval: state.longBreakInterval, autoStartBreaks: state.autoStartBreaks, autoStartPomodoros: state.autoStartPomodoros }),
    getSongHistory: state => state.songHistory,
    getFavoriteSongs: state => state.favoriteSongs,
    isFavorite: state => id => state.favoriteSongs.some(song => song.videoId === id)
  }
});
