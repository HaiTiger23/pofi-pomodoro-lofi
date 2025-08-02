<template>
  <div class="w-full h-full flex items-center flex-col mt-10">
    <p class="text-white">{{ titleHeader }}</p>
    <p
      :class="{
        'font-bold text-[80px] lg:text-[120px] mb-5 drop-shadow-lg': true,
        'text-white': status == 'ready',
        'text-red-400': status == 'running',
        'text-yellow-300': status == 'pause',
        'text-green-500': status == 'break',
      }"
    >
      {{ printNumber(minutes) + ":" + printNumber(seconds) }}
    </p>
    <div class="w-[200px] flex justify-around">
      <button
        type="button"
        class="inline-block rounded border-2 border-green-50 px-6 pb-[6px] pt-2 text-xs font-medium uppercase leading-normal text-green-50 transition duration-150 ease-in-out hover:border-green-100 hover:bg-green-500 hover:bg-opacity-10 hover:text-green-100 focus:border-green-100 focus:text-green-100 focus:outline-none focus:ring-0 active:border-green-200 active:text-green-200 dark:hover:bg-green-100 dark:hover:bg-opacity-10"
        data-te-ripple-init
        v-on:click="startTime"
      >
        {{ TitleLeftBtn }}
      </button>
      <button
        type="button"
        :class="{
          'inline-block rounded border-2 border-red-50 px-6 pb-[6px] pt-2 text-xs font-medium uppercase leading-normal  transition duration-150 ease-in-out': true,
          'text-red-50 hover:border-red-100 hover:bg-red-500 hover:bg-opacity-10 hover:text-red-100 focus:border-red-100 focus:text-red-100 focus:outline-none focus:ring-0 active:border-red-200 active:text-red-200 dark:hover:bg-red-100 dark:hover:bg-opacity-10':
            status != 'ready',
          'cursor-not-allowed text-black': status == 'ready',
        }"
        data-te-ripple-init
        v-on:click="stopTime"
        :disabled="status == 'ready'"
      >
        {{ TitleRightBtn }}
      </button>
    </div>
  </div>
</template>

