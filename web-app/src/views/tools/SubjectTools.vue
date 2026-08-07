<script setup lang="ts">
/**
 * 学科工具总览（Web 端工具中心入口）
 * 由 shared/schemas/subject-schema 的 SUBJECT_LIST 单一来源驱动。
 */
import {
  SUBJECT_LIST,
  MATH_TOOLS,
  type SubjectListItem,
} from '@gardener/shared/schemas/subject-schema'

const subjects: (SubjectListItem & { path: string })[] = SUBJECT_LIST.map((s) => ({
  ...s,
  path: `/teacher/subject-tools/${s.subject}`,
}))
// 数学口算等独立工具见 MATH_TOOLS（小程序路径；Web 端在 tools/ 目录下直接路由）
</script>

<template>
  <div class="subject-tools">
    <h2>学科工具</h2>
    <p class="subtitle">以下学科工具由共享 schema（shared/schemas/subject-schema）统一配置。</p>
    <div class="grid">
      <div
        v-for="s in subjects"
        :key="s.subject"
        class="card"
        :style="{ borderTopColor: s.color }"
        @click="$router.push(s.path)"
      >
        <div class="icon">{{ s.icon }}</div>
        <div class="name">{{ s.subject }}</div>
        <div class="desc">{{ s.desc }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.subject-tools { padding: 20px; }
.subject-tools h2 { margin: 0 0 4px; font-size: 18px; }
.subtitle { margin: 0 0 16px; color: #999; font-size: 13px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.card {
  background: #fff;
  border: 1px solid #e0d5c4;
  border-top: 3px solid transparent;
  border-radius: 8px;
  padding: 18px;
  text-align: center;
  cursor: pointer;
  transition: box-shadow .2s, transform .15s;
}
.card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.06); transform: translateY(-2px); }
.icon { font-size: 28px; margin-bottom: 6px; }
.name { font-size: 15px; font-weight: 600; color: #333; }
.desc { font-size: 12px; color: #888; margin-top: 4px; line-height: 1.4; }
</style>
