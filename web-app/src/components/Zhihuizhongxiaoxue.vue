<script setup lang="ts">
/**
 * 智慧中小学在线资源浏览组件（教师 / 校管共用）
 * - 调用后端 /online-resources/zhzx/courses 拉取课程目录
 * - 按学科（语文/数学/英语/综合）过滤 + 关键词搜索
 * - 每门课程：在线观看（打开官方平台播放页）+ 复制链接
 */
import { ref, onMounted } from 'vue'
import { Search, ExternalLink, Link2, GraduationCap, Loader2 } from 'lucide-vue-next'
import { listZhzxCourses, type ZhzxCourse, type ZhzxSubject } from '@/api/online-resources'

const courses = ref<ZhzxCourse[]>([])
const loading = ref(false)
const subject = ref<'' | ZhzxSubject>('')
const keyword = ref('')
const copied = ref(false)

const SUBJECTS: ('' | ZhzxSubject)[] = ['', '语文', '数学', '英语', '综合']
const subjectColor: Record<ZhzxSubject, string> = {
  语文: 'bg-butter-100 text-butter-600 border-butter-200',
  数学: 'bg-sky2-50 text-sky2-600 border-sky2-100',
  英语: 'bg-mint-50 text-mint-600 border-mint-200',
  综合: 'bg-cream-100 text-cocoa-500 border-cream-200',
}

async function load() {
  loading.value = true
  try {
    courses.value = await listZhzxCourses({
      subject: subject.value || undefined,
      keyword: keyword.value.trim() || undefined,
    })
  } catch {
    courses.value = []
  } finally {
    loading.value = false
  }
}

function pickSubject(s: '' | ZhzxSubject) {
  subject.value = s
  load()
}

function openCourse(c: ZhzxCourse) {
  window.open(c.playUrl, '_blank', 'noopener')
}

async function copyLink(c: ZhzxCourse) {
  try {
    await navigator.clipboard.writeText(c.playUrl)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    // 降级方案
    const ta = document.createElement('textarea')
    ta.value = c.playUrl
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <GraduationCap class="w-6 h-6 text-green-500" /> 智慧中小学 · 在线资源
      </h1>
      <span class="text-xs text-cocoa-400">聚合国家中小学智慧教育平台课程，点击「在线观看」跳转官方播放页</span>
    </div>

    <!-- 过滤栏 -->
    <div class="bg-surface rounded-2xl p-4 shadow-softer space-y-3">
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cocoa-300" />
        <input
          v-model="keyword"
          @keyup.enter="load"
          placeholder="搜索课程标题或简介"
          class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-cocoa-400">学科</span>
        <button
          v-for="s in SUBJECTS"
          :key="s || 'all'"
          :class="[
            'px-2.5 py-1 rounded-full text-xs border transition-colors',
            subject === s
              ? 'border-butter-400 bg-butter-100 text-butter-600'
              : 'border-cream-200 text-cocoa-500 hover:bg-cream-50',
          ]"
          @click="pickSubject(s)"
        >
          {{ s || '全部' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-cocoa-400 py-8 text-center flex items-center justify-center gap-2">
      <Loader2 class="w-4 h-4 animate-spin" /> 加载中…
    </div>
    <div v-else-if="!courses.length" class="bg-surface rounded-2xl p-10 text-center text-cocoa-400 shadow-softer">
      <GraduationCap class="w-12 h-12 mx-auto mb-3 text-cocoa-200" />
      <p>暂无匹配的课程资源</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      <div
        v-for="c in courses"
        :key="c.id"
        class="bg-surface rounded-2xl border border-cream-200 shadow-softer p-4 flex flex-col hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="font-semibold text-cocoa-900 text-lg leading-tight">{{ c.title }}</div>
          <span :class="['shrink-0 px-1.5 py-0.5 rounded-full text-[10px] border', subjectColor[c.subject]]">
            {{ c.subject }}
          </span>
        </div>
        <p class="mt-2 text-sm text-cocoa-600 leading-relaxed flex-1">{{ c.description }}</p>
        <div class="mt-3 flex gap-2">
          <button
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-colors"
            @click="openCourse(c)"
          >
            <ExternalLink class="w-4 h-4" /> 在线观看
          </button>
          <button
            class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-cream-200 text-cocoa-600 hover:bg-cream-50 transition-colors"
            @click="copyLink(c)"
          >
            <Link2 class="w-4 h-4" /> {{ copied ? '已复制' : '复制链接' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
