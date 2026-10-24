import { PomodoroTimer } from '../../electron/timer';
let browserAPI;
export function getTimerAPI() {
  if (window.electronAPI) return window.electronAPI;
  if (!browserAPI) {
    const listeners = new Set();
    const timer = new PomodoroTimer({
      onChange: state => listeners.forEach(listener => listener(state)),
      onComplete: phase => {
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Pofi', {
          body: phase === 'work' ? 'Đã hết thời gian làm việc, hãy nghỉ ngơi' : 'Đã hết thời gian nghỉ, hãy bắt đầu làm việc'
        });
      }
    });
    browserAPI = {
      configurePomodoroTimer: (work, rest) => timer.configure(work, rest),
      startPomodoroTimer: (work, rest) => timer.start(work, rest),
      stopPomodoroTimer: () => timer.stop(),
      pausePomodoroTimer: () => timer.pause(),
      resumePomodoroTimer: () => timer.resume(),
      getPomodoroTimerStatus: () => timer.tick(),
      onPomodoroState: listener => { listeners.add(listener); return () => listeners.delete(listener); }
    };
  }
  return browserAPI;
}
