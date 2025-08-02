<template>
  <!-- Drawer component cho danh sách bài hát yêu thích -->
  <div 
    id="drawer-favorites"
    class="fixed top-0 left-0 z-40 h-screen p-4 overflow-y-auto transition-transform -translate-x-full bg-white w-80 dark:bg-gray-800"
    tabindex="-1"
    aria-labelledby="drawer-favorites-label"
  >
    <div class="flex justify-between items-center mb-4">
      <h5 class="text-base font-semibold text-gray-500 uppercase dark:text-gray-400 flex items-center">
        <i class="ri-heart-fill mr-2 text-red-500"></i>
        Bài hát yêu thích
      </h5>
      <button
        type="button"
        @click="closeDrawer"
        class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
      >
        <svg
          aria-hidden="true"
          class="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          ></path>
        </svg>
        <span class="sr-only">Close Favorites</span>
      </button>
    </div>
    
    <div class="favorites-list">
      <div v-if="favoriteSongs.length === 0" class="empty-favorites">
        <p>Chưa có bài hát nào trong danh sách yêu thích</p>
      </div>
      
      <div v-else class="favorites-items">
        <div 
          v-for="(song, index) in favoriteSongs" 
          :key="index" 
          class="favorite-item"
        >
          <div 
            class="song-content"
            @click="playSong(song)"
          >
            <div class="song-thumbnail">
              <img :src="song.thumbnail || `https://i3.ytimg.com/vi/${song.videoId}/hqdefault.jpg`" alt="thumbnail" />
            </div>
            <div class="song-info">
              <h5 class="song-title">{{ song.title }}</h5>
              <p class="song-channel">{{ song.channelTitle }}</p>
            </div>
          </div>
          <button 
            @click.stop="removeFavorite(song.videoId)"
            class="remove-btn"
            title="Xóa khỏi danh sách yêu thích"
          >
            <i class="ri-close-line"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'SongFavorites',
  setup() {
    const store = useStore();
    const isVisible = ref(false);
    
    // Lấy danh sách bài hát yêu thích từ store
    const favoriteSongs = computed(() => store.getters.getFavoriteSongs);
    
    // Phát bài hát khi click vào
    const playSong = (song) => {
      // Tạo sự kiện custom để thông báo cho App.vue
      window.dispatchEvent(new CustomEvent('play-favorite-song', { 
        detail: { song }
      }));
      
      // Đóng drawer sau khi chọn bài hát
      closeDrawer();
    };
    
    // Xóa bài hát khỏi danh sách yêu thích
    const removeFavorite = (videoId) => {
      store.commit('removeFromFavorites', videoId);
    };
    
    // Đóng drawer
    const closeDrawer = () => {
      const drawer = document.getElementById('drawer-favorites');
      if (drawer) {
        drawer.classList.add('-translate-x-full');
        drawer.classList.remove('transform-none');
        
        // Thông báo cho App.vue biết drawer đã đóng
        window.dispatchEvent(new CustomEvent('favorites-closed'));
      }
    };
    
    // Xử lý sự kiện toggle-favorites từ App.vue
    const handleToggleFavorites = (event) => {
      const drawer = document.getElementById('drawer-favorites');
      if (drawer) {
        if (event.detail.show) {
          drawer.classList.remove('-translate-x-full');
          drawer.classList.add('transform-none');
        } else {
          drawer.classList.add('-translate-x-full');
          drawer.classList.remove('transform-none');
        }
      }
    };
    
    // Đăng ký sự kiện khi component được mount
    onMounted(() => {
      window.addEventListener('toggle-favorites', handleToggleFavorites);
    });
    
    // Hủy đăng ký sự kiện khi component bị unmount
    onUnmounted(() => {
      window.removeEventListener('toggle-favorites', handleToggleFavorites);
    });
    
    return {
      favoriteSongs,
      playSong,
      removeFavorite,
      closeDrawer,
      isVisible
    };
  }
};
</script>

<style scoped>
/* Style cho drawer yêu thích */
.favorites-list {
  margin-top: 1rem;
}

.empty-favorites {
  text-align: center;
  padding: 2rem 0;
  color: #6b7280;
}

.favorite-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s;
}

.favorite-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.song-content {
  display: flex;
  align-items: center;
  flex: 1;
  cursor: pointer;
}

.song-thumbnail {
  width: 50px;
  height: 50px;
  min-width: 50px;
  border-radius: 0.25rem;
  overflow: hidden;
  margin-right: 0.75rem;
}

.song-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.song-info {
  flex: 1;
  overflow: hidden;
}

.song-title {
  font-size: 0.875rem;
  font-weight: 500;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #e5e7eb;
  max-width: 180px;
}

.song-channel {
  font-size: 0.75rem;
  color: #9ca3af;
  margin: 0.25rem 0 0;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 50%;
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  transition: all 0.2s;
  margin-left: 0.5rem;
  cursor: pointer;
}

.remove-btn:hover {
  background-color: rgba(239, 68, 68, 0.4);
}
</style>
