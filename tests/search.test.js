const test = require('node:test');
const assert = require('node:assert/strict');
const { YouTubeSearch, extractInitialData, extractContext, collectVideos, validateQuery } = require('../electron/youtube-search');
const video = (id, title = 'Lofi chill') => ({ videoRenderer: { videoId: id, title: { runs: [{ text: title }] }, ownerText: { runs: [{ text: 'Artist' }] }, lengthText: { simpleText: '3:40' } } });
const page = contents => `<script>var ytInitialData = ${JSON.stringify({ contents })};</script>`;

test('search parser reads escaped JSON without running page scripts', () => {
  const title = 'Nhạc } "chill" \\ buổi tối';
  const html = page([video('DnewVhYNt-I', title)]) + '<script>throw new Error("never execute");</script>';
  const items = collectVideos(extractInitialData(html));
  assert.equal(items[0].snippet.title, title);
  assert.equal(items[0].snippet.channelTitle, 'Artist');
  assert.equal(items[0].duration, '3:40');
  assert.equal(items[0].snippet.thumbnails.medium.url, 'https://i.ytimg.com/vi/DnewVhYNt-I/mqdefault.jpg');
  assert.deepEqual(extractInitialData('window["ytInitialData"] = {"contents": []};'), { contents: [] });
  assert.throws(() => extractInitialData('<script>ytInitialData = doSomething();</script>'));
});
test('search results omit ads, invalid IDs and duplicates and cap video count', () => {
  const data = [video('DnewVhYNt-I'), video('DnewVhYNt-I'), video('bad'), { adSlotRenderer: { item: video('ukHK1GVyr0I') } },
    ...Array.from({ length: 60 }, (_, i) => video(String(i).padStart(11, '0')))];
  const items = collectVideos(extractInitialData(page(data)));
  assert.equal(items.length, 50);
  assert.equal(items.filter(item => item.id.videoId === 'DnewVhYNt-I').length, 1);
  assert.equal(items.some(item => item.id.videoId === 'ukHK1GVyr0I'), false);
});
test('search supports the video lockup layout and skips playlists', () => {
  const lockup = type => ({ lockupViewModel: { contentId: 'DnewVhYNt-I', contentType: type, metadata: { lockupMetadataViewModel: { title: { content: 'Quiet morning' }, metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [{ text: { content: 'Artist' } }] }] } } } } } });
  assert.equal(collectVideos([lockup('LOCKUP_CONTENT_TYPE_VIDEO')])[0].snippet.title, 'Quiet morning');
  assert.equal(collectVideos([lockup('LOCKUP_CONTENT_TYPE_PLAYLIST')]).length, 0);
});
test('query validation accepts Vietnamese and rejects oversized or non-text input', () => {
  assert.equal(validateQuery('  nhạc   thư giãn  '), 'nhạc thư giãn');
  for (const value of ['', ' ', 'a'.repeat(201), null, [], {}]) assert.throws(() => validateQuery(value));
});
test('simultaneous identical searches share a request and cached results expire', async () => {
  let calls = 0, now = 0;
  const service = new YouTubeSearch({ now: () => now, fetch: async () => { calls++; return page([video('DnewVhYNt-I')]); } });
  const [first, second] = await Promise.all([service.search('lofi chill'), service.search(' LOFI   CHILL ')]);
  assert.deepEqual(first, second);
  assert.equal(calls, 1);
  await service.search('lofi chill');
  assert.equal(calls, 1);
  now = 60001;
  await service.search('lofi chill');
  assert.equal(calls, 2);
});
test('network errors are actionable and unsuccessful requests can be retried', async () => {
  let fail = true;
  const service = new YouTubeSearch({ fetch: async () => {
    if (fail) throw { response: { status: 429 }, message: 'upstream internal details' };
    return page([video('DnewVhYNt-I')]);
  } });
  await assert.rejects(service.search('lofi'), /giới hạn tìm kiếm/);
  fail = false;
  assert.equal((await service.search('lofi')).length, 1);
});
test('consent or unsupported pages report an error rather than fake empty results', async () => {
  const service = new YouTubeSearch({ fetch: async () => '<html>Please confirm</html>' });
  await assert.rejects(service.search('lofi'), /YouTube chưa trả về kết quả/);
});

