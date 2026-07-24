<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Settings, Save, Loader2, Bot, MessageCircle, Boxes } from 'lucide-vue-next'
import request from '@/api/request'

interface ConfigItem { key: string; value: string }
interface ConfigResp { items?: ConfigItem[]; [k: string]: any }

const loading = ref(false)
const saving = ref(false)

/** 表单字段：扁平结构便于 v-model */
const form = reactive({
  aiModel: '',
  aiApiKey: '',
  aiBaseUrl: '',
  wxAppId: '',
  wxAppSecret: '',
  wxSubscribeMsgTemplateId: '',
  imSdkAppId: '',
  imSecretKey: '',
  defaultSubjects: '',
  parentLoginCode: '',
  jwtExpiresIn: '',
})

/** 配置项 → key 映射，统一管理 */
const keyMap: Record<keyof typeof form, string> = {
  aiModel: 'aiModel',
  aiApiKey: 'aiApiKey',
  aiBaseUrl: 'aiBaseUrl',
  wxAppId: 'wxAppId',
  wxAppSecret: 'wxAppSecret',
  wxSubscribeMsgTemplateId: 'wxSubscribeMsgTemplateId',
  imSdkAppId: 'imSdkAppId',
  imSecretKey: 'imSecretKey',
  defaultSubjects: 'defaultSubjects',
  parentLoginCode: 'parentLoginCode',
  jwtExpiresIn: 'jwtExpiresIn',
}

async function load() {
  loading.value = true
  try {
    const res = await request.get<unknown, ConfigResp>('/config/app')
    const items: ConfigItem[] = (res?.items || []).filter(Boolean)
    const map: Record<string, string> = {}
    for (const it of items) {
      if (it && it.key) map[it.key] = it.value ?? ''
    }
    ;(Object.keys(form) as (keyof typeof form)[]).forEach((k) => {
      const cfgKey = keyMap[k]
      if (map[cfgKey] !== undefined) (form as any)[k] = map[cfgKey]
    })
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function save() {
  saving.value = true
  try {
    const items: ConfigItem[] = (Object.keys(form) as (keyof typeof form)[]).map((k) => ({
      key: keyMap[k],
      value: (form as any)[k] ?? '',
    }))
    await request.put('/config/app', { items })
    alert('保存成功')
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const inputCls = 'w-full px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400'
const labelCls = 'text-sm text-cocoa-500'
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Settings class="w-6 h-6 text-butter-500" /> 平台配置
      </h1>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60"
        :disabled="saving || loading"
        @click="save"
      >
        <Save class="w-4 h-4" />
        {{ saving ? '保存中…' : '保存' }}
      </button>
    </div>

    <div v-if="loading" class="bg-white rounded-2xl shadow-softer p-10 text-center text-cocoa-400">
      <Loader2 class="w-5 h-5 animate-spin inline-block mr-2" /> 加载中…
    </div>

    <template v-else>
      <!-- AI 配置 -->
      <div class="bg-white rounded-2xl shadow-softer p-6">
        <div class="flex items-center gap-2 mb-4">
          <Bot class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">AI 配置</h2>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :class="labelCls">AI 模型</label>
            <select v-model="form.aiModel" :class="inputCls" class="mt-1">
              <option value="">未选择</option>
              <option value="glm-4">glm-4</option>
              <option value="glm-4-flash">glm-4-flash</option>
              <option value="deepseek-chat">deepseek-chat</option>
            </select>
          </div>
          <div>
            <label :class="labelCls">AI Base URL</label>
            <input v-model="form.aiBaseUrl" :class="inputCls" class="mt-1" placeholder="如 https://open.bigmodel.cn/api/paas/v4" />
          </div>
          <div class="col-span-2">
            <label :class="labelCls">AI API Key</label>
            <input v-model="form.aiApiKey" type="password" :class="inputCls" class="mt-1" placeholder="请输入 API Key" autocomplete="off" />
          </div>
        </div>
      </div>

      <!-- 微信配置 -->
      <div class="bg-white rounded-2xl shadow-softer p-6">
        <div class="flex items-center gap-2 mb-4">
          <MessageCircle class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">微信配置</h2>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :class="labelCls">小程序 AppId</label>
            <input v-model="form.wxAppId" :class="inputCls" class="mt-1" placeholder="wx..." />
          </div>
          <div>
            <label :class="labelCls">小程序 AppSecret</label>
            <input v-model="form.wxAppSecret" type="password" :class="inputCls" class="mt-1" placeholder="AppSecret" autocomplete="off" />
          </div>
          <div class="col-span-2">
            <label :class="labelCls">订阅消息模板 ID</label>
            <input v-model="form.wxSubscribeMsgTemplateId" :class="inputCls" class="mt-1" placeholder="订阅消息模板 ID" />
          </div>
        </div>
      </div>

      <!-- IM 配置 -->
      <div class="bg-white rounded-2xl shadow-softer p-6">
        <div class="flex items-center gap-2 mb-4">
          <MessageCircle class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">IM 配置</h2>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :class="labelCls">IM SDK AppId</label>
            <input v-model="form.imSdkAppId" :class="inputCls" class="mt-1" placeholder="IM SDK AppId" />
          </div>
          <div>
            <label :class="labelCls">IM SecretKey</label>
            <input v-model="form.imSecretKey" type="password" :class="inputCls" class="mt-1" placeholder="IM SecretKey" autocomplete="off" />
          </div>
        </div>
      </div>

      <!-- 其他 -->
      <div class="bg-white rounded-2xl shadow-softer p-6">
        <div class="flex items-center gap-2 mb-4">
          <Boxes class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">其他</h2>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label :class="labelCls">默认学科（逗号分隔）</label>
            <input v-model="form.defaultSubjects" :class="inputCls" class="mt-1" placeholder="如 语文,数学,英语" />
          </div>
          <div>
            <label :class="labelCls">家长登录码</label>
            <input v-model="form.parentLoginCode" :class="inputCls" class="mt-1" placeholder="家长登录码" />
          </div>
          <div>
            <label :class="labelCls">JWT 过期时间</label>
            <input v-model="form.jwtExpiresIn" :class="inputCls" class="mt-1" placeholder="如 7d" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
