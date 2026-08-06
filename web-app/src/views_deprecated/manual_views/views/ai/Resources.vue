<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { ExternalLink } from 'lucide-vue-next'
const fields: FieldDef[] = [
  { key: 'title', label: '资源名称', required: true },
  { key: 'type', label: '类型', type: 'select', options: ['文档', '视频', '音频', '图片', '链接', '其他'], width: 'w-24' },
  { key: 'subject', label: '学科', width: 'w-20' },
  { key: 'url', label: '链接/路径', hideInList: false },
  { key: 'desc', label: '描述', type: 'textarea', hideInList: true },
  { key: 'createdAt', label: '添加时间', type: 'datetime', width: 'w-40', readonly: true },
]

/** 预置在线资源：5 个网上常用中小学学生学习网站（与小程序端 community/resource.vue 对齐） */
const presetResources = [
  { title: '国家中小学智慧教育平台', url: 'https://basic.smartedu.cn/', description: '教育部官方中小学智慧教育平台，汇聚优质在线教学资源', category: '官方平台' },
  { title: '学科网', url: 'https://www.zxxk.com/', description: '中小学校教学资源网站，提供教案、课件、试题等资源', category: '官方平台' },
  { title: '一师一优课', url: 'https://1s1k.eduyun.cn/', description: '国家教育资源公共服务平台，汇集部级优课资源', category: '官方平台' },
  { title: '人教社中小学教材', url: 'https://jc.pep.com.cn/', description: '人民教育出版社中小学教材电子版，可在线阅读课本', category: '官方平台' },
  { title: '21世纪教育网', url: 'https://www.21cnjy.com/', description: '中小学备课与试题资源网站，覆盖各学段各学科', category: '教学资源' },
]
</script>
<template>
  <!-- 预置在线资源：5 个网上常用中小学学生学习网站（新标签页打开） -->
  <div class="mb-5">
    <h3 class="text-sm font-semibold text-cocoa-700 mb-3 tracking-wider">📚 预置在线资源（常用学习网站）</h3>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <a
        v-for="r in presetResources"
        :key="r.title"
        :href="r.url"
        target="_blank"
        rel="noopener noreferrer"
        class="group flex flex-col gap-1 rounded-2xl border border-cream-200 bg-surface p-4 shadow-softer transition-all hover:-translate-y-0.5 hover:shadow-soft hover:border-butter-300"
      >
        <div class="flex items-center justify-between">
          <span class="font-medium text-cocoa-900 group-hover:text-butter-600 transition-colors">{{ r.title }}</span>
          <ExternalLink class="w-4 h-4 text-cocoa-300 group-hover:text-butter-500 shrink-0" />
        </div>
        <span class="text-xs text-cocoa-400">{{ r.description }}</span>
        <span class="text-[11px] mt-1 self-start px-2 py-0.5 rounded-full bg-butter-50 text-butter-700 border border-butter-100">{{ r.category }}</span>
      </a>
    </div>
  </div>
  <CrudTable api-path="resources" title="资源" :fields="fields" :class-filterable="false" :defaults="{ type: '文档' }" />
</template>