<script>
import { computed, watch } from "vue";
import { useStore } from "vuex";
export default {
  props: {
    pauseVideo: Function
  },
  data() {
    return {
      status: "ready",
      minutes: null,
      seconds: 0,
      tichtac: 100,
      titleHeader: "Welcome to Pofi",
      TitleLeftBtn: "Start",
      TitleRightBtn: "Stop",
      time: "work",
      interval: null,
      store: useStore(),
    };
  },
  mounted() {
    const duration = computed(() => this.store.getters.getDuration);
    this.minutes = duration.value;
    watch(duration, (newDuration) => {
      if (this.status == "ready") {
        this.minutes = newDuration;
      }
    });
  },
  methods: {
    resumePomodoroTimer() {
      if (this.status === 'pause') {
        this.status = 'running';
        this.runTime();
        this.TitleLeftBtn = 'Tạm dừng';
      }
    },
    startTime() {
      if (this.status != "break") {
        if (this.status == "ready") {
          this.status = "running";
          this.TitleLeftBtn = "Pause";
          this.titleHeader = "Focus on your work";
          
          // Bắt đầu bộ đếm thời gian trong main process
          window.electronAPI.startPomodoroTimer(this.minutes, this.seconds, false);
          
          // Vẫn giữ bộ đếm thời gian trong renderer process để cập nhật giao diện
          this.interval = setInterval(() => {
            this.runTime();
          }, 10);
        } else if (this.status == "running") {
          this.status = "pause";
          this.TitleLeftBtn = "Resume";
          this.titleHeader = "Don't pause for too long";
          
          // Tạm dừng bộ đếm thời gian trong main process
          window.electronAPI.pausePomodoroTimer();
          
          clearInterval(this.interval);
        } else if (this.status == "pause") {
          this.status = "running";
          this.TitleLeftBtn = "Pause";
          this.titleHeader = "Focus on your work";
          
          // Tiếp tục bộ đếm thời gian trong main process
          window.electronAPI.resumePomodoroTimer();
          
          this.interval = setInterval(() => {
            this.runTime();
          }, 10);
        }
      } else {
        this.timeOut();
      }
      
      // Định kỳ đồng bộ thời gian với main process
      this.syncTimerWithMainProcess();
    },
    
    // Đồng bộ thời gian với main process
    async syncTimerWithMainProcess() {
      if (this.status === "running") {
        // Mỗi 5 giây, kiểm tra và đồng bộ thời gian với main process
        this.syncInterval = setInterval(async () => {
          const timerStatus = await window.electronAPI.getPomodoroTimerStatus();
          if (timerStatus && this.status === "running") {
            // Chỉ cập nhật nếu có sự khác biệt đáng kể
            if (Math.abs(this.minutes - timerStatus.minutes) > 0 || 
                Math.abs(this.seconds - timerStatus.seconds) > 5) {
              this.minutes = timerStatus.minutes;
              this.seconds = timerStatus.seconds;
              this.updateDockBadge();
            }
          }
        }, 5000);
      } else if (this.syncInterval) {
        clearInterval(this.syncInterval);
      }
    },
    runTime() {
      if (this.tichtac == 0) {
        if (this.minutes == 0 && this.seconds == 0) {
          this.timeOut();
        } else if (this.seconds == 0) {
          this.minutes--;
          this.seconds = 59;
        } else {
          this.seconds--;
        }
        this.tichtac = 100
        
        // Cập nhật badge trên dock macOS chỉ khi phút thay đổi hoặc khi giây = 0
        if (this.seconds === 0 || this.seconds === 59 || this.seconds === 58) {
          this.updateDockBadge();
        }
      }else {
        this.tichtac--;
      }
    },
    stopTime() {
      if (this.status != "ready") {
        this.titleHeader = "Welcome to Pofi";
        clearInterval(this.interval);
        
        // Dừng bộ đếm thời gian trong main process
        window.electronAPI.stopPomodoroTimer();
        
        // Dừng đồng bộ thời gian
        if (this.syncInterval) {
          clearInterval(this.syncInterval);
        }
        
        this.minutes = computed(() => this.store.getters.getDuration).value;
        this.seconds = 0;
        this.status = "ready";
        this.TitleLeftBtn = "Start";
        
        // Xóa badge khi dừng Pomodoro
        window.electronAPI.updateDockBadge('');
      }
    },

    timeOut() {
      if (this.status == "running") {
        // Kết thúc thời gian làm việc
        this.status = "break";
        this.TitleLeftBtn = "Skip";
        this.titleHeader = "Take a break!";
        clearInterval(this.interval);
        
        // Dừng bộ đếm thời gian cũ trong main process
        window.electronAPI.stopPomodoroTimer();
        
        this.minutes = computed(() => this.store.getters.getBreakDuration).value;
        this.seconds = 0;
        
        // Bắt đầu bộ đếm thời gian mới trong main process cho thời gian nghỉ
        window.electronAPI.startPomodoroTimer(this.minutes, this.seconds, true);
        
        this.interval = setInterval(() => {
          this.runTime();
        }, 10);
        
        // Đồng bộ thời gian với main process
        this.syncTimerWithMainProcess();
        
        this.sendMessageToMain(
          "Pofi",
          "Đã hết thời gian làm việc, hãy nghỉ ngơi",
          "info"
        );
      } else if (this.status == "break") {
        // Kết thúc thời gian nghỉ
        this.stopTime();
        this.sendMessageToMain(
          "Pofi",
          "Đã hết thời gian nghỉ, hãy bắt đầu làm việc",
          "info"
        );
      }
    },
    printNumber(number) {
      if (number >= 10) {
        return number;
      }
      return "0" + number;
    },
    getFinishTime() {
      let currentTime = new Date();
      let addTime = new Date(
        currentTime.getTime() + this.minutes * 60 * 1000 + this.seconds * 1000
      );
      return addTime.getHours() + ":" + addTime.getMinutes();
    },
    sendMessageToMain(title, content, type) {
      if (window.electronAPI) {
        window.electronAPI.sendNotification({
          title,
          content,
          type,
        });
      }
    },
    
    // Cập nhật badge trên dock macOS
    updateDockBadge() {
      if (window.electronAPI && this.status !== 'ready') {
        // Chỉ hiển thị số phút với dấu "m" ở cuối
        const timeText = this.printNumber(this.minutes +1) + 'm';
        // Truyền thông tin về trạng thái nghỉ ngơi
        const isBreak = this.status === 'break';
        window.electronAPI.updateDockBadge(timeText, isBreak);
      }
    },
    
  },
};
</script>

<style lang="scss" scoped></style>
