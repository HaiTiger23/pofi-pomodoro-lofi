const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const item = videoId => ({ id: { videoId }, snippet: { title: videoId } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function component(searchVideos) {
  const source = fs.readFileSync(path.join(__dirname, '../src/components/MusicSearch.vue'), 'utf8').split('<script>')[1].split('</script>')[0]
    .replace(/^import .*;\r?\n/gm, '').replace('export default', 'module.exports =');
  const context = { module: { exports: {} }, ListVideos: {}, searchVideos, extractVideoId: () => null, AbortController, Set };
  vm.runInNewContext(source, context);
  const definition = context.module.exports;
  const state = { ...definition.data(), $emit() {} };
  for (const [name, method] of Object.entries(definition.methods)) state[name] = method.bind(state);
  return { state, dispose: () => definition.beforeUnmount.call(state) };
}

test('a new search wins over a late load-more reply from the previous query', async () => {
  const delayed = deferred();
  const { state } = component(async (term, _signal, cursor) => {
    if (cursor) return delayed.promise;
    return { items: [item(term)], nextCursor: term === 'old' ? 'next' : null };
  });
  state.term = 'old'; await state.search();
  const loadingMore = state.loadMore();
  state.term = 'new'; await state.search();
  delayed.resolve({ items: [item('late')], nextCursor: 'stale' });
  await loadingMore;
  assert.deepEqual(Array.from(state.results, result => result.id.videoId), ['new']);
  assert.equal(state.nextCursor, null);
  assert.equal(state.loadingMore, false);
});

test('load more keeps the submitted query, retains existing results on failure and retries', async () => {
  let fail = true;
  const { state } = component(async (term, _signal, cursor) => {
    assert.equal(term, 'lofi');
    if (!cursor) return { items: [item('first')], nextCursor: 'next' };
    if (fail) throw new Error('Try again');
    return { items: [item('first'), item('second')], nextCursor: null };
  });
  state.term = 'lofi'; await state.search();
  state.term = 'text being edited'; await state.loadMore();
  assert.equal(state.moreError, 'Try again');
  assert.equal(state.results.length, 1);
  assert.equal(state.nextCursor, 'next');
  fail = false; await state.loadMore();
  assert.deepEqual(Array.from(state.results, result => result.id.videoId), ['first', 'second']);
  assert.equal(state.moreError, '');
});

test('closing the search ignores late native results and aborts the request', async () => {
  const delayed = deferred();
  const { state, dispose } = component(() => delayed.promise);
  state.term = 'lofi'; const request = state.search();
  dispose();
  assert.equal(state.abort.signal.aborted, true);
  delayed.resolve({ items: [item('late')], nextCursor: null });
  await request;
  assert.equal(state.results.length, 0);
});
