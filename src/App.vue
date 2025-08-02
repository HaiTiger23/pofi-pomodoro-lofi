<template>
  <!-- Player Container - Đặt cố định và ẩn ban đầu -->
  <div id="playerContainer" class="hidden" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 0;">
    <div ref="playerContainer" style="width: 100%; height: 100%;"></div>
  </div>
  
  <!-- Main App Container -->
  <div :class="{
    'relative bg-yellow-50 overflow-hidden h-screen w-screen': true, 
    'cursor-progress': !videoStatus
  }">
    <!-- Nền ảnh - Chỉ hiển thị khi không ở chế độ xem video -->
    <img
      v-if="!showVideoAsBackground"
      :src="`https://i3.ytimg.com/vi/${current_music.videoId}/hqdefault.jpg`"
      class="w-full h-full brightness-50 object-cover"
      alt=""
    />
    
    <!-- Overlay với hiệu ứng mờ và nền trong suốt -->
    <div
      :class="{
        'absolute top-0 h-screen w-full': true,
        'bg-gray-300 bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-10': !showVideoAsBackground,
        'bg-black bg-opacity-30': showVideoAsBackground
      }"
      style="z-index: 1;"
    >
      <div class="flex flex-col justify-between h-full relative">
        <div class="flex justify-end" :style="{ opacity: showVideoAsBackground ? 0 : 1 }">
          <button
            class="text-white text-sm px-5 py-2.5 -mr-2 mb-2"
            type="button"
            @click="toggleTodo"
            title="Danh sách công việc"
          >
            <i class="ri-task-line"></i>
          </button>
          <button
            class="text-white text-sm px-5 py-2.5 -mr-2 mb-2"
            type="button"
            @click="toggleFavorites"
            title="Bài hát yêu thích"
          >
            <i class="ri-heart-line"></i>
          </button>
          <button
            class="text-white text-sm px-5 py-2.5 -mr-2 mb-2"
            type="button"
            @click="toggleHistory"
            title="Lịch sử bài hát"
          >
            <i class="ri-history-line"></i>
          </button>
          <SideBar></SideBar>
        </div>
        <SongHistory :style="{ opacity: showVideoAsBackground ? 0 : 1 }"></SongHistory>
        <SongFavorites :style="{ opacity: showVideoAsBackground ? 0 : 1 }"></SongFavorites>
        <TodoList :style="{ opacity: showVideoAsBackground ? 0 : 1 }"></TodoList>
        <!-- Pomodoro -->
        <PomoDoro :style="{ opacity: showVideoAsBackground ? 0.3 : 1 }" :pauseVideo="pauseVideo"></PomoDoro>
        <!-- Music Play -->
        <div class="w-full min-h-[30%] px-5">
          <div class="text-white">
            <div class="flex justify-between" :style="{ opacity: showVideoAsBackground ? 0 : 1 }">
              <div
                :class="{
                  'w-[400px]': isSearch,
                  'w-[50px]': !isSearch,
                  'relative border flex justify-between h-[40px] transition-all ease-in-out duration-200': true,
                }"
              >
                <ListVideos
                  class="absolute bottom-[100%]"
                  :list="list_search"
                  v-if="showListSearch"
                  @get-video-event="handleVideo"
                ></ListVideos>
                <input
                  type="text"
                  id="search_input"
                  v-on:keydown="Search"
                  :class="{
                    'bg-transparent w-[90%] transition-all ease-in-out duration-200 outline-0 border-0 focus:outline-0 focus:shadow-none': true,
                    block: isSearch,
                    hidden: !isSearch,
                  }"
                  placeholder="Nhập link youtube hoặc từ khoá tìm kiếm"
                  v-model="input_search"
                />
                <div
                  :class="{
                    'flex justify-center items-center cursor-pointer': true,
                    'w-[10%]': isSearch,
                    'w-full': !isSearch,
                  }"
                  v-on:click="Togglesearch"
                >
                  <i
                    :class="{
                      'ri-search-line': !isSearch,
                      'ri-close-line': isSearch,
                    }"
                  ></i>
                </div>
              </div>
            </div>
            <p class="">
              {{ current_music.title }}
            </p>
            <input
              :max="current_music.duration"
              :disabled="!videoStatus"
              id="default-range"
              type="range"
              v-on:change="changeCurrentTime"
              v-on:mousedown="pauseRange"
              @mouseup="resumeRange"
              v-model="range"
              class="w-full h-2"
            />
            <div class="flex justify-between">
              <p>{{ fomartDuration(current_music.currentTime) }}</p>
              <p>{{ fomartDuration(current_music.duration) }}</p>
            </div>
            <div class="flex justify-center w-full relative">
              <div
                class="flex justify-around items-center w-[80%] md:w-[40%] text-[20px]"
              >
                <!-- Các nút điều khiển sẽ bị ẩn khi ở chế độ xem video -->
                <div >
                  <i
                    class="ri-replay-10-fill cursor-pointer"
                    v-on:click="replayForward(-10)"
                    title="Lùi 10 giây"
                  ></i>
                </div>
                <div >
                  <i
                    :class="{
                      'ri-play-circle-line': !videoStatusRun,
                      'ri-pause-circle-line': videoStatusRun,
                      'cursor-pointer': true
                    }"
                    v-on:click="playVideo"
                    :title="videoStatusRun ? 'Tạm dừng' : 'Phát'"
                  ></i>
                </div>
                <div >
                  <i
                    class="ri-forward-10-fill cursor-pointer"
                    v-on:click="replayForward(10)"
                    title="Tới 10 giây"
                  ></i>
                </div>
                <div
                  
                  class="relative"
                  @mouseover="isShowVolume = true"
                  @mouseout="isShowVolume = false"
                >
                  <i 
                    :class="{
                      'ri-volume-up-line': volume > 50,
                      'ri-volume-down-line': volume < 50 && volume > 0,
                      'ri-volume-mute-line': volume == 0,
                      'cursor-pointer': true
                    }" 
                    @click="muteVolume"
                    :title="volume > 0 ? 'Tắt tiếng' : 'Bật tiếng'"
                  ></i>
                  <input
                    :class="{
                      'w-[0px] opacity-0 delay-300': !isShowVolume,
                      'left-[20px] opacity-100 w-[100px]': isShowVolume,
                      'absolute top-[50%] translate-y-[-50%] transition-all duration-200 ease-linear': true,
                    }"
                    type="range"
                    v-model="volume"
                  />
                </div>
                <!-- Nút chuyển đổi chế độ xem video - luôn hiển thị -->
                <div class="ml-2 relative group">
                  <i 
                    :class="{
                      'ri-picture-in-picture-line': !showVideoAsBackground,
                      'ri-picture-in-picture-fill': showVideoAsBackground,
                      'cursor-pointer text-white hover:text-gray-200': true,
                      'text-yellow-400': showVideoAsBackground
                    }"
                    @click="toggleVideoBackground"
                    :title="showVideoAsBackground ? 'Ẩn video' : 'Hiện video'"
                  ></i>
                  <span class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black bg-opacity-70 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ showVideoAsBackground ? 'Ẩn video' : 'Hiện video' }}
                  </span>
                </div>
                <i :class="{'ri-heart-fill text-red-500': isFavorite(current_music.videoId), 'ri-heart-line': !isFavorite(current_music.videoId)}" @click="toggleFavoriteSong"></i>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import YouTubePlayer from "youtube-player";
