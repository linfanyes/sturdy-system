<script setup lang="ts">
/**
 * 学科工具二级页 —— 展示"学科工具"下的学科列表
 * 由 shared/schemas/subject-schema 的 SUBJECT_LIST 驱动。
 */
import { useRouter } from 'vue-router'
import { SUBJECT_LIST } from '@gardener/shared/schemas/subject-schema'

const router = useRouter()

function go(subject: string) {
  router.push(`/teacher/subject-tools/${subject}`)
}
</script>

<template>
  <div class="subject-list">
    <h2>学科列表</h2>
    <p class="subtitle">共 {{ SUBJECT_LIST.length }} 个学科 · 由 shared schema 驱动</p>
    <div class="list">
      <div
        v-for="s in SUBJECT_LIST"
        :key="s.subject"
        class="item"
        @click="go(s.subject)"
      >
        <span class="icon" :style="{ color: s.color }">{{ s.icon }}</span>
        <span class="info">
          <span class="name">{{ s.subject }}</span>
          <span class="desc">{{ s.desc }}</span>
        </span>
        <span class="arrow">&rsaquo;</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subject-list { padding: 20px; }
.subject-list h2 { margin: 0 0 4px; font-size: 18px; }
.subtitle { margin: 0 0 16px; color: #999; font-size: 13px; }
.list { display: flex; flex-direction: column; gap: 6px; }
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #e0d5c4;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color .2s;
}
.item:hover { border-color: #e6a23c; }
.icon { font-size: 22px; }
.info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.name { font-size: 15px; font-weight: 500; }
.desc { font-size: 12px; color: #888; }
.arrow { font-size: 18px; color: #999; }
</style>
