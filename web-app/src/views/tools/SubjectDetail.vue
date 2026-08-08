<script setup lang="ts">
/**
 * 学科工具详情 —— 展示某学科下的所有 AI 工具
 * 由 shared/schemas/subject-schema 的 getToolsBySubject 驱动。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getToolsBySubject, getSubjectTool, getTeacherSubjects } from '@gardener/shared/schemas/subject-schema'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const subject = computed(() => (route.params.subject as string) || route.query.subject as string || '')
const teacherSubjects = computed<string[]>(() =>
  getTeacherSubjects(auth.user?.subject as string | undefined, auth.user?.subjects as string[] | undefined),
)

/** 当前学科是否对该教师可见（防止手动改 URL 访问其他学科详情页） */
const accessible = computed(() => teacherSubjects.value.includes(subject.value))
const tools = computed(() => (accessible.value ? getToolsBySubject(subject.value) : []))

/** 工具跳转：统一走 query 参数进入工具箱详情页 */
function openTool(key: string) {
  router.push({ path: '/teacher/tools/subject-tool', query: { key } })
}

/** 转 web 端 mini-program 风格的简易路由路径（兼容旧配置） */
function toolPath(t: { key: string; path?: string }): string {
  if (t.path) return t.path
  return `/teacher/tools/subject-tool?key=${t.key}`
}
</script>

<template>
  <div class="subject-detail">
    <h2>{{ subject || '学科' }}工具 <span class="count">共 {{ tools.length }} 项</span></h2>
    <p class="subtitle" v-if="tools.length">以下工具由 shared schema 配置，点击使用对应 AI 生成能力。</p>
    <div class="empty" v-if="!tools.length">
      <p v-if="!accessible">您无权访问「{{ subject }}」学科工具。</p>
      <template v-else>
        <p>该学科暂无配置工具。</p>
        <p class="hint">请在 shared/schemas/subject-schema 的 SUBJECT_TOOLS 中添加该学科的工具定义。</p>
      </template>
    </div>
    <div class="grid" v-else>
      <div
        v-for="t in tools"
        :key="t.key"
        class="card"
        @click="openTool(t.key)"
      >
        <div class="icon">{{ t.icon }}</div>
        <div class="title">{{ t.title }}</div>
      </div>
    </div>
    <p class="footnote">Schema 来源：@gardener/shared/schemas/subject-schema::getToolsBySubject('{{ subject }}')</p>
  </div>
</template>

<style scoped>
.subject-detail { padding: 20px; }
.subject-detail h2 { margin: 0 0 4px; font-size: 18px; display: flex; align-items: baseline; gap: 8px; }
.count { font-size: 13px; font-weight: normal; color: #999; }
.subtitle { margin: 0 0 16px; color: #999; font-size: 13px; }
.empty { background: #faf7f2; border: 1px dashed #e0d5c4; border-radius: 8px; padding: 24px; text-align: center; color: #888; }
.empty .hint { font-size: 12px; color: #aaa; margin-top: 4px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.card {
  background: #fff;
  border: 1px solid #e0d5c4;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: box-shadow .2s, transform .15s;
}
.card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.06); transform: translateY(-2px); }
.icon { font-size: 26px; margin-bottom: 6px; }
.title { font-size: 14px; font-weight: 500; }
.footnote { margin-top: 20px; font-size: 12px; color: #bbb; word-break: break-all; }
</style>
