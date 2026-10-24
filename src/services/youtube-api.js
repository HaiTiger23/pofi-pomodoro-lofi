// Unlike the old wrapper, a failed SDK request must not poison all later loads.
function createAPILoader({ scope, document, later = setTimeout, cancelLater = clearTimeout }) {
  let pending;
  return function loadAPI() {
    if (typeof scope.YT?.Player === 'function') return Promise.resolve(scope.YT);
    if (pending) return pending;
    const request = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const previous = scope.onYouTubeIframeAPIReady;
      let timeout, settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        cancelLater(timeout);
        script.onerror = null;
        if (scope.onYouTubeIframeAPIReady === onReady) scope.onYouTubeIframeAPIReady = previous;
        if (error) { script.remove(); reject(error); }
        else resolve(scope.YT);
      };
      const onReady = () => {
        try { if (typeof previous === 'function') previous(); }
        finally { if (typeof scope.YT?.Player === 'function') finish(); }
      };
      scope.onYouTubeIframeAPIReady = onReady;
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => finish(Object.assign(new Error('Không kết nối được trình phát YouTube. Kiểm tra mạng rồi bấm Thử lại.'), { code: 'API_NETWORK' }));
      timeout = later(() => finish(Object.assign(new Error('YouTube phản hồi chậm. Bấm Thử lại để tải lại trình phát.'), { code: 'API_TIMEOUT' })), 20000);
      document.head.appendChild(script);
    });
    pending = request;
    // Reset only this request: a later attempt may already own the loader.
    request.then(() => { if (pending === request) pending = null; }, () => { if (pending === request) pending = null; });
    return request;
  };
}

function createPlayerAdapter(element, options, loadAPI) {
  const listeners = new Map();
  let native, destroyed = false, settleReady;
  const ready = new Promise(resolve => { settleReady = resolve; });
  const emit = (type, event) => {
    if (destroyed) return;
    for (const listener of [...(listeners.get(type) || [])]) listener.callback(event);
  };
  const origin = element.ownerDocument.defaultView.location.origin;
  loadAPI().then(YT => {
    if (destroyed) return;
    native = new YT.Player(element, {
      ...options,
      playerVars: { ...options.playerVars, ...(/^https?:\/\//.test(origin) ? { origin } : {}) },
      events: {
        onReady: event => { if (!destroyed) { settleReady(event.target); emit('ready', event); } },
        onStateChange: event => emit('stateChange', event),
        onAutoplayBlocked: event => emit('autoplayBlocked', event),
        onError: event => emit('error', event)
      }
    });
  }).catch(error => { settleReady(null); emit('error', error); });
  const player = {
    on(type, callback) {
      const listener = { type, callback };
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
      return listener;
    },
    off(listener) { listeners.get(listener.type)?.delete(listener); },
    destroy() {
      destroyed = true;
      listeners.clear();
      settleReady(null);
      try { if (native) native.destroy(); } catch { /* The iframe may already have been removed. */ }
      return Promise.resolve();
    }
  };
  for (const method of ['getIframe','getDuration','getCurrentTime','getVideoData','setVolume','playVideo','pauseVideo','seekTo']) {
    player[method] = async (...args) => {
      const target = await ready;
      if (destroyed || !target) throw new Error('Trình phát đã đóng.');
      return target[method](...args);
    };
  }
  return player;
}
let loadAPI;
function createYouTubePlayer(element, options = {}) {
  if (!loadAPI) loadAPI = createAPILoader({ scope: window, document });
  return createPlayerAdapter(element, options, loadAPI);
}
module.exports = { createAPILoader, createPlayerAdapter, createYouTubePlayer };
