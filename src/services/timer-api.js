import { PomodoroTimer } from '../../electron/timer';
let browserAPI;
export function getTimerAPI() {
  if (window.electronAPI) return window.electronAPI;
  if (!browserAPI) {
    const listeners = new Set();
    const timer = new PomodoroTimer({
      onChange: state => listeners.forEach(listener => listener(state)),
      onComplete: (phase, detail) => {
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Pofi', {
          body: phase === 'work' ? `Đã hoàn thành một vòng. Đến giờ ${detail.nextPhase === 'longBreak' ? 'nghỉ dài' : 'nghỉ ngắn'}.` : 'Đã hết thời gian nghỉ, hãy bắt đầu làm việc'
        });
      }
    });
    browserAPI = {
      configurePomodoroTimer: (...settings) => timer.configure(...settings),
      startPomodoroTimer: (...settings) => timer.start(...settings),
      skipPomodoroBreak: () => timer.skipBreak(),
      skipPomodoroPhase: () => timer.skipPhase(),
      stopPomodoroTimer: () => timer.stop(),
      pausePomodoroTimer: () => timer.pause(),
      resumePomodoroTimer: () => timer.resume(),
      getPomodoroTimerStatus: () => timer.tick(),
      onPomodoroState: listener => { listeners.add(listener); return () => listeners.delete(listener); }
    };
  }
  return browserAPI;
}
