// Owns one player and one polling loop. Generation checks ignore late callbacks.
class PlayerController {
  constructor({ create, root, onUpdate = () => {}, onReady = () => {}, onEnd = () => {}, onError = () => {}, shouldPlay = () => true, schedule = (callback, delay) => setInterval(callback, delay), cancel = id => clearInterval(id), later = (callback, delay) => setTimeout(callback, delay), cancelLater = id => clearTimeout(id) }) {
    Object.assign(this, { create, root, onUpdate, onReady, onEnd, onError, shouldPlay, schedule, cancel, later, cancelLater });
    this.generation = 0;
    this.player = null;
    this.interval = null;
    this.timeout = null;
    this.listeners = [];
    this.volume = 100;
    this.ready = false;
    this.playing = false;
  }
  load(videoId, volume = 100) {
    this.release();
    const generation = this.generation;
    this.volume = volume;
    this.onUpdate({ ready: false, playing: false, currentTime: 0, duration: 0 });
    this.root.replaceChildren();
    const element = this.root.ownerDocument.createElement('div');
    this.root.appendChild(element);
    const player = this.create(element, {
      videoId, width: '100%', height: '100%',
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0, playsinline: 1 }
    });
    this.player = player;
    const current = () => this.player === player && this.generation === generation;
    const fail = error => {
      if (!current()) return;
      this.release();
      this.onUpdate({ ready: false, playing: false });
      const code = Number(error?.data);
      const messages = {
        2: 'Link hoặc mã video không hợp lệ. Hãy chọn lại bài hát.',
        5: 'YouTube không phát được video này. Bấm Thử lại để tải lại trình phát.',
        100: 'Video đã bị xóa hoặc chuyển riêng tư. Hãy chọn bài khác.',
        101: 'Chủ video không cho phát trong ứng dụng. Hãy chọn bài khác.',
        150: 'Chủ video không cho phát trong ứng dụng. Hãy chọn bài khác.',
        153: 'YouTube chưa xác nhận được trình phát. Hãy mở lại ứng dụng rồi thử lại.'
      };
      this.onError(messages[code] || (['API_NETWORK','API_TIMEOUT'].includes(error?.code) ? error.message : 'Không thể kết nối trình phát YouTube. Kiểm tra mạng rồi bấm Thử lại.'));
    };
    this.timeout = this.later(fail, 30000);
    this.listeners.push(player.on('ready', async () => {
      if (!current()) return;
      this.cancelLater(this.timeout);
      this.timeout = null;
      this.ready = true;
      this.onUpdate({ ready: true });
      try {
        const [iframe, duration] = await Promise.all([player.getIframe(), player.getDuration(), player.setVolume(this.volume)]);
        if (!current()) return;
        this.onUpdate({ duration: Number(duration) || 0 });
        this.onReady({ videoId, title: iframe.title || 'YouTube' });
        if (this.shouldPlay()) await player.playVideo();
      } catch { fail(); }
    }));
    this.listeners.push(player.on('stateChange', event => {
      if (!current()) return;
      this.playing = event.data === 1;
      this.onUpdate({ playing: this.playing });
      this.stopPolling();
      if (this.playing) this.startPolling();
      if (event.data === 0) this.onEnd();
    }));
    this.listeners.push(player.on('autoplayBlocked', () => {
      if (!current()) return;
      this.playing = false;
      this.stopPolling();
      this.onUpdate({ playing: false });
    }));
    this.listeners.push(player.on('error', fail));
  }
  startPolling() {
    this.stopPolling();
    const player = this.player;
    const generation = this.generation;
    let busy = false;
    this.interval = this.schedule(async () => {
      if (busy || !this.ready) return;
      busy = true;
      try {
        const [time, duration] = await Promise.all([player.getCurrentTime(), player.getDuration()]);
        if (this.player === player && this.generation === generation) this.onUpdate({ currentTime: Math.floor(time), duration: Number(duration) || 0 });
      } catch { /* Destroying a player may reject an in-flight read. */ }
      finally { busy = false; }
    }, 500);
  }
  stopPolling() { if (this.interval !== null) this.cancel(this.interval); this.interval = null; }
  async toggle() {
    if (this.ready && this.player) await (this.playing ? this.player.pauseVideo() : this.player.playVideo());
  }
  async setVolume(value) {
    this.volume = Math.max(0, Math.min(100, Number(value) || 0));
    if (this.ready && this.player) await this.player.setVolume(this.volume);
  }
  async seek(value) { if (this.ready && this.player) await this.player.seekTo(Math.max(0, Number(value) || 0), true); }
  release() {
    this.generation++;
    this.stopPolling();
    if (this.timeout !== null) this.cancelLater(this.timeout);
    this.timeout = null;
    const player = this.player;
    this.player = null;
    this.ready = false;
    this.playing = false;
    if (player) {
      this.listeners.forEach(listener => player.off(listener));
      Promise.resolve(player.destroy()).catch(() => {});
    }
    this.listeners = [];
  }
  destroy() { this.release(); this.root.replaceChildren(); }
}
module.exports = { PlayerController };
