<script setup lang="ts">
import PhotoAlbum from '@/components/PhotoAlbum.vue'
</script>

<template>
  <PhotoAlbum api-path="class-activities" title="班级活动" :class-filterable="true" />
</template>
