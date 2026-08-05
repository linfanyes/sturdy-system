<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">🎉 班级活动</view>

    <view class="bar">
      <text class="sc" v-if="list.length">共 {{ list.length }} 个活动</text>
      <text class="add" @click="openCreate">+ 发布活动</text>
    </view>

    <Skeleton v-if="loading" :rows="3" />

    <EmptyState v-else-if="!list.length" icon="🎉" text="暂无班级活动" hint="记录丰富多彩的班级活动" />

    <view v-else class="list">
      <view class="a" v-for="it in list" :key="it.id">
        <view class="top">
          <text class="tt">{{ it.title }}</text>
          <text class="dt">{{ it.date }}</text>
        </view>
        <view class="ct" v-if="it.description">{{ it.description }}</view>
        <view class="ph" v-if="photos(it).length">
          <image v-for="(p, i) in photos(it)" :key="i" :src="p" class="phimg" mode="aspectFill" lazy-load />
        </view>
        <view class="acts">
          <text class="act" @click="openEdit(it)">编辑</text>
          <text class="act del" @click="del(it)">删除</text>
        </view>
      </view>
    </view>

    <!-- 新增/编辑活动弹窗 -->
    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="sheet safe-bottom" @click.stop>
        <view class="sh-t">{{ editingId ? '编辑活动' : '发布活动' }}</view>
        <view class="field">
          <text class="label">活动标题 <text class="req">*</text></text>
          <input v-model="form.title" class="inp" placeholder="活动标题" />
        </view>
        <view class="field">
          <text class="label">日期</text>
          <picker mode="date" :value="form.date" @change="(e) => form.date = e.detail.value">
            <view class="picker">{{ form.date || '选择日期' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">活动描述</text>
          <textarea v-model="form.description" class="inp area" placeholder="活动描述" />
        </view>
        <view class="field">
          <text class="label">照片</text>
          <view class="up" @click="pickImg">
            <text v-if="!form.photos.length">📷 添加活动照片（{{ form.photos.length }}）</text>
            <view v-else class="ph"><image v-for="(p,i) in form.photos" :key="i" :src="p" class="phimg" mode="aspectFill" /></view>
          </view>
        </view>
        <view class="btn-row">
          <button class="btn cancel" @click="showForm = false">取消</button>
          <button class="btn save" :disabled="saving" @click="save">{{ saving ? '保存中…' : '发布' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import Skeleton from '../../components/Skeleton/Skeleton.vue'
import EmptyState from '../../components/EmptyState/EmptyState.vue'
import { compressImage } from '../../common/image'

const list = ref([])
const loading = ref(false)
const saving = ref(false)
const showForm = ref(false)
const editingId = ref('')
const form = ref({ title: '', date: '', description: '', photos: [] })

function photos(it) {
  try { return typeof it.photos === 'string' ? JSON.parse(it.photos) : (it.photos || []) } catch (e) { return [] }
}

async function load() {
  loading.value = true
  try {
    const arr = await api.get('/class-activities').catch(() => [])
    list.value = Array.isArray(arr) ? arr.sort((a, b) => (b.date || '').localeCompare(a.date || '')) : (arr.items || [])
  } catch (e) { list.value = [] } finally { loading.value = false }
}

onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

function openCreate() {
  editingId.value = ''
  form.value = { title: '', date: '', description: '', photos: [] }
  showForm.value = true
}

function openEdit(it) {
  editingId.value = it.id
  form.value = {
    title: it.title || '', date: it.date || '', description: it.description || '',
    photos: photos(it),
  }
  showForm.value = true
}

async function pickImg() {
  uni.chooseMedia({
    count: 9, mediaType: ['image'],
    success: async (res) => {
      for (const f of res.tempFiles) {
        try {
          const cmp = await compressImage({ src: f.tempFilePath, maxWidth: 1280, maxHeight: 1280, quality: 70, fileType: 'jpg' })
          const path = cmp?.tempFilePath || f.tempFilePath
          const r = await new Promise((resolve, reject) => {
            uni.getFileSystemManager().readFile({ filePath: path, encoding: 'base64', success: resolve, fail: reject })
          })
          form.value.photos.push('data:image/jpeg;base64,' + r.data)
        } catch (e) { console.error('[mini catch]', e) }
      }
    },
  })
}

async function save() {
  if (saving.value) return
  if (!form.value.title) return uni.showToast({ title: '请填写标题', icon: 'none' })
  saving.value = true
  const payload = {
    title: form.value.title, date: form.value.date,
    description: form.value.description, photos: form.value.photos,
  }
  try {
    if (editingId.value) {
      await api.patch('/class-activities/' + editingId.value, payload)
    } else {
      await api.post('/class-activities', payload)
    }
    showForm.value = false
    form.value = { title: '', date: '', description: '', photos: [] }
    uni.showToast({ title: editingId.value ? '已保存' : '已发布', icon: 'success' })
    load()
  } catch (e) { uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' }) }
  saving.value = false
}

async function del(it) {
  uni.showModal({
    title: '删除活动', content: '确定删除「' + it.title + '」？', confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await api.del('/class-activities/' + it.id)
        list.value = list.value.filter(x => x.id !== it.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    },
  })
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); margin-bottom: 16rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.sc { font-size: 24rpx; color: var(--c-sub); }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; }
.list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; }
.a { background: var(--c-card); border-radius: 12rpx; padding: 16rpx; border: 1px solid var(--c-input-border); }
.top { display: flex; justify-content: space-between; align-items: flex-start; }
.tt { font-size: 28rpx; font-weight: 700; color: var(--c-title); flex: 1; }
.dt { font-size: 22rpx; color: var(--c-sub); }
.ct { font-size: 24rpx; color: var(--c-sub); margin: 8rpx 0; white-space: pre-wrap; }
.ph { display: flex; flex-wrap: wrap; gap: 10rpx; margin: 10rpx 0; }
.phimg { width: 140rpx; height: 140rpx; border-radius: 12rpx; }
.acts { display: flex; gap: 20rpx; margin-top: 10rpx; }
.act { font-size: 24rpx; color: #409eff; }
.act.del { color: #e64340; }
.loading { text-align: center; padding: 40rpx 0; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 85vh; overflow-y: auto; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; text-align: center; }
.field { margin-bottom: 16rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.req { color: #e64340; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 14rpx 16rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; }
.area { height: 120rpx; }
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); background: var(--c-input); }
.up { border: 1px dashed #e6a23c; border-radius: 12rpx; padding: 24rpx; text-align: center; color: #a07b3b; font-size: 26rpx; margin-bottom: 14rpx; }
.btn-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.save { background: var(--c-primary); color: #fff; }
.btn.save[disabled] { opacity: 0.6; }
</style>