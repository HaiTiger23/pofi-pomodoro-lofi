import { createStore } from 'vuex';
import { getItem, getJSON, setItem, setJSON } from './services/storage';
import { duration, validVideoId } from '../shared/validation';
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
    pinned: false,
    dockMode: false,
    duration: duration(getItem('duration_pomodoro')),
    break_duration: duration(getItem('break_pomodoro'), 5),
    songHistory: getJSON('song_history'),
    favoriteSongs: getJSON('favorite_songs')
  },
  mutations: {
    setTheme(state, value) { state.theme = setItem('ui_theme', value); },
    setBackgroundMode(state, value) { state.backgroundMode = setItem('background_mode', value); },
    setLiquidGlass(state, value) { state.liquidGlass = setItem('liquid_glass', value) === 'true'; },
    setPinned(state, value) { state.pinned = Boolean(value); },
    setDockMode(state, value) { state.dockMode = Boolean(value); },
    updateDuration(state, value) { state.duration = duration(value, state.duration); setItem('duration_pomodoro', state.duration); },
    updateBreakDuration(state, value) { state.break_duration = duration(value, state.break_duration); setItem('break_pomodoro', state.break_duration); },
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
    getSongHistory: state => state.songHistory,
    getFavoriteSongs: state => state.favoriteSongs,
    isFavorite: state => id => state.favoriteSongs.some(song => song.videoId === id)
  }
});
