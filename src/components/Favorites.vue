<template>
  <DrawerPanel id="drawer-favorites" title="Giai điệu thân quen" icon="ri-heart-line" :open="open" @close="closeDrawer">
    <p class="panel-intro">Một danh sách nhỏ,<br />toàn những điều bạn thích.</p>
    <div v-if="!favoriteSongs.length" class="empty-state"><i class="ri-heart-line"></i><h3>Giữ lại chút yêu thích</h3><p>Chạm vào trái tim khi nghe một bài hay.<br />Lần tới, tìm lại ngay ở đây.</p></div>
    <div v-else class="song-list"><div class="song-row" v-for="song in favoriteSongs" :key="song.videoId"><button class="song-select" @click="playSong(song)"><img :src="song.thumbnail" alt="" loading="lazy" /><span><strong>{{ song.title }}</strong><small>{{ song.channelTitle }}</small></span></button><button class="icon-button danger-button" :aria-label="'Bỏ yêu thích: ' + song.title" @click="removeFavorite(song.videoId)"><i class="ri-heart-fill"></i></button></div></div>
    <template #footer><i class="ri-heart-line"></i>{{ favoriteSongs.length }} giai điệu được giữ lại.</template>
  </DrawerPanel>
</template>
<script>
import DrawerPanel from './DrawerPanel.vue';
import { computed } from 'vue';
import { useStore } from 'vuex';
export default {
  components: { DrawerPanel },
  name: 'SongFavorites',
  props: { open: Boolean },
  emits: ['close', 'play'],
  setup(_props, { emit }) {
    const store = useStore();
    return {
      favoriteSongs: computed(() => store.getters.getFavoriteSongs),
      closeDrawer: () => emit('close'),
      playSong: song => emit('play', song),
      removeFavorite: id => store.commit('removeFromFavorites', id)
    };
  }
};
</script>
