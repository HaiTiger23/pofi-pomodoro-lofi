import axios from 'axios';
import { validVideoId } from '../../../shared/validation';
export function extractVideoId(value) {
  if (validVideoId(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    let id;
    if (host === 'youtu.be') id = url.pathname.split('/')[1];
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /\/(?:shorts|embed|live)\//.test(url.pathname) ? url.pathname.split('/')[2] : null;
    }
    return validVideoId(id) ? id : null;
  } catch { return null; }
}
export async function searchVideos(term, signal, cursor = null) {
  const data = window.electronAPI?.searchYouTube
    ? await window.electronAPI.searchYouTube(term, cursor)
    : (await axios.get('/api/youtube/search', { params: { q: term, ...(cursor ? { cursor } : {}) }, timeout: 20000, signal })).data;
  if (signal?.aborted) throw new Error('Đã hủy tìm kiếm.');
  if (data.error) throw new Error(data.error);
  return { items: (data.items || []).filter(item => item.id && validVideoId(item.id.videoId) && item.snippet), nextCursor: typeof data.nextCursor === 'string' ? data.nextCursor : null };
}
