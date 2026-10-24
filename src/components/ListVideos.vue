<template>
  <div class="result-list"><button class="result-row" v-for="item in list" :key="item.id.videoId" @click="$emit('getVideoEvent', item)"><span class="result-thumbnail"><img :src="item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url" alt="" loading="lazy" /><time v-if="item.duration">{{ item.duration }}</time></span><span class="result-copy"><strong>{{ item.snippet.title }}</strong><small>{{ item.snippet.channelTitle }}</small></span><i class="ri-play-line" aria-hidden="true"></i></button></div>
</template>
<script>
export default { props: { list: { type: Array, default: () => [] } }, emits: ['getVideoEvent'] };
</script>
