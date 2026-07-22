<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <text class="h">📷 我的相册</text>
      <text class="sub">共 {{ list.length }} 个相册，{{ totalPhotos }} 张照片</text>
    </view>

    <!-- 操作栏 -->
    <view class="bar">
      <text class="add" @click="showAdd = !showAdd">{{ showAdd ? '收起' : '＋ 新建相册' }}</text>
      <text class="mgr" @click="manage = !manage">{{ manage ? '完成' : '管理' }}</text>
    </view>

    <!-- 相册 Tab -->
    <scroll-view scroll-x class="tabs" v-if="list.length">
      <text class="tab" :class="!activeAlbum && 'on'" @click="activeAlbum = ''">全部 ({{ totalPhotos }})</text>
      <text v-for="it in list" :key="it.id" class="tab" :class="activeAlbum === it.id && 'on'" @click="activeAlbum = it.id">{{ it.title }} ({{ (it.photos || []).length }})</text>
    </scroll-view>

    <!-- 图片网格 -->
    <view class="grid" v-if="photoItems.length">
      <view v-for="(p, i) in photoItems" :key="p.albumId + '-' + i" class="cell">
        <image :src="p.src" class="img" mode="aspectFill" lazy-load @click="preview(p.src)" />
        <view v-if="manage" class="move" @click="movePhoto(p)">移动</view>
      </view>
    </view>
    <view v-else class="empty">还没有照片，上传你的第一张照片吧</view>

    <!-- 相册列表 -->
    <view class="albums" v-if="list.length">
      <view v-for="it in list" :key="it.id" class="al">
        <view class="top">
          <text class="tt">{{ it.title }}</text>
          <text class="dt">{{ it.date }}</text>
        </view>
        <view class="ct" v-if="it.description">{{ it.description }}</view>
        <view class="al-acts">
          <text class="del" @click="del(it)">删除</text>
        </view>
      </view>
    </view>

    <!-- 新建相册表单 -->
    <view class="sheet" v-if="showAdd">
      <input v-model="form.title" placeholder="相册标题" />
      <picker mode="date" :value="form.date" @change="e => form.date = e.detail.value"><view class="picker">日期：{{ form.date }}</view></picker>
      <textarea v-model="form.description" placeholder="描述（可选）" />
      <view class="up-row">
        <text class="up" @click="pickImg">📷 选择照片</text>
        <text v-if="form.photos.length">{{ form.photos.length }} 张</text>
      </view>
      <view class="thumbs" v-if="form.photos.length">
        <image v-for="(p,i) in form.photos" :key="i" :src="p" class="thumb" mode="aspectFill" @click="form.photos.splice(i,1)" />
      </view>
      <button class="ok" :disabled="saving" @click="saveAlbum">{{ saving ? '保存中…' : '保存相册' }}</button>
      <button class="cancel" @click="showAdd = false">取消</button>
    </view>

    <!-- 移动照片 -->
    <view class="sheet" v-if="moveOpen">
      <view class="mv-h">移动到哪个相册？</view>
      <view v-for="it in otherAlbums" :key="it.id" class="mv-opt" @click="commitMove(it.id)">{{ it.title }}</view>
      <button class="cancel" @click="moveOpen = false; movePhotoId = ''">取消</button>
    </view>

    <!-- 预览 -->
    <view v-if="previewSrc" class="preview-mask" @click="previewSrc = ''">
      <image :src="previewSrc" class="preview-img" mode="widthFix" @click.stop show-menu-by-longpress />
      <text class="preview-save" @click.stop="savePreview">💾 保存到相册</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import { pickAndCompressImage } from '../../common/image'

const list = ref([])
const showAdd = ref(false)
const saving = ref(false)
const manage = ref(false)
const activeAlbum = ref('')
const form = ref({ title: '', date: new Date().toISOString().slice(0, 10), description: '', photos: [] })
const moveOpen = ref(false)
const movePhotoId = ref('')
const previewSrc = ref('')

const totalPhotos = computed(() => list.value.reduce((s, a) => s + (a.photos || []).length, 0))
const photoItems = computed(() => {
  const items = []
  const srcList = activeAlbum.value
    ? list.value.filter((a) => a.id === activeAlbum.value)
    : list.value
  srcList.forEach((a) => (a.photos || []).forEach((src) => items.push({ albumId: a.id, src })))
  return items
})
const otherAlbums = computed(() => list.value.filter((a) => a.id !== (movePhotoId.value ? findAlbum(movePhotoId.value)?.id : '')))

function findAlbum(photoSrc) {
  return list.value.find((a) => (a.photos || []).includes(photoSrc))
}

async function load() {
  const arr = await api.getList('/my-galleries', { loading: true, loadingText: '加载相册' })
  list.value = arr || []
}

onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

async function pickImg() {
  try {
    const res = await pickAndCompressImage({ count: 9 })
    res.tempFiles.forEach((p) => {
      try { uni.getFileSystemManager().readFile({ filePath: p.tempFilePath, encoding: 'base64', success: (r) => { form.value.photos.push('data:image/jpeg;base64,' + r.data) } }) }
      catch (_) { form.value.photos.push(p.tempFilePath) }
    })
  } catch (e) {
    // 取消选择
  }
}

