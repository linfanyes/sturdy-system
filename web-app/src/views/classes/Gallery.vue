<script setup lang="ts">
import PhotoAlbum from '@/components/PhotoAlbum.vue'
</script>

<template>
  <PhotoAlbum api-path="class-galleries" title="班级风采" :class-filterable="true" />
</template>
