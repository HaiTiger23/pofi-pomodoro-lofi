const { isTheme } = require('./themes');
const { validDockScale, windowLayout } = require('./window-preferences');
const DEFAULTS = {
  duration_pomodoro: '45', break_pomodoro: '5', long_break_pomodoro: '15', long_break_interval: '4',
  auto_start_breaks: 'false', auto_start_pomodoros: 'false', fullscreen_reminders: 'false', dock_scale: '100', window_layout: '{}', song_history: '[]',
  favorite_songs: '[]', pofi_tasks: '[]', latestSong: 'DnewVhYNt-I', youtube_api_key: '', ui_theme: 'warm', background_mode: 'scene', liquid_glass: 'false'
};
function migrateAppearance(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values) || values.ui_theme !== 'glass') return values;
  // The retired glass theme used the night artwork. Retain that appearance while
  // moving the material to an independent preference, including an explicit off.
  return { ...values, ui_theme: 'night', liquid_glass: values.liquid_glass ?? 'true' };
}
const validVideoId = value => typeof value === 'string' && /^[\w-]{11}$/.test(value);
const validDuration = value => ['string', 'number'].includes(typeof value) && String(value).trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 1440;
const validInterval = value => validDuration(value) && Number(value) <= 100;
const TIMER_DEFAULTS = Object.freeze({ workMinutes: 45, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakInterval: 4, autoStartBreaks: false, autoStartPomodoros: false });
function validateTimerSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) || Object.keys(settings).some(key => !Object.hasOwnProperty.call(TIMER_DEFAULTS, key))) throw new Error('Cài đặt bộ đếm không hợp lệ.');
  if (!['workMinutes', 'shortBreakMinutes', 'longBreakMinutes'].every(key => validDuration(settings[key]))) throw new Error('Thời lượng phải là số nguyên từ 1 đến 1440 phút.');
  if (!validInterval(settings.longBreakInterval)) throw new Error('Số vòng phải là số nguyên từ 1 đến 100.');
  if (typeof settings.autoStartBreaks !== 'boolean' || typeof settings.autoStartPomodoros !== 'boolean') throw new Error('Tùy chọn tự bắt đầu không hợp lệ.');
  return { ...settings, workMinutes: Number(settings.workMinutes), shortBreakMinutes: Number(settings.shortBreakMinutes), longBreakMinutes: Number(settings.longBreakMinutes), longBreakInterval: Number(settings.longBreakInterval) };
}
function duration(value, fallback = 45) {
  return validDuration(value) ? Number(value) : fallback;
}
function normalize(key, raw) {
  if (!Object.hasOwnProperty.call(DEFAULTS, key)) throw new Error('Unknown storage key');
  if (raw == null) return DEFAULTS[key];
  if (key === 'dock_scale') return validDockScale(raw) ? String(Number(raw)) : DEFAULTS[key];
  if (key === 'window_layout') return JSON.stringify(windowLayout(raw));
  if (key === 'ui_theme') return isTheme(raw) ? raw : DEFAULTS.ui_theme;
  if (key === 'background_mode') return ['scene', 'youtube', 'video'].includes(raw) ? raw : 'scene';
  if (['liquid_glass', 'auto_start_breaks', 'auto_start_pomodoros', 'fullscreen_reminders'].includes(key)) return raw === true || raw === 'true' ? 'true' : 'false';
  if (key === 'long_break_interval') return validInterval(raw) ? String(Number(raw)) : DEFAULTS[key];
  if (['duration_pomodoro', 'break_pomodoro', 'long_break_pomodoro'].includes(key)) return String(duration(raw, Number(DEFAULTS[key])));
  if (key === 'latestSong') return validVideoId(raw) ? raw : DEFAULTS[key];
  if (key === 'youtube_api_key') return typeof raw === 'string' ? raw.trim().slice(0, 256) : '';
  let list;
  try { list = JSON.parse(raw); } catch { return DEFAULTS[key]; }
  if (!Array.isArray(list)) return DEFAULTS[key];
  const seen = new Set();
  list = list.filter(item => {
    if (!item || typeof item !== 'object') return false;
    const id = key === 'pofi_tasks' ? item.id : item.videoId;
    if (key === 'pofi_tasks') {
      if (!['number', 'string'].includes(typeof id) || !String(id) || typeof item.title !== 'string' || !item.title.trim()) return false;
    } else if (!validVideoId(id)) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map(item => {
    if (key === 'pofi_tasks') return {
      id: item.id, title: item.title.trim().slice(0, 500), completed: item.completed === true,
      priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
      createdAt: Number.isFinite(Date.parse(item.createdAt)) ? new Date(item.createdAt).toISOString() : null
    };
    return {
      videoId: item.videoId, title: typeof item.title === 'string' ? item.title.slice(0, 500) : 'YouTube',
      channelTitle: typeof item.channelTitle === 'string' ? item.channelTitle.slice(0, 200) : 'YouTube',
      thumbnail: `https://i3.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
      ...(key === 'song_history' ? { timestamp: Number.isFinite(Date.parse(item.timestamp)) ? new Date(item.timestamp).toISOString() : new Date(0).toISOString() } : {})
    };
  });
  return JSON.stringify(key === 'song_history' ? list.slice(0, 50) : list);
}
module.exports = { DEFAULTS, TIMER_DEFAULTS, validVideoId, validDuration, validInterval, validateTimerSettings, duration, normalize, migrateAppearance };
