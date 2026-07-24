<script setup lang="ts">
import PhotoAlbum from '@/components/PhotoAlbum.vue'
</script>

<template>
  <PhotoAlbum api-path="my-galleries" title="我的相册" :class-filterable="false" />
</template>