const continuation = token => ({ continuationItemRenderer: { continuationEndpoint: { continuationCommand: { token } } } });
const config = '<script>ytcfg.set({"INNERTUBE_CONTEXT":{"client":{"clientName":"WEB","clientVersion":"2.20261024.00.00","visitorData":"visitor","remoteHost":"unused"}}});</script>';
const nextPage = items => ({ onResponseReceivedCommands: [{ appendContinuationItemsAction: { continuationItems: items } }] });

test('pagination loads beyond the first page, deduplicates and shares repeated requests', async () => {
  let moreCalls = 0;
  const service = new YouTubeSearch({
    fetch: async () => page([video('DnewVhYNt-I'), continuation('page-two')]) + config,
    fetchMore: async (query, state) => {
      moreCalls++;
      assert.equal(query, 'lofi');
      assert.equal(state.token, 'page-two');
      assert.equal(state.context.client.remoteHost, undefined);
      return nextPage([video('DnewVhYNt-I'), video('ukHK1GVyr0I'), continuation('page-three')]);
    }
  });
  const first = await service.searchPage('lofi');
  assert.equal(first.items.length, 1);
  assert.match(first.nextCursor, /^[a-f0-9]{32}$/);
  const [second, duplicate] = await Promise.all([service.searchPage('lofi', first.nextCursor), service.searchPage('lofi', first.nextCursor)]);
  assert.deepEqual(second, duplicate);
  assert.deepEqual(second.items.map(item => item.id.videoId), ['ukHK1GVyr0I']);
  assert.ok(second.nextCursor);
  assert.equal(moreCalls, 1);
  await service.searchPage('lofi', first.nextCursor);
  assert.equal(moreCalls, 1);
});

test('invalid, expired and mismatched cursors never trigger an upstream page request', async () => {
  let now = 0, calls = 0;
  const service = new YouTubeSearch({ now: () => now, fetch: async () => page([video('DnewVhYNt-I'), continuation('next')]) + config, fetchMore: async () => { calls++; return nextPage([]); } });
  const first = await service.searchPage('lofi');
  for (const cursor of ['', 'x'.repeat(30000), [], {}]) await assert.rejects(service.searchPage('lofi', cursor), error => error.status === 400);
  await assert.rejects(service.searchPage('other', first.nextCursor), error => error.status === 410);
  now = 600001;
  await assert.rejects(service.searchPage('lofi', first.nextCursor), error => error.status === 410);
  assert.equal(calls, 0);
});

test('failed continuation requests can be retried and a repeated upstream token ends pagination', async () => {
  let fail = true;
  const service = new YouTubeSearch({ fetch: async () => page([video('DnewVhYNt-I'), continuation('next')]) + config,
    fetchMore: async () => {
      if (fail) throw new Error('temporary network error');
      return nextPage([video('ukHK1GVyr0I'), continuation('next')]);
    } });
  const first = await service.searchPage('lofi');
  await assert.rejects(service.searchPage('lofi', first.nextCursor), /Kiểm tra mạng/);
  fail = false;
  const second = await service.searchPage('lofi', first.nextCursor);
  assert.equal(second.items.length, 1);
  assert.equal(second.nextCursor, null);
});

test('only primary search results are collected and web configuration remains data only', () => {
  const data = { contents: { twoColumnSearchResultsRenderer: {
    primaryContents: { sectionListRenderer: { contents: [video('DnewVhYNt-I')] } },
    secondaryContents: { results: [video('ukHK1GVyr0I')] }
  } } };
  assert.deepEqual(collectVideos(data).map(item => item.id.videoId), ['DnewVhYNt-I']);
  assert.deepEqual(extractContext(config), { client: { clientName: 'WEB', clientVersion: '2.20261024.00.00', hl: 'vi', gl: 'VN', visitorData: 'visitor' } });
  assert.equal(extractContext('ytcfg.set(runAnything());'), null);
});
