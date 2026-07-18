<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">
      <text class="title">{{ schema ? schema.title : '管理' }}</text>
      <input v-if="schema && schema.search" v-model="kw" placeholder="搜索" class="search" />
    </view>

    <view class="list">
      <view v-for="item in filtered" :key="item.id" class="item" @click="edit(item)">
        <view class="top">
          <text class="name">{{ displayValue(item, 0) }}</text>
        </view>
        <view class="meta" v-if="schema.display.length > 1">
          <text v-for="(k, i) in schema.display.slice(1)" :key="k" class="m">{{ displayValue(item, i + 1) }}</text>
        </view>
        <view class="ops">
          <text class="del" @click.stop="remove(item)">删除</text>
        </view>
      </view>
      <view v-if="!filtered.length" class="empty">暂无数据，点下方添加</view>
    </view>

    <button class="add" @click="openAdd">{{ showForm ? '收起' : '＋ 添加' + (schema ? schema.title : '') }}</button>

    <view v-if="showForm" class="form">
      <textarea
        v-for="f in textareas"
        :key="f.key"
        v-model="form[f.key]"
        :placeholder="f.label"
        class="ctrl"
      />
      <input
        v-for="f in inputs"
        :key="f.key"
        v-model="form[f.key]"
        :placeholder="f.label"
        class="ctrl"
      />
      <input
        v-for="f in numbers"
        :key="f.key"
        type="number"
        v-model="form[f.key]"
        :placeholder="f.label"
        class="ctrl"
      />
      <picker
        v-for="f in dates"
        :key="f.key"
        mode="date"
        :value="form[f.key]"
        @change="(e) => (form[f.key] = e.detail.value)"
      >
        <view class="ctrl picker">{{ form[f.key] || '选择' + f.label }}</view>
      </picker>
      <picker
        v-for="f in pickers"
        :key="f.key"
        :range="f.options"
        @change="(e) => (form[f.key] = f.options[e.detail.value])"
      >
        <view class="ctrl picker">{{ form[f.key] || '选择' + f.label }}</view>
      </picker>
      <button class="save" @click="save">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { CRUD_SCHEMA } from '../../common/crud-schema'
import { theme } from '../../common/store'

const schema = ref(null)
const list = ref([])
const kw = ref('')
const showForm = ref(false)
const editingId = ref('')
const form = ref({})

onLoad((q) => {
  const s = CRUD_SCHEMA[q.type]
  if (!s) {
    uni.showToast({ title: '未知类型: ' + q.type, icon: 'none' })
    return
  }
  schema.value = s
  uni.setNavigationBarTitle({ title: s.title })
  load()
})
onShow(load)

async function load() {
  if (!schema.value) return
  try {
    list.value = await api.get(schema.value.prefix)
  } catch (e) {
    list.value = []
  }
}

const filtered = computed(() => {
  const s = schema.value
  if (!s || !s.search || !kw.value) return list.value
  const k = kw.value.toLowerCase()
  return list.value.filter((it) => String(it[s.search] || '').toLowerCase().includes(k))
})

const textareas = computed(() => schema.value.fields.filter((f) => f.type === 'textarea'))
const inputs = computed(() => schema.value.fields.filter((f) => f.type === 'input'))
const numbers = computed(() => schema.value.fields.filter((f) => f.type === 'number'))
const dates = computed(() => schema.value.fields.filter((f) => f.type === 'date'))
const pickers = computed(() => schema.value.fields.filter((f) => f.type === 'picker'))

function displayValue(item, idx) {
  const key = schema.value.display[idx]
  const v = item[key]
  return v === undefined || v === null || v === '' ? '-' : v
}

function resetForm() {
  const f = {}
  schema.value.fields.forEach((field) => {
    f[field.key] = ''
  })
  form.value = f
}

function openAdd() {
  editingId.value = ''
  resetForm()
  showForm.value = !showForm.value
}

function edit(item) {
  editingId.value = item.id
  const f = {}
  schema.value.fields.forEach((field) => {
    f[field.key] = item[field.key] ?? ''
  })
  form.value = f
  showForm.value = true
}

async function save() {
  for (const f of schema.value.fields) {
    if (f.required && !String(form.value[f.key] ?? '').trim()) {
      return uni.showToast({ title: '请填写' + f.label, icon: 'none' })
    }
  }
  const payload = {}
  schema.value.fields.forEach((field) => {
    let v = form.value[field.key]
    if (field.type === 'number') v = v === '' || v == null ? undefined : Number(v)
    else if (field.type === 'picker' && field.options && field.options[0] === '是')
      v = v === '是'
    else if (v === '') v = undefined
    payload[field.key] = v
  })
  const p = schema.value.prefix
  if (editingId.value) await api.patch(p + '/' + editingId.value, payload)
  else await api.post(p, payload)
  showForm.value = false
  load()
}

function remove(item) {
  uni.showModal({
    title: '确认删除',
    success: async (r) => {
      if (r.confirm) {
        await api.del(schema.value.prefix + '/' + item.id)
        load()
      }
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.title { font-size: 34rpx; font-weight: 700; color: var(--c-title); }
.search { border: 1px solid var(--c-border); border-radius: 30rpx; padding: 10rpx 24rpx; font-size: 26rpx; width: 240rpx; background: var(--c-input); color: var(--c-text); }
.item { background: var(--c-card); border-radius: 20rpx; padding: 26rpx; margin-bottom: 16rpx; position: relative; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 32rpx; font-weight: 600; color: var(--c-text); }
.meta { color: var(--c-sub); font-size: 26rpx; margin-top: 8rpx; }
.meta .m { margin-right: 18rpx; }
.ops { position: absolute; right: 26rpx; bottom: 26rpx; }
.del { color: #e06c75; font-size: 26rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.add { margin-top: 16rpx; background: var(--c-accent); color: #fff; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.form { margin-top: 24rpx; background: var(--c-card); border-radius: 20rpx; padding: 30rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.ctrl { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: var(--c-text); background: var(--c-input); }
.picker { color: var(--c-title); min-height: 80rpx; line-height: 44rpx; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 10rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
</style>