import PomoDoro from "./components/PomoDoro.vue";
import ListVideos from "./components/ListVideos.vue";
import search from "./assets/js/search.js";
import SideBar from "./components/SideBar.vue";
import SongHistory from "./components/History.vue";
import SongFavorites from "./components/Favorites.vue";
import TodoList from "./components/toDoList.vue";
import { useStore } from "vuex";
export default {
  name: "App",
  components: {
    ListVideos,
    SideBar,
    PomoDoro,
    SongHistory,
    SongFavorites,
    TodoList,
  },

  mounted() {
    this.store = useStore();
    let latestSong =  localStorage.getItem('latestSong');
    if(latestSong == null) {
      latestSong = 'DnewVhYNt-I';
    }
    this.current_music.videoId = latestSong;
    this.initPlayer(this.current_music.videoId);
    
    // Lắng nghe sự kiện phát bài hát từ lịch sử
    window.addEventListener('play-history-song', this.handleHistorySong);
    // Lắng nghe sự kiện đóng lịch sử
    window.addEventListener('close-history', this.handleCloseHistory);
    // Lắng nghe sự kiện click vào bài hát trong danh sách yêu thích
    window.addEventListener('play-favorite-song', this.handleFavoriteSong);
    // Lắng nghe sự kiện đóng danh sách yêu thích
    window.addEventListener('favorites-closed', this.handleCloseFavorites);
    // Lắng nghe sự kiện đóng danh sách công việc
    window.addEventListener('todo-closed', this.handleCloseTodo);
    // Lắng nghe sự kiện khi API key YouTube thay đổi
    window.addEventListener('youtube-api-key-updated', this.handleApiKeyUpdated);
  },
  
  beforeUnmount() {
    cancelAnimationFrame(this.rangeFrameID);
    // Xóa event listener khi component bị hủy
    window.removeEventListener('play-history-song', this.handleHistorySong);
    window.removeEventListener('close-history', this.handleCloseHistory);
    window.removeEventListener('play-favorite-song', this.handleFavoriteSong);
    window.removeEventListener('favorites-closed', this.handleCloseFavorites);
    window.removeEventListener('todo-closed', this.handleCloseTodo);
    window.removeEventListener('youtube-api-key-updated', this.handleApiKeyUpdated);
  },


  data() {
    return {
      isSearch: false,
      input_search: "",
      list_search: [],
      showListSearch: false,
      showVideoAsBackground: false,
      videoStatusRun: false,
      videoStatus: false,
      showHistory: false, // Trạng thái hiển thị lịch sử bài hát
      showFavorites: false, // Trạng thái hiển thị danh sách bài hát yêu thích
      showTodo: false, // Trạng thái hiển thị danh sách công việc
      current_music: {
        title: "",
        videoId: "ukHK1GVyr0I",
        duration: "",
        currentTime: "",
        rangeFrameID: null,
      },
      range: 0,
      isShowVolume: false,
      volume: 100,
      oldVolume: 100,
    };
  },
  watch: {
    volume(newValue) {
      this.player.setVolume(newValue);
    },
  },
  methods: {
    toggleVideoBackground() {
    this.showVideoAsBackground = !this.showVideoAsBackground;
    if (this.player) {
      const playerElement = document.getElementById('playerContainer');
      if (playerElement) {
        if (this.showVideoAsBackground) {
          // Chuyển sang chế độ xem video
          playerElement.style.zIndex = '1';
          playerElement.classList.remove('hidden');
          
          // Đặt kích thước và tiếp tục phát video
          this.player.setSize(window.innerWidth, window.innerHeight);
          this.player.unMute();
          
          // Đảm bảo video đang phát
          this.player.getPlayerState().then(state => {
            if (state !== 1) { // 1 = PLAYING
              this.player.playVideo();
            }
            this.videoStatusRun = true;
          });
        } else {
          // Chuyển về chế độ ẩn video
          playerElement.style.zIndex = '0';
          // Không dừng video, chỉ ẩn đi
        }
      }
    }
  },
    Togglesearch() {
      if (this.showListSearch && this.isSearch) {
        this.showListSearch = false;
      }
      this.isSearch = !this.isSearch;
    },
    Search(event) {
      if (event.key == "Enter") {
        let videoId = null;
        const youtubeUrlPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
        const match = this.input_search.match(youtubeUrlPattern);

        if (match) {
          // Nếu là URL YouTube, lấy videoId từ URL
          videoId = match[1];
        }

        if (videoId) {
          // Phát nhạc ngay lập tức nếu là URL YouTube
          this.current_music.videoId = videoId;
          this.initPlayer(this.current_music.videoId);
        } else {
          // Kiểm tra API key
          const apiKey = localStorage.getItem('youtube_api_key') || "";
          if (!apiKey) {
            alert("Vui lòng nhập API key YouTube để thực hiện tìm kiếm.");
            return;
          }

          // Thực hiện tìm kiếm nếu không phải URL YouTube
          search(
            {
              apiKey: apiKey,
              term: this.input_search,
            },
            (reponse) => {
              this.list_search = reponse;
              this.showListSearch = true;
            }
          );
        }
        this.input_search = "";
      }
    },
    handleVideo(data) {
      this.initPlayer(data.id.videoId);
    },
    async initPlayer(videoId) {
       this.current_music.title = "Đang tải video, chờ xíu nhaaa...";
      this.videoStatusRun = false;
      this.videoStatus = false;
      
      // Xóa video cũ nếu có
      if (this.player) {
        await this.player.destroy();
        this.player = null;
      }
      
      this.current_music.videoId = videoId;
      localStorage.setItem('latestSong', videoId);
      
      // Tạo container mới cho player
      const playerContainer = document.getElementById('playerContainer');
      if (playerContainer) {
        playerContainer.innerHTML = ''; // Xóa nội dung cũ
        const newPlayerDiv = document.createElement('div');
        newPlayerDiv.id = 'youtube-player';
        playerContainer.appendChild(newPlayerDiv);
      }
      
      // Khởi tạo player mới
      this.player = YouTubePlayer('youtube-player', {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          playsinline: 1
        },
      });
     
      this.player.on('ready', () => {
        this.videoStatus = true;
        this.setTitle();
        this.player.setVolume(this.volume);
        
        // Đặt kích thước ban đầu
        this.player.setSize(window.innerWidth, window.innerHeight);
        
        
        
        // Thêm bài hát vào lịch sử
        this.addSongToHistory();
        
        // Lấy thời lượng video
        this.player.getDuration().then((duration) => {
          this.current_music.duration = duration;
        });
        
        this.playVideo();
        // Xử lý sự kiện khi video kết thúc
        this.player.on('stateChange', (event) => {
          if (event.data === 0) { // Video kết thúc
            // this.player.seekTo(0);
            const randomVideoId = this.getRandomVideoId();
            this.initPlayer(randomVideoId);
            // if (this.showVideoAsBackground) {
            //   this.player.playVideo();
            // }
          }
        });
      });

      // this.videoStatusRun = true;
    },
    getRandomVideoId() {
      const videoFavouriteIds = this.$store.getters.getFavoriteSongs.map(song => song.videoId);
      const videoHistoryIds = this.$store.getters.getSongHistory.map(song => song.videoId);
      const allVideoIds = [...new Set([...videoFavouriteIds, ...videoHistoryIds])];
      console.log("All video IDs:", allVideoIds);
      
      if (allVideoIds.length === 0) {
        return 'ukHK1GVyr0I'; // Trả về video mặc định nếu không có video nào
      }
      // Lấy ngẫu nhiên một video từ danh sách
      return allVideoIds[Math.floor(Math.random() * allVideoIds.length)];

    },
    updateRange() {
      this.rangeFrameID = setInterval(() => {
        this.player.getCurrentTime().then((currentTime) => {
        this.current_music.currentTime = Math.ceil(currentTime);
        this.range = this.current_music.currentTime;
      });
      },500)
    },
    pauseRange() {
      clearInterval(this.rangeFrameID)
    },
    resumeRange() {
      this.rangeFrameID = null;
      this.updateRange()
    },
    playVideo() {
      console.log("playVideo called, videoStatus:", this.videoStatus, "videoStatusRun:", this.videoStatusRun);
      if (this.videoStatus) {
        this.videoStatusRun = !this.videoStatusRun;
        if (this.videoStatusRun) {
          this.player.playVideo();
          this.rangeFrameID = null;
          this.updateRange()
        } else {
          this.player.pauseVideo();
          clearInterval(this.rangeFrameID);
        }
      }
    },
    fomartDuration(seconds = 0) {
      
      let result = "";
      if (seconds >= 3600) {
        let hour = Math.floor(seconds / 3600);
        if (hour > 0) {
          if (hour < 10) {
            result += "0" + hour + ":";
          } else {
            result += hour + ":";
          }
        }
        seconds = seconds - hour * 3600;
      }
      let minute = Math.floor(seconds / 60);
      if (minute < 10) {
        result += "0" + minute + ":";
      } else {
        result += minute + ":";
      }
      seconds = seconds - minute * 60;

      if (seconds < 10) {
        result += "0" + seconds;
      } else {
        result += seconds;
      }
      return result;
    },
    changeCurrentTime(e) {
      this.range = e.target.value;
      this.player.seekTo(this.range);
    },
    replayForward(time) {
      let current = this.range;
      if (this.player) {
        if (current + time < 0) {
          current = 0;
        } else if (current + time > this.current_music.duration) {
          current = this.current_music.duration;
        } else {
          current = current + time;
        }
        this.player.seekTo(current);
      }
    },
    setTitle() {
      let ContainerPlayer = document.getElementById("playerContainer");
      let iframePlayer = ContainerPlayer.firstChild;
      this.current_music.title = iframePlayer.title;
    },
    
    // Thêm bài hát vào lịch sử
    addSongToHistory() {
      // Tạo đối tượng bài hát để lưu vào lịch sử
      const song = {
        videoId: this.current_music.videoId,
        title: this.current_music.title || 'Unknown Title',
        channelTitle: 'YouTube',
        thumbnail: `https://i3.ytimg.com/vi/${this.current_music.videoId}/hqdefault.jpg`,
        timestamp: new Date().toISOString()
      };
      
      // Gọi mutation để thêm vào lịch sử
      this.store.commit('addToHistory', song);
      
      // Cập nhật thông tin bài hát hiện tại để hiển thị đúng
      this.current_music.title = song.title;
      this.current_music.channelTitle = song.channelTitle;
      this.current_music.thumbnail = song.thumbnail;
    },
    
    // Xử lý sự kiện khi click vào bài hát trong lịch sử
    handleHistorySong(event) {
      const { videoId } = event.detail;
      if (videoId) {
        this.initPlayer(videoId);
      }
    },
    
    // Bật/tắt hiển thị lịch sử bài hát
    toggleHistory() {
      this.showHistory = !this.showHistory;
      // Nếu đang mở danh sách yêu thích hoặc todo, đóng lại
      if (this.showFavorites) {
        this.showFavorites = false;
        window.dispatchEvent(new CustomEvent('toggle-favorites', { 
          detail: { show: false }
        }));
      }
      if (this.showTodo) {
        this.showTodo = false;
        window.dispatchEvent(new CustomEvent('toggle-todo', { 
          detail: { show: false }
        }));
      }
      // Phát sự kiện để thông báo cho component History
      window.dispatchEvent(new CustomEvent('toggle-history', { 
        detail: { show: this.showHistory }
      }));
    },
    
    // Xử lý sự kiện đóng lịch sử
    handleCloseHistory() {
      this.showHistory = false;
      // Thông báo cho SideBar biết lịch sử đã đóng
      if (this.$refs.sidebar) {
        this.$refs.sidebar.handleCloseHistory();
      }
    },
    
    // Bật/tắt hiển thị danh sách bài hát yêu thích
    toggleFavorites() {
      this.showFavorites = !this.showFavorites;
      // Nếu đang mở lịch sử hoặc todo, đóng lại
      if (this.showHistory) {
        this.showHistory = false;
        window.dispatchEvent(new CustomEvent('toggle-history', { 
          detail: { show: false }
        }));
      }
      if (this.showTodo) {
        this.showTodo = false;
        window.dispatchEvent(new CustomEvent('toggle-todo', { 
          detail: { show: false }
        }));
      }
      // Phát sự kiện để thông báo cho component Favorites
      window.dispatchEvent(new CustomEvent('toggle-favorites', { 
        detail: { show: this.showFavorites }
      }));
    },
    
    // Xử lý sự kiện đóng danh sách yêu thích
    handleCloseFavorites() {
      this.showFavorites = false;
    },
    
    // Xử lý sự kiện khi click vào bài hát trong danh sách yêu thích
    handleFavoriteSong(event) {
      const song = event.detail.song;
      this.initPlayer(song.videoId);
    },
    
    // Thêm/xóa bài hát hiện tại vào/khỏi danh sách yêu thích
    toggleFavoriteSong() {
      if (this.current_music.videoId) {
        // Tạo đối tượng bài hát đầy đủ thông tin
        const song = {
          videoId: this.current_music.videoId,
          title: this.current_music.title || 'Unknown Title',
          channelTitle: 'YouTube',
          thumbnail: `https://i3.ytimg.com/vi/${this.current_music.videoId}/hqdefault.jpg`
        };
        this.$store.commit('toggleFavorite', song);
      }
    },
    
    // Kiểm tra xem bài hát có trong danh sách yêu thích không
    isFavorite(videoId) {
      return this.$store.getters.isFavorite(videoId);
    },
    
    // Bật/tắt hiển thị danh sách công việc
    toggleTodo() {
      this.showTodo = !this.showTodo;
      // Nếu đang mở danh sách yêu thích hoặc lịch sử, đóng lại
      if (this.showFavorites) {
        this.showFavorites = false;
        window.dispatchEvent(new CustomEvent('toggle-favorites', { 
          detail: { show: false }
        }));
      }
      if (this.showHistory) {
        this.showHistory = false;
        window.dispatchEvent(new CustomEvent('toggle-history', { 
          detail: { show: false }
        }));
      }
      // Phát sự kiện để thông báo cho component TodoList
      window.dispatchEvent(new CustomEvent('toggle-todo', { 
        detail: { show: this.showTodo }
      }));
    },
    
    // Xử lý sự kiện đóng danh sách công việc
    handleCloseTodo() {
      this.showTodo = false;
    },
    
    handleApiKeyUpdated(event) {
      console.log('YouTube API key đã được cập nhật:', event.detail.apiKey);
      // Không cần làm gì thêm vì phương thức Search sẽ lấy API key mới từ localStorage
    },
    muteVolume() {
      if (this.volume != 0) {
        this.oldVolume = this.volume;
        this.volume = 0;
      } else {
        this.volume = this.oldVolume;
      }
    },
    pauseVideo() {
      if (this.videoStatus && this.videoStatusRun) {
        this.videoStatusRun = false;
        this.player.pauseVideo();
        clearInterval(this.rangeFrameID);
      }
    },
  },
};
</script>

<style>
#search_input:focus {
  border-color: inherit !important;
  -webkit-box-shadow: none !important;
  box-shadow: none !important;
}
</style>