async function saveAlbum() {
  if (!form.value.title) return uni.showToast({ title: '请输入相册标题', icon: 'none' })
  saving.value = true
  try {
    const r = await api.post('/my-galleries', { ...form.value })
    list.value.unshift(r)
    showAdd.value = false
    form.value = { title: '', date: new Date().toISOString().slice(0, 10), description: '', photos: [] }
    uni.showToast({ title: '已创建', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}

function movePhoto(item) {
  movePhotoId.value = item.src
  moveOpen.value = true
}

async function commitMove(toId) {
  const from = findAlbum(movePhotoId.value)
  if (!from) return
  const to = list.value.find((a) => a.id === toId)
  if (!to || from.id === to.id) { moveOpen.value = false; return }
  try {
    const fPhotos = (from.photos || []).filter((p) => p !== movePhotoId.value)
    const tPhotos = [...(to.photos || []), movePhotoId.value]
    await api.patch('/my-galleries/' + from.id, { photos: fPhotos })
    await api.patch('/my-galleries/' + to.id, { photos: tPhotos })
    from.photos = fPhotos; to.photos = tPhotos
    uni.showToast({ title: '已移动', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '移动失败', icon: 'none' })
  }
  moveOpen.value = false; movePhotoId.value = ''
}

function del(it) {
  uni.showModal({ title: '删除相册', content: '确定删除「' + it.title + '」？', success: async (m) => {
    if (!m.confirm) return
    try { await api.del('/my-galleries/' + it.id); list.value = list.value.filter((x) => x.id !== it.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
  }})
}

function preview(src) {
  previewSrc.value = src
}

function savePreview() {
  if (!previewSrc.value) return
  if (previewSrc.value.startsWith('data:')) {
    const fs = uni.getFileSystemManager()
    const fp = wx.env.USER_DATA_PATH + '/gallery_' + Date.now() + '.jpg'
    fs.writeFile({ filePath: fp, data: previewSrc.value.replace(/^data:image\/\w+;base64,/, ''), encoding: 'base64', success: () => {
      uni.saveImageToPhotosAlbum({ filePath: fp, success: () => uni.showToast({ title: '已保存到系统相册', icon: 'success' }), fail: () => uni.showToast({ title: '保存失败', icon: 'none' }) })
    }})
  } else {
    uni.downloadFile({ url: previewSrc.value, success: (r) => {
      uni.saveImageToPhotosAlbum({ filePath: r.tempFilePath, success: () => uni.showToast({ title: '已保存到系统相册', icon: 'success' }), fail: () => uni.showToast({ title: '保存失败', icon: 'none' }) })
    }})
  }
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14rpx; }
.h { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); }
.bar { display: flex; align-items: center; justify-content: flex-end; gap: 20rpx; margin-bottom: 16rpx; }
.add { font-size: 28rpx; color: #fff; background: var(--c-primary); padding: 12rpx 26rpx; border-radius: 40rpx; }
.mgr { font-size: 26rpx; color: var(--c-accent); }
.tabs { white-space: nowrap; margin-bottom: 16rpx; }
.tab { display: inline-block; padding: 12rpx 22rpx; margin-right: 12rpx; border-radius: 24rpx; font-size: 26rpx; background: var(--c-card2); color: var(--c-sub); }
.tab.on { background: var(--c-accent); color: #fff; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; margin-bottom: 20rpx; }
.cell { position: relative; }
.img { width: 100%; height: 220rpx; border-radius: 12rpx; background: #f3f3f3; }
.move { position: absolute; bottom: 6rpx; right: 6rpx; background: rgba(0,0,0,0.55); color: #fff; font-size: 20rpx; padding: 4rpx 12rpx; border-radius: 14rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 100rpx 0; font-size: 28rpx; }
.albums { margin-top: 8rpx; }
.al { background: var(--c-card); border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 14rpx; }
.top { display: flex; align-items: center; justify-content: space-between; }
.tt { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.dt { font-size: 24rpx; color: var(--c-sub); }
.ct { font-size: 25rpx; color: #6a6058; margin-top: 6rpx; }
.al-acts { margin-top: 8rpx; }
.del { font-size: 24rpx; color: var(--c-danger); }
.sheet { background: var(--c-card); border-radius: 20rpx; padding: 24rpx; margin-bottom: 16rpx; }
.sheet input, .picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.sheet textarea { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; height: 120rpx; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.up-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 14rpx; }
.up { font-size: 26rpx; color: #409eff; padding: 12rpx 20rpx; border: 1px dashed #409eff; border-radius: 12rpx; }
.thumbs { display: flex; flex-wrap: wrap; gap: 10rpx; margin-bottom: 14rpx; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 10rpx; }
.ok { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-bottom: 12rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.cancel { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.mv-h { font-size: 30rpx; font-weight: 700; margin-bottom: 16rpx; color: var(--c-title); }
.mv-opt { padding: 18rpx 24rpx; background: var(--c-card2); border-radius: 12rpx; margin-bottom: 10rpx; font-size: 28rpx; color: var(--c-title); }
.preview-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 100; }
.preview-img { max-width: 92vw; max-height: 72vh; border-radius: 12rpx; }
.preview-save { margin-top: 30rpx; color: #fff; font-size: 28rpx; padding: 14rpx 40rpx; background: var(--c-primary); border-radius: 40rpx; }
</style>
