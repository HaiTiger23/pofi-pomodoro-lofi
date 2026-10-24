const axios = require('axios');
const { randomBytes } = require('crypto');
const { validVideoId } = require('../shared/validation');

function searchError(message, status = 502) { return Object.assign(new Error(message), { status, isSearchError: true }); }
function validateQuery(value) {
  if (typeof value !== 'string') throw searchError('Nhập từ khóa để tìm nhạc.', 400);
  const query = value.trim().replace(/\s+/g, ' ').normalize('NFC');
  if (!query || query.length > 200) throw searchError('Từ khóa cần có từ 1 đến 200 ký tự.', 400);
  return query;
}

// Read JSON objects only; never execute any scripts from the public page.
function readObject(html, start) {
  if (html[start] !== '{') return null;
  let depth = 0, inString = false, escaped = false;
  for (let index = start; index < html.length; index++) {
    const character = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') inString = true;
    else if (character === '{') depth++;
    else if (character === '}' && --depth === 0) {
      try { return JSON.parse(html.slice(start, index + 1)); } catch { return null; }
    }
  }
  return null;
}
function extractInitialData(html) {
  if (typeof html !== 'string' || html.length > 8 * 1024 * 1024) throw searchError('Kết quả YouTube không hợp lệ. Hãy thử lại.');
  const assignment = /\bytInitialData\s*=\s*|window\s*\[\s*["']ytInitialData["']\s*\]\s*=\s*/g;
  while (assignment.exec(html)) {
    const data = readObject(html, assignment.lastIndex);
    if (data) return data;
  }
  throw searchError('YouTube chưa trả về kết quả. Hãy thử lại sau hoặc dán link video để phát.');
}
function extractContext(html) {
  const config = /\bytcfg\.set\(\s*/g;
  while (config.exec(html)) {
    const client = readObject(html, config.lastIndex)?.INNERTUBE_CONTEXT?.client;
    if (client?.clientName === 'WEB' && typeof client.clientVersion === 'string' && /^[\w.]{1,100}$/.test(client.clientVersion)) {
      return { client: { clientName: 'WEB', clientVersion: client.clientVersion, hl: 'vi', gl: 'VN',
        ...(typeof client.visitorData === 'string' && client.visitorData.length < 5000 ? { visitorData: client.visitorData } : {}) } };
    }
  }
  return null;
}
function resultContents(data) {
  const primary = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
  if (primary) return primary;
  const commands = data?.onResponseReceivedCommands || data?.onResponseReceivedActions;
  if (Array.isArray(commands)) return commands.flatMap(command => command?.appendContinuationItemsAction?.continuationItems || []);
  return data?.continuationContents?.sectionListContinuation?.contents || data?.contents || data;
}
function continuationToken(data) {
  const contents = resultContents(data);
  if (!Array.isArray(contents)) return null;
  for (const item of contents) {
    const token = item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
    if (typeof token === 'string' && token.length > 0 && token.length <= 20000) return token;
  }
  return null;
}
const text = value => typeof value === 'string' ? value : value?.simpleText || value?.content || value?.runs?.map(run => run.text || '').join('') || '';
function collectVideos(data, limit = 50) {
  const items = [], seen = new Set();
  let visited = 0;
  function add(id, title, channel, duration) {
    if (!validVideoId(id) || !title || seen.has(id) || items.length >= limit) return;
    seen.add(id);
    const thumbnail = { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` };
    items.push({ id: { videoId: id }, snippet: {
      title: title.slice(0, 500), channelTitle: (channel || 'YouTube').slice(0, 200),
      thumbnails: { high: thumbnail, medium: thumbnail, default: thumbnail }
    }, duration: duration || '' });
  }
  function visit(node, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 100 || ++visited > 100000 || items.length >= limit) return;
    if (node.adSlotRenderer || node.promotedVideoRenderer || node.inFeedAdLayoutRenderer || node.promotedSparklesWebRenderer) return;
    const video = node.videoRenderer;
    if (video) add(video.videoId, text(video.title), text(video.ownerText || video.longBylineText || video.shortBylineText), text(video.lengthText));
    const lockup = node.lockupViewModel;
    if (lockup?.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
      const metadata = lockup.metadata?.lockupMetadataViewModel;
      const channel = metadata?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text;
      add(lockup.contentId, text(metadata?.title), text(channel));
    }
    for (const value of Object.values(node)) visit(value, depth + 1);
  }
  visit(resultContents(data));
  return items;
}

async function fetchPage(query) {
  const response = await axios.get('https://www.youtube.com/results', {
    params: { search_query: query, sp: 'EgIQAQ==' },
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8' },
    timeout: 15000, maxContentLength: 8 * 1024 * 1024,
    responseType: 'text'
  });
  return response.data;
}
async function fetchContinuation(query, { token, context }) {
  const response = await axios.post('https://www.youtube.com/youtubei/v1/search', { context, continuation: token }, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
      'X-Youtube-Client-Name': '1', 'X-Youtube-Client-Version': context.client.clientVersion,
      ...(context.client.visitorData ? { 'X-Goog-Visitor-Id': context.client.visitorData } : {}),
      Origin: 'https://www.youtube.com', Referer: 'https://www.youtube.com/results?' + new URLSearchParams({ search_query: query }) },
    timeout: 15000, maxContentLength: 8 * 1024 * 1024, responseType: 'json'
  });
  return response.data;
}
class YouTubeSearch {
  constructor({ fetch = fetchPage, fetchMore = fetchContinuation, now = Date.now, cacheMs = 60000, cursorMs = 600000 } = {}) {
    Object.assign(this, { fetch, fetchMore, now, cacheMs, cursorMs });
    this.cache = new Map();
    this.pending = new Map();
    this.cursors = new Map();
  }
  async search(value) { return (await this.searchPage(value)).items; }
  async searchPage(value, cursor = null) {
    const query = validateQuery(value), key = query.toLocaleLowerCase('vi');
    let previous;
    if (cursor != null) {
      if (typeof cursor !== 'string' || !/^[a-f0-9]{32}$/.test(cursor)) throw searchError('Trang kết quả không hợp lệ. Hãy tìm lại.', 400);
      previous = this.cursors.get(cursor);
      if (!previous || previous.key !== key || previous.expires <= this.now()) throw searchError('Kết quả đã hết hạn. Hãy tìm lại để tiếp tục.', 410);
      if (previous.page) return previous.page;
    } else {
      const cached = this.cache.get(key);
      if (cached && cached.expires > this.now()) return cached.page;
    }
    const requestKey = key + '\0' + (cursor || '');
    if (this.pending.has(requestKey)) return this.pending.get(requestKey);
    if (this.pending.size >= 4) throw searchError('Đang tìm nhiều từ khóa. Bạn chờ một chút rồi thử lại nhé.', 429);
    const request = Promise.resolve().then(async () => {
      let data, context;
      if (previous) {
        data = await this.fetchMore(query, previous);
        context = previous.context;
        if (!data || (!data.onResponseReceivedCommands && !data.onResponseReceivedActions && !data.continuationContents)) throw searchError('Chưa tải được trang tiếp theo. Hãy thử lại.');
      } else {
        const html = await this.fetch(query);
        data = extractInitialData(html);
        context = extractContext(html);
        if (!data.contents) throw searchError('YouTube chưa trả về kết quả. Hãy thử lại sau hoặc dán link video để phát.');
      }
      const seen = new Set(previous?.seen || []), tokens = new Set(previous?.tokens || []);
      const items = collectVideos(data).filter(item => !seen.has(item.id.videoId));
      items.forEach(item => seen.add(item.id.videoId));
      const token = continuationToken(data);
      let nextCursor = null;
      if (token && context && !tokens.has(token) && seen.size < 500) {
        tokens.add(token);
        for (const [id, entry] of this.cursors) if (entry.expires <= this.now()) this.cursors.delete(id);
        if (this.cursors.size >= 200) this.cursors.delete(this.cursors.keys().next().value);
        nextCursor = randomBytes(16).toString('hex');
        this.cursors.set(nextCursor, { key, token, context, seen, tokens, expires: this.now() + this.cursorMs });
      }
      const page = { items, nextCursor };
      if (previous) previous.page = page;
      else {
        if (this.cache.size >= 50) this.cache.delete(this.cache.keys().next().value);
        this.cache.set(key, { page, expires: this.now() + this.cacheMs });
      }
      return page;
    }).catch(error => {
      if (error.isSearchError) throw error;
      if (error.response?.status === 429 || error.response?.status === 403) throw searchError('YouTube đang giới hạn tìm kiếm. Hãy thử lại sau hoặc dán link video.');
      throw searchError('Chưa kết nối được YouTube. Kiểm tra mạng rồi thử lại nhé.');
    }).finally(() => this.pending.delete(requestKey));
    this.pending.set(requestKey, request);
    return request;
  }
}
function registerSearchRoute(server, service = new YouTubeSearch()) {
  server.get('/api/youtube/search', async (request, response) => {
    response.set('Cache-Control', 'no-store');
    try { response.json(await service.searchPage(request.query.q, request.query.cursor)); }
    catch (error) { response.status(error.status || 502).json({ error: error.message }); }
  });
}
module.exports = { YouTubeSearch, extractInitialData, extractContext, collectVideos, validateQuery, registerSearchRoute };
