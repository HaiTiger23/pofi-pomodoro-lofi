<template >
  <button
    type="button" 
    @click="isOpenDrop = !isOpenDrop"
    class="flex items-center w-full p-2 text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
  >
    <i class="ri-time-line"></i>
    <span class="flex-1 ml-3 text-left whitespace-nowrap" sidebar-toggle-item
      >Sound</span
    >
    <i :class="{'ri-arrow-down-s-line':!isOpenDrop, 
                'ri-arrow-up-s-line':isOpenDrop, 
                ' font-bold text-[20px]':true}"></i>
  </button>
  <ul v-if="isAllSoundReady" id="dropdown-sound"  :class="{'hidden':!isOpenDrop, 'py-2 space-y-2':true}">
    <li v-for="sound in listSound" :key="sound.videoID">
      <label
        for="helper-text"
        class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >{{ sound.title }}</label
      >
      <div class="flex">
        <i @click="muteVolume(sound)" :class="{'ri-volume-up-line':sound.volume > 50,'ri-volume-down-line':sound.volume < 50,'ri-volume-mute-line':sound.volume == 0 ,'text-white  p-1 cursor-pointer transition-all duration-100 ease-linear':true}"></i>
        <input
        v-on:change="changeVolume($event, sound)"
        type="range"
        v-model="sound.volume"
        
        max="100"
        min="0"
        :id="sound.videoID"
        aria-describedby="helper-text-explanation"
        class="w-full"
      />
      </div>
    </li>
  </ul>
  <div class="hidden" id="iframeSound"></div>
</template>

<script>
import YouTubePlayer from "youtube-player";
export default {
  data() {
    return {
      listSound: [
        {
          title: "Mưa",
          videoID: "q76bMs-NwRk",
        },
        {
          title: "Sông, suối",
          videoID: "IvjMgVS6kng",
        },
        {
          title: "Thành phố",
          videoID: "Vg1mpD1BICI",
        },
        {
          title: "Tiếng ồn trắng",
          videoID: "yLOM8R6lbzg",
        },
        {
          title: "Lửa",
          videoID: "CIj-ZDSjZ2E",
        },
        {
          title: "Sóng biển",
          videoID: "bn9F19Hi1Lk",
        },
      ],
      iframeSound: null,
      listDropSound: null,
      isAllSoundReady: false,
      isOpenDrop: false,
    };
  },
  mounted() {
    this.iframeSound = document.getElementById("iframeSound");

    this.listSound.forEach((e) => {
      this.initPlayer(e);
    });
    this.isAllSoundReady = true;
  },
  methods: {
    initPlayer(sound) {
      let divPlayer = document.createElement("div");
      this.iframeSound.appendChild(divPlayer);

      let player = YouTubePlayer(divPlayer, {
        videoId: sound.videoID,
        width: "100%",
        height: "100%",
        playerVars: {},
      });
      
      sound.player = player;
      sound.player.on("stateChange", (event) => {
        if (event.data === 0) {
        player.seekTo(0); 
        player.playVideo(); 
      }
      })
      sound.player.on("ready", () => {
        sound.player.playVideo();
        sound.player.setVolume(0);
        sound.volume = 0;
      });
    },
    changeVolume(event, sound) {
      let value = event.target.value;
      sound.volume = value;
      sound.player.setVolume(value);
    },
    muteVolume(sound) {
      if(sound.volume == 0) {
        sound.volume = 50
        sound.player.setVolume(sound.volume);
      }else {
        sound.volume = 0
        sound.player.setVolume(sound.volume);
      }
    }
  },
};
</script>

<style lang="scss" scoped></style>
