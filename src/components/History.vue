<template>
  <!-- Drawer component cho lịch sử bài hát -->
  <div 
    id="drawer-history"
    class="fixed top-0 right-0 z-40 h-screen p-4 overflow-y-auto transition-transform translate-x-full bg-white w-80 dark:bg-gray-800"
    tabindex="-1"
    aria-labelledby="drawer-history-label"
  >
    <div class="flex justify-between items-center mb-4">
      <h5 class="text-base font-semibold text-gray-500 uppercase dark:text-gray-400 flex items-center">
        <i class="ri-history-line mr-2"></i>
        Lịch sử bài hát
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
        <span class="sr-only">Close History</span>
      </button>
    </div>
    
    <div class="history-list">
      <div v-if="songHistory.length === 0" class="empty-history">
        <p>Chưa có bài hát nào trong lịch sử</p>
      </div>
      
      <div v-else class="history-items">
        <div 
          v-for="(song, index) in songHistory" 
          :key="index" 
          class="history-item"
          @click="playSong(song)"
        >
          <div class="song-thumbnail">
            <img :src="song.thumbnail" alt="thumbnail" />
          </div>
          <div class="song-info">
            <p class="song-title text-white">{{ song.title }}</p>
            <p class="song-time text-white">{{ formatTime(song.timestamp) }}</p>
          </div>
          <div>
            <button class="text-gray-400 hover:text-red-500" @click.stop="removeSongFromHistory(song.videoId)">
              <i class="pi pi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import 'primeicons/primeicons.css';
import { useStore } from 'vuex';
import { computed, onMounted, onUnmounted } from 'vue';
import { initFlowbite } from 'flowbite';

export default {
  name: 'SongHistory',
  
  setup() {
    const store = useStore();
    
    // Lấy danh sách lịch sử bài hát từ store
    const songHistory = computed(() => store.getters.getSongHistory);
    
    // Xử lý đóng drawer
    const closeDrawer = () => {
      const drawer = document.getElementById('drawer-history');
      drawer.classList.remove('translate-x-0');
      drawer.classList.add('translate-x-full');
      window.dispatchEvent(new CustomEvent('close-history'));
    };
    const removeSongFromHistory = (videoId) => {
      store.commit('removeSongFromHistory', videoId);
    };
    
    // Lắng nghe sự kiện từ App.vue và SideBar
    onMounted(() => {
      // Khởi tạo Flowbite
      initFlowbite();
      
      // Thêm sự kiện cho nút đóng
      const closeButton = document.querySelector('[data-drawer-hide="drawer-history"]');
      if (closeButton) {
        closeButton.addEventListener('click', closeDrawer);
      }
      
      // Hiển thị drawer khi nhận sự kiện toggle-history
      const handleToggleHistory = (event) => {
        const drawer = document.getElementById('drawer-history');
        if (event.detail.show) {
          drawer.classList.remove('translate-x-full');
          drawer.classList.add('translate-x-0');
        } else {
          drawer.classList.remove('translate-x-0');
          drawer.classList.add('translate-x-full');
        }
      };
      
      window.addEventListener('toggle-history', handleToggleHistory);
    });
    
    onUnmounted(() => {
      // Xóa event listener khi component bị hủy
      const closeButton = document.querySelector('[data-drawer-hide="drawer-history"]');
      if (closeButton) {
        closeButton.removeEventListener('click', closeDrawer);
      }
      window.removeEventListener('toggle-history', null);
    });
    
    // Phát bài hát khi click vào
    const playSong = (song) => {
      // Gửi sự kiện để App.vue xử lý
      window.dispatchEvent(new CustomEvent('play-history-song', { 
        detail: { videoId: song.videoId }
      }));
    };
    
    // Định dạng thời gian
    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
             ' ' + date.toLocaleDateString();
    };
    
    return {
      songHistory,
      playSong,
      formatTime,
      closeDrawer,
      removeSongFromHistory
    };
  }
};
</script>

<style scoped>
/* Style cho drawer lịch sử */
.fixed {
  box-shadow: -5px 0 15px rgba(0, 0, 0, 0.1);
}

/* Style cho danh sách lịch sử */
.history-list {
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.empty-history {
  padding: 15px;
  text-align: center;
  font-style: italic;
  color: #aaa;
}

.history-items {
  padding: 5px 0;
}

.history-item {
  display: flex;
  padding: 8px 15px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s;
  margin-bottom: 5px;
  border-radius: 4px;
}

.history-item:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.song-thumbnail {
  width: 40px;
  height: 40px;
  overflow: hidden;
  border-radius: 4px;
  margin-right: 10px;
  flex-shrink: 0;
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
  font-size: 0.9rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #333;
}

.dark .song-title {
  color: #fff;
}

.song-time {
  font-size: 0.7rem;
  color: #666;
  margin: 3px 0 0;
}

.dark .song-time {
  color: #aaa;
}
</style>
