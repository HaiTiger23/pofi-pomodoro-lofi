const button = document.getElementById('dismiss');
let wasReady = false;
function render(state) {
  if (!state) return;
  document.body.dataset.theme = ['warm','night','garden'].includes(state.theme) ? state.theme : 'warm';
  document.body.dataset.glass = String(Boolean(state.glass));
  const resting = state.phase !== 'work';
  document.getElementById('phase-label').textContent = resting ? `VÒNG ${state.completedWork} ĐÃ HOÀN THÀNH` : 'HẾT GIỜ NGHỈ · MỘT NHỊP MỚI';
  document.getElementById('reminder-title').textContent = resting ? state.phase === 'longBreak' ? 'Đến giờ nghỉ dài.' : 'Đến giờ nghỉ ngắn.' : 'Mình quay lại nhé.';
  document.getElementById('reminder-message').textContent = resting ? 'Dừng tay một chút. Thả lỏng vai và rời mắt khỏi màn hình.' : 'Một việc nhỏ đang chờ. Hít thở chậm, rồi bắt đầu vòng tập trung tiếp theo.';
  document.getElementById('phase-detail').textContent = `${state.duration} phút ${resting ? 'nghỉ ngơi' : 'tập trung'} · ${state.autoStarted ? 'Phiên mới đang chạy' : 'Bấm bắt đầu trong app khi bạn sẵn sàng'}`;
  document.getElementById('countdown').textContent = state.remaining;
  document.getElementById('countdown-hint').textContent = state.canDismiss ? 'Sẵn sàng rồi. Bạn có thể đóng thông báo.' : 'Rời mắt khỏi công việc một chút, rồi mình tiếp tục.';
  button.disabled = !state.canDismiss;
  button.textContent = state.canDismiss ? 'Đóng thông báo' : `Chờ ${state.remaining} giây…`;
  if (state.canDismiss && !wasReady) button.focus();
  wasReady = state.canDismiss;
}
window.pofiReminder.onState(render);
window.pofiReminder.getState().then(render);
button.addEventListener('click', () => window.pofiReminder.dismiss());
