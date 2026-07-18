<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>

    <view class="bar">
      <text class="stat" v-if="classId">共 {{ photos.length }} 张</text>
      <text class="add" @click="showAdd = !showAdd">+ 上传风采</text>
    </view>

    <view class="grid" v-if="photos.length">
      <image
        v-for="(p, i) in photos"
        :key="i"
        :src="p"
        class="img"
        mode="aspectFill"
        @click="preview(i)"
      />
    </view>
    <view class="empty" v-else>还没有班级风采照片</view>

    <view class="albums" v-if="list.length">
      <view class="al" v-for="it in list" :key="it.id">
        <view class="top">
          <text class="tt">{{ it.title }}</text>
          <text class="dt">{{ it.date }}</text>
        </view>
        <view class="ct" v-if="it.description">{{ it.description }}</view>
        <text class="del" @click="del(it)">删除相册</text>
      </view>
    </view>

    <view class="sheet" v-if="showAdd">
      <input v-model="form.title" class="inp" placeholder="相册标题（如：运动会掠影）" />
      <picker mode="date" :value="form.date" @change="(e)=>form.date = e.detail.value">
        <view class="picker sm">日期：{{ form.date || '今天' }}</view>
      </picker>
      <textarea v-model="form.description" class="inp area" placeholder="描述（可选）" />
      <view class="up" @click="pickImg">
        <text v-if="!form.photos.length">📷 添加照片（{{ form.photos.length }}）</text>
        <view v-else class="ph"><image v-for="(p,i) in form.photos" :key="i" :src="p" class="phimg" mode="aspectFill" /></view>
      </view>
      <button class="ok" @click="add">保存相册</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const classes = ref([])
const classId = ref('')
const list = ref([])
const showAdd = ref(false)
const form = ref({ title: '', date: '', description: '', photos: [] })

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const photos = computed(() => {
  const all = []
  list.value.forEach((it) => {
    const ps = typeof it.photos === 'string' ? safeParse(it.photos) : (it.photos || [])
    ps.forEach((p) => all.push(p))
  })
  return all
})
function safeParse(s) {
  try { return JSON.parse(s) || [] } catch (e) { return [] }
}

async function load() {
  classes.value = await api.get('/classes')
  if (classId.value) await loadList()
}
async function loadList() {
  if (!classId.value) return
  list.value = (await api.get('/class-galleries'))
    .filter((x) => x.classId === classId.value)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}
onShow(load)
function pickClass(ev) { classId.value = classes.value[ev.detail.value].id; loadList() }

function preview(i) {
  uni.previewImage({ current: photos.value[i], urls: photos.value })
}

function pickImg() {
  uni.chooseMedia({
    count: 9, mediaType: ['image'], success: (res) => {
      res.tempFiles.forEach((f) => {
        uni.getFileSystemManager().readFile({
          filePath: f.tempFilePath, encoding: 'base64',
          success: (r) => {
            const ext = (f.tempFilePath.split('.').pop() || 'png').toLowerCase()
            form.value.photos.push('data:image/' + ext + ';base64,' + r.data)
          },
        })
      })
    },
  })
}
async function add() {
  if (!classId.value) return uni.showToast({ title: '请先选班级', icon: 'none' })
  if (!form.value.title) return uni.showToast({ title: '请填标题', icon: 'none' })
  if (!form.value.photos.length) return uni.showToast({ title: '请添加照片', icon: 'none' })
  try {
    const r = await api.post('/class-galleries', {
      classId: classId.value, title: form.value.title, date: form.value.date,
      description: form.value.description, photos: form.value.photos,
    })
    list.value.unshift(r)
    showAdd.value = false
    form.value = { title: '', date: '', description: '', photos: [] }
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) { uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' }) }
}
async function del(it) {
  uni.showModal({ title: '删除相册', content: it.title, success: async (m) => {
    if (!m.confirm) return
    try { await api.del('/class-galleries/' + it.id); list.value = list.value.filter((x) => x.id !== it.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.picker { background: #fff; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; }
.stat { font-size: 24rpx; color: #9aa0a6; }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; margin-bottom: 20rpx; }
.img { width: 100%; height: 220rpx; border-radius: 12rpx; background: #f3f3f3; }
.empty { text-align: center; color: #9aa0a6; padding: 50rpx 0; }
.albums { background: #fff; border-radius: 16rpx; padding: 10rpx 24rpx; }
.al { padding: 16rpx 0; border-bottom: 1px solid #f3f3f3; }
.top { display: flex; justify-content: space-between; }
.tt { font-size: 30rpx; font-weight: 700; color: #4a3f35; }
.dt { font-size: 24rpx; color: #9aa0a6; }
.ct { font-size: 26rpx; color: #5a5048; margin: 8rpx 0; white-space: pre-wrap; }
.del { font-size: 24rpx; color: #e06c75; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 100rpx; }
.picker.sm { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; background: #fff; }
.up { border: 1px dashed #e6a23c; border-radius: 12rpx; padding: 24rpx; text-align: center; color: #a07b3b; font-size: 26rpx; margin-bottom: 14rpx; }
.ph { display: flex; flex-wrap: wrap; gap: 10rpx; }
.phimg { width: 140rpx; height: 140rpx; border-radius: 12rpx; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .albums, .dark .sheet { background: var(--c-card); }
.dark .tt { color: var(--c-title); }
.dark .ct { color: var(--c-sub); }
.dark .al { border-color: var(--c-input-border); }
.dark .inp, .dark .picker.sm { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .up { border-color: var(--c-accent); color: var(--c-accent); }
</style>
