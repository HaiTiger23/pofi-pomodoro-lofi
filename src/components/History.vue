<template>
  <DrawerPanel id="drawer-history" title="Đã nghe cùng nhau" icon="ri-history-line" :open="open" @close="closeDrawer">
    <p class="panel-intro">Những giai điệu từng đi qua<br />góc tập trung của bạn.</p>
    <div v-if="!songHistory.length" class="empty-state"><i class="ri-history-line"></i><h3>Chưa có giai điệu nào</h3><p>Bắt đầu một bài nhạc yêu thích.<br />Lịch sử của bạn sẽ nằm ở đây.</p></div>
    <div v-else class="song-list"><div class="song-row" v-for="song in songHistory" :key="song.videoId"><button class="song-select" @click="playSong(song)"><img :src="song.thumbnail" alt="" loading="lazy" /><span><strong>{{ song.title }}</strong><small>{{ formatTime(song.timestamp) }}</small></span></button><button class="icon-button danger-button" :aria-label="'Xóa khỏi lịch sử: ' + song.title" @click="removeSongFromHistory(song.videoId)"><i class="ri-delete-bin-line"></i></button></div></div>
    <template #footer><i class="ri-time-line"></i>Lưu 50 giai điệu gần nhất.</template>
  </DrawerPanel>
</template>
<script>
import DrawerPanel from './DrawerPanel.vue';
import { computed } from 'vue';
import { useStore } from 'vuex';
export default {
  components: { DrawerPanel },
  name: 'SongHistory',
  props: { open: Boolean },
  emits: ['close', 'play'],
  setup(_props, { emit }) {
    const store = useStore();
    return {
      songHistory: computed(() => store.getters.getSongHistory),
      closeDrawer: () => emit('close'),
      playSong: song => emit('play', song),
      removeSongFromHistory: id => store.commit('removeSongFromHistory', id),
      formatTime: value => new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    };
  }
};
</script>
