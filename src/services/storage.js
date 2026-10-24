import { DEFAULTS, normalize, migrateAppearance } from '../../shared/validation';
let values = {};
let pending = Promise.resolve();
export async function initializeStorage() {
  let legacy = {};
  for (const key of Object.keys(DEFAULTS)) {
    try { legacy[key] = localStorage.getItem(key); } catch { /* Browser storage may be unavailable. */ }
  }
  legacy = migrateAppearance(legacy);
  if (window.electronAPI) values = await window.electronAPI.initializeStorage(legacy);
  else for (const key of Object.keys(DEFAULTS)) values[key] = normalize(key, legacy[key]);
}
export function getItem(key) { return normalize(key, values[key]); }
export function getJSON(key) { return JSON.parse(getItem(key)); }
export function setItem(key, raw) {
  const value = normalize(key, raw);
  values[key] = value;
  if (window.electronAPI) {
    // Invoke immediately: closing a window cannot strand writes in a renderer queue.
    const request = window.electronAPI.setStorageItem(key, value);
    pending = Promise.all([pending, request]).catch(() => {
      window.dispatchEvent(new CustomEvent('storage-error'));
    });
  } else {
    try { localStorage.setItem(key, value); } catch {
      window.dispatchEvent(new CustomEvent('storage-error'));
    }
  }
  return value;
}
export function setJSON(key, value) { return JSON.parse(setItem(key, JSON.stringify(value))); }
export function flushStorage() { return pending; }
