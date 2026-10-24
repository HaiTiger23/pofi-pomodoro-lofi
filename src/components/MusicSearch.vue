<template>
  <div class="music-search">
    <form class="search-form" role="search" @submit.prevent="search"><input class="text-field" v-model="term" aria-label="Tìm video YouTube" placeholder="Tên bài, nghệ sĩ hoặc link YouTube…" /><button type="submit" class="icon-button active" :disabled="!term.trim()" aria-label="Tìm kiếm"><i :class="loading ? 'ri-loader-4-line' : 'ri-search-line'"></i></button></form>
    <p v-if="error" role="alert" class="inline-error">{{ error }}</p>
    <p v-if="loading" class="field-hint">Đang tìm giai điệu cho bạn…</p>
    <p v-if="!results.length && !loading && !error" class="field-hint">Tìm theo tên bài, nghệ sĩ hoặc dán link YouTube.</p>
    <p v-if="results.length" class="search-count" aria-live="polite">{{ results.length }} kết quả</p>
    <div v-if="results.length || nextCursor" class="search-results" :aria-busy="loadingMore">
      <ListVideos :list="results" @get-video-event="select($event.id.videoId)" />
      <p v-if="moreError" role="alert" class="inline-error">{{ moreError }}</p>
      <button v-if="nextCursor" class="secondary-button load-more" :disabled="loadingMore" @click="loadMore"><i :class="loadingMore ? 'ri-loader-4-line' : 'ri-add-line'"></i>{{ loadingMore ? 'Đang tải thêm…' : moreError ? 'Thử tải lại' : 'Tải thêm kết quả' }}</button>
    </div>
  </div>
</template>
<script>
import ListVideos from './ListVideos.vue';
import { searchVideos, extractVideoId } from '../assets/js/search';
export default {
  components: { ListVideos },
  emits: ['select'],
  data: () => ({ term: '', searchedTerm: '', results: [], nextCursor: null, loading: false, loadingMore: false, error: '', moreError: '', request: 0 }),
  beforeUnmount() { this.request++; if (this.abort) this.abort.abort(); },
  methods: {
    select(id) { this.$emit('select', id); this.results = []; this.term = ''; this.nextCursor = null; },
    async search() {
      const term = this.term.trim();
      if (!term) return;
      const request = ++this.request;
      if (this.abort) this.abort.abort();
      this.loading = false;
      this.loadingMore = false;
      this.error = '';
      this.moreError = '';
      this.results = [];
      this.nextCursor = null;
      this.searchedTerm = term;
      const videoId = extractVideoId(term);
      if (videoId) return this.select(videoId);
      this.loading = true;
      this.abort = new AbortController();
      try {
        const page = await searchVideos(term, this.abort.signal);
        if (request !== this.request) return;
        this.results = page.items;
        this.nextCursor = page.nextCursor;
        if (!page.items.length && !page.nextCursor) this.error = 'Không tìm thấy video.';
      } catch (error) {
        if (request === this.request) this.error = error.response?.data?.error || error.message || 'Chưa tìm được nhạc. Hãy thử lại nhé.';
      } finally { if (request === this.request) this.loading = false; }
    },
    async loadMore() {
      if (!this.nextCursor || this.loading || this.loadingMore) return;
      const request = this.request;
      this.loadingMore = true;
      this.moreError = '';
      this.abort = new AbortController();
      try {
        const page = await searchVideos(this.searchedTerm, this.abort.signal, this.nextCursor);
        if (request !== this.request) return;
        const seen = new Set(this.results.map(item => item.id.videoId));
        this.results.push(...page.items.filter(item => !seen.has(item.id.videoId)));
        this.nextCursor = page.nextCursor;
      } catch (error) {
        if (request === this.request) this.moreError = error.response?.data?.error || error.message || 'Chưa tải thêm được. Hãy thử lại.';
      } finally { if (request === this.request) this.loadingMore = false; }
    }
  }
};
</script>
