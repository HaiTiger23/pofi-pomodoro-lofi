import { createApp } from 'vue';
import './assets/css/tailwind.css';
import './assets/css/design-system.css';
import './assets/css/icons.css';
import { initializeStorage, getItem } from './services/storage';
async function bootstrap() {
  await initializeStorage();
  document.documentElement.dataset.theme = getItem('ui_theme');
  document.documentElement.dataset.glass = getItem('liquid_glass');
  document.documentElement.dataset.glassDark = getItem('liquid_glass_dark');
  document.documentElement.dataset.desktop = String(Boolean(window.electronAPI));
  const [{ default: App }, { default: store }] = await Promise.all([import('./App.vue'), import('./store')]);
  createApp(App).use(store).mount('#app');
}
bootstrap().catch(() => {
  document.getElementById('app').textContent = 'Không thể đọc dữ liệu Pofi. Hãy kiểm tra quyền truy cập thư mục dữ liệu và mở lại ứng dụng.';
});
