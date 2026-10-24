<template>
  <div class="ambient-section"><button type="button" class="section-heading ambient-heading" :aria-expanded="isOpen" @click="isOpen = !isOpen"><i class="ri-rainy-line"></i><h3>Âm thanh thiên nhiên</h3><i :class="isOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"></i></button><p class="field-hint">Pha chút âm thanh cho không gian của bạn.</p>
  <div v-show="isOpen" class="ambient-list"><div v-for="sound in sounds" :key="sound.videoId" class="ambient-row"><button class="icon-button" :class="{ active: sound.volume > 0 }" :aria-label="(sound.volume ? 'Tắt ' : 'Bật ') + sound.title" :aria-pressed="sound.volume > 0" @click="toggle(sound)"><i :class="sound.icon"></i></button><label :for="sound.videoId">{{ sound.title }}</label><input :id="sound.videoId" type="range" min="0" max="100" :value="sound.volume" @input="changeVolume(sound, $event.target.value)" :aria-label="'Âm lượng ' + sound.title" /><span>{{ sound.volume }}%</span><p v-if="sound.error" role="alert" class="inline-error">{{ sound.error }}</p></div></div></div>
  <div ref="players" class="ambient-players" aria-hidden="true"></div>
</template>
<script>
import { createYouTubePlayer } from '../services/youtube-api';
import { PlayerController } from '../services/youtube-player';
export default {
  data: () => ({
    isOpen: false,
    sounds: [
      ['Mưa', 'q76bMs-NwRk', 'ri-rainy-line'], ['Sông, suối', 'IvjMgVS6kng', 'ri-water-flash-line'], ['Thành phố', 'Vg1mpD1BICI', 'ri-building-line'],
      ['Tiếng ồn trắng', 'yLOM8R6lbzg', 'ri-sound-module-line'], ['Lửa', 'CIj-ZDSjZ2E', 'ri-fire-line'], ['Sóng biển', 'bn9F19Hi1Lk', 'ri-sailboat-line']
    ].map(([title, videoId, icon]) => ({ title, videoId, icon, volume: 0, oldVolume: 50, error: '' }))
  }),
  created() { this.controllers = new Map(); },
  beforeUnmount() { for (const controller of this.controllers.values()) controller.destroy(); this.controllers.clear(); },
  methods: {
    changeVolume(sound, value) {
      sound.volume = Math.max(0, Math.min(100, Number(value) || 0));
      let controller = this.controllers.get(sound.videoId);
      if (!controller && sound.volume > 0) {
        sound.error = '';
        const root = document.createElement('div');
        this.$refs.players.appendChild(root);
        controller = new PlayerController({
          create: createYouTubePlayer, root,
          shouldPlay: () => sound.volume > 0,
          onEnd: () => {
            if (sound.volume > 0) controller.seek(0).then(() => controller.player && controller.player.playVideo()).catch(() => {});
          },
          onError: message => {
            sound.error = message;
            sound.volume = 0;
            controller.destroy();
            root.remove();
            this.controllers.delete(sound.videoId);
          }
        });
        this.controllers.set(sound.videoId, controller);
        controller.load(sound.videoId, sound.volume);
      }
      if (controller) {
        controller.setVolume(sound.volume).catch(() => { sound.error = 'Không thể đổi âm lượng.'; });
        if (controller.ready) {
          const action = sound.volume > 0 ? controller.player.playVideo() : controller.player.pauseVideo();
          action.catch(() => { sound.error = 'Không thể điều khiển âm thanh.'; });
        }
      }
    },
    toggle(sound) {
      if (sound.volume > 0) { sound.oldVolume = sound.volume; this.changeVolume(sound, 0); }
      else this.changeVolume(sound, sound.oldVolume);
    }
  }
};
</script>
