<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>

    <view class="bar">
      <text class="stat" v-if="classId">共 {{ photoItems.length }} 张</text>
      <view class="bar-btns">
        <text class="mgr" @click="manage = !manage">{{ manage ? '完成' : '管理' }}</text>
        <text class="add" @click="showAdd = !showAdd">+ 上传风采</text>
      </view>
    </view>

    <view class="grid" v-if="photoItems.length">
      <view v-for="(p, i) in photoItems" :key="p.albumId + '-' + i" class="cell">
        <image
          :src="p.src"
          class="img"
          mode="aspectFill"
          @click="manage ? null : preview(p.src)"
        />
        <view v-if="manage" class="move" @click="startMove(p)">移动</view>
      </view>
    </view>
    <view class="empty" v-else>还没有班级风采照片</view>

    <view v-if="movePhoto" class="mask" @click="movePhoto = null">
      <view class="sheet2" @click.stop>
        <view class="sh-t">移动到相册</view>
        <view v-if="targetAlbums.length">
          <view v-for="a in targetAlbums" :key="a.id" class="opt" @click="doMove(a)">{{ a.title }}</view>
        </view>
        <view v-else class="empty">该班级暂无其他相册，请先新建</view>
        <button class="cancel" @click="movePhoto = null">取消</button>
      </view>
    </view>

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
const manage = ref(false)
const movePhoto = ref(null)
const form = ref({ title: '', date: '', description: '', photos: [] })

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
function photosOf(it) {
  return typeof it.photos === 'string' ? safeParse(it.photos) : (it.photos || [])
}
const photoItems = computed(() => {
  const all = []
  list.value.forEach((it) => {
    photosOf(it).forEach((p) => all.push({ src: p, albumId: it.id, albumTitle: it.title }))
  })
  return all
})
const targetAlbums = computed(() => list.value.filter((x) => x.id !== (movePhoto.value && movePhoto.value.albumId)))
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

function preview(src) {
  uni.previewImage({ current: src, urls: photoItems.value.map((x) => x.src) })
}

function startMove(p) { movePhoto.value = p }
async function doMove(album) {
  const src = movePhoto.value.src
  const fromId = movePhoto.value.albumId
  const toId = album.id
  const from = list.value.find((x) => x.id === fromId)
  const to = list.value.find((x) => x.id === toId)
  if (!from || !to) return
  const fPhotos = photosOf(from).filter((p) => p !== src)
  const tPhotos = [...photosOf(to), src]
  uni.showLoading({ title: '移动中…' })
  try {
    await api.patch('/class-galleries/' + fromId, { photos: fPhotos })
    await api.patch('/class-galleries/' + toId, { photos: tPhotos })
    from.photos = fPhotos
    to.photos = tPhotos
    movePhoto.value = null
    uni.showToast({ title: '已移动到「' + album.title + '」', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '移动失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
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
.bar-btns { display: flex; align-items: center; gap: 24rpx; }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; }
.mgr { font-size: 26rpx; color: var(--c-accent); }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; margin-bottom: 20rpx; }
.cell { position: relative; }
.img { width: 100%; height: 220rpx; border-radius: 12rpx; background: #f3f3f3; }
.move { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-size: 22rpx; color: #fff; background: rgba(0,0,0,0.55); border-radius: 0 0 12rpx 12rpx; padding: 8rpx 0; }
.empty { text-align: center; color: #9aa0a6; padding: 50rpx 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 50; }
.sheet2 { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); text-align: center; margin-bottom: 16rpx; }
.opt { padding: 26rpx 20rpx; border-bottom: 1rpx solid var(--c-border); font-size: 28rpx; color: var(--c-title); text-align: center; }
.cancel { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; margin-top: 20rpx; font-size: 28rpx; }
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
