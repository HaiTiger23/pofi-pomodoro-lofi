<template>
  <div class="w-full bg-white h-[250px] bg-opacity-50 overflow-auto">
    <div
      class="flex max-h-[100px] border-b-[1px] p-1 cursor-pointer"
      v-for="item in list"
      @click="$emit('getVideoEvent',item)"
      :key="item.id.videoId"
    >
      <img
        :src="item.snippet.thumbnails.high.url"
        class="w-[40%] border"
        alt=""
      />
      <div>
        <p class="name">{{ item.snippet.title }}</p>
        <p class="text-slate-600">{{ item.snippet.channelTitle }}</p>
      </div>
    </div>
  </div>
</template>

<script>

export default {
    name: "ListVideo",
    props: ['list'],
    setup() {
        
       
        return {
           
        }
    },
    mounted() {

    },

}
</script>

<style lang="css" scoped>
.name {
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2; /* number of lines to show */
  line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
