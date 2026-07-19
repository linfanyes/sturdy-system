<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view>
        <view class="h">🏆 获奖记录</view>
        <view class="sub">记录学生荣誉，留存高光时刻</view>
      </view>
      <view class="add" @click="openCreate">+ 新增</view>
    </view>

    <EmptyState v-if="!list.length" icon="🏆" text="还没有获奖记录" hint="记录每一份荣誉" />

    <view class="list" v-else>
      <view class="c" v-for="a in list" :key="a.id">
        <image v-if="a.image" :src="a.image" class="thumb" mode="aspectFill" lazy-load @click="preview(a.image)"></image>
        <view class="mid">
          <view class="top">
            <text class="nm">{{ a.name }}</text>
            <text class="lv" v-if="a.level">{{ a.level }}</text>
          </view>
          <view class="meta">{{ a.issuer || '颁发单位未知' }} · {{ a.date }}</view>
          <view class="tags" v-if="a.tags && a.tags.length">
            <text class="tag" v-for="(t, i) in a.tags" :key="i">#{{ t }}</text>
          </view>
          <view class="note" v-if="a.note">{{ a.note }}</view>
          <view class="score" v-if="a.ratingScore != null">评分：{{ a.ratingScore }} 分</view>
        </view>
        <view class="acts">
          <text class="a" @click="openEdit(a)">编辑</text>
          <text class="a del" @click="del(a)">删除</text>
        </view>
      </view>
    </view>

    <view class="mask" v-if="show" @click="show = false"></view>
    <view class="modal" v-if="show">
      <view class="mt">{{ editing ? '编辑获奖记录' : '新增获奖记录' }}</view>
      <input v-model="form.name" class="inp" placeholder="奖项名称" />
      <input v-model="form.issuer" class="inp" placeholder="颁发单位" />
      <picker mode="date" :value="form.date" @change="(e) => (form.date = e.detail.value)">
        <view class="picker">日期：{{ form.date }}</view>
      </picker>
      <view class="lab2">级别</view>
      <view class="chips">
        <text v-for="l in levels" :key="l" class="chip" :class="form.level === l && 'on'" @click="form.level = l">{{ l }}</text>
      </view>
      <input v-model="tagText" class="inp" placeholder="标签，用逗号分隔，如：数学竞赛,省级" />
      <view class="lab2">评分（0-100）</view>
      <view class="row">
        <text class="step" @click="step(-5)">−</text>
        <text class="score">{{ form.ratingScore }}</text>
        <text class="step" @click="step(5)">+</text>
      </view>
      <view class="lab2">荣誉照片</view>
      <view class="up" @click="upload">
        <image v-if="form.image" :src="form.image" class="prev" mode="aspectFill"></image>
        <text v-else class="up-t">＋ 上传照片</text>
      </view>
      <textarea v-model="form.note" class="inp area" placeholder="备注..."></textarea>
      <view class="mbtns">
        <view class="mb cancel" @click="show = false">取消</view>
        <view class="mb ok" :class="{ disabled: saving }" @click="save">{{ saving ? '保存中…' : '保存' }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import { isNonEmpty } from '../../common/validators'

const levels = ['国家级', '省级', '市级', '区级', '校级', '其他']
const list = ref([])
const show = ref(false)
const editing = ref(null)
const saving = ref(false)
const tagText = ref('')
const form = ref({ name: '', issuer: '', date: today(), level: '校级', tags: [], ratingScore: 0, image: '', note: '' })

function today() {
  const d = new Date()
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

async function load() {
  const arr = await api.getList('/award-records', { loading: true, loadingText: '加载获奖记录' })
  arr.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  list.value = arr
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function openCreate() {
  editing.value = null
  tagText.value = ''
  form.value = { name: '', issuer: '', date: today(), level: '校级', tags: [], ratingScore: 0, image: '', note: '' }
  show.value = true
}
function openEdit(a) {
  editing.value = a
  tagText.value = (a.tags || []).join('，')
  form.value = { name: a.name, issuer: a.issuer || '', date: a.date, level: a.level || '校级', tags: a.tags || [], ratingScore: a.ratingScore || 0, image: a.image || '', note: a.note || '' }
  show.value = true
}
function step(n) {
  let v = (form.value.ratingScore || 0) + n
  if (v < 0) v = 0
  if (v > 100) v = 100
  form.value.ratingScore = v
}
function upload() {
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    success: (res) => {
      const p = res.tempFiles[0].tempFilePath
      const ext = p.split('.').pop() || 'jpeg'
      wx.getFileSystemManager().readFile({
        filePath: p,
        encoding: 'base64',
        success: (r) => { form.value.image = 'data:image/' + ext + ';base64,' + r.data },
        fail: () => uni.showToast({ title: '读取失败', icon: 'none' }),
      })
    },
  })
}
function preview(src) {
  if (src && src.startsWith('data:image')) {
    uni.previewImage({ urls: [src] })
  }
}
async function save() {
  if (saving.value) return
  if (!isNonEmpty(form.value.name)) return uni.showToast({ title: '请填写奖项名称', icon: 'none' })
  const tags = tagText.value.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
  const payload = { ...form.value, tags }
  saving.value = true
  try {
    if (editing.value) {
      const r = await api.patch('/award-records/' + editing.value.id, payload)
      Object.assign(editing.value, r)
    } else {
      const r = await api.post('/award-records', payload)
      list.value.unshift(r)
    }
    show.value = false
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
function del(a) {
  uni.showModal({ title: '删除', content: '确定删除「' + a.name + '」？', success: async (m) => {
    if (!m.confirm) return
    uni.showLoading({ title: '删除中…', mask: true })
    try { await api.del('/award-records/' + a.id); list.value = list.value.filter((x) => x.id !== a.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    finally { uni.hideLoading() }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.h { font-size: 36rpx; font-weight: 800; color: #4a3f35; }
.sub { font-size: 24rpx; color: #9aa0a6; margin-top: 4rpx; }
.add { font-size: 28rpx; color: #fff; background: #07c160; padding: 12rpx 26rpx; border-radius: 40rpx; }
.empty { text-align: center; color: #9aa0a6; padding: 80rpx 40rpx; font-size: 26rpx; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 24rpx; }
.c { display: flex; gap: 18rpx; padding: 20rpx 0; border-bottom: 1px solid #f3f3f3; }
.thumb { width: 120rpx; height: 120rpx; border-radius: 14rpx; flex-shrink: 0; background: #f3f3f3; }
.mid { flex: 1; min-width: 0; }
.top { display: flex; align-items: center; gap: 12rpx; }
.nm { font-size: 30rpx; font-weight: 700; color: #4a3f35; }
.lv { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; background: #fff3e0; color: #e6a23c; }
.meta { font-size: 24rpx; color: #9aa0a6; margin: 6rpx 0; }
.tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin: 6rpx 0; }
.tag { font-size: 22rpx; color: #a07b3b; }
.note { font-size: 25rpx; color: #6a6058; margin-top: 4rpx; }
.score { font-size: 24rpx; color: #e6a23c; margin-top: 4rpx; }
.acts { display: flex; flex-direction: column; gap: 14rpx; }
.a { font-size: 24rpx; color: #409eff; }
.a.del { color: #e06c75; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 50; }
.modal { position: fixed; left: 5%; right: 5%; bottom: 0; z-index: 51; background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 92vh; overflow-y: auto; }
.mt { font-size: 32rpx; font-weight: 700; margin-bottom: 20rpx; color: #4a3f35; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.picker { background: #f6f6f6; border-radius: 12rpx; padding: 18rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.lab2 { font-size: 24rpx; color: #9aa0a6; margin: 8rpx 0 10rpx; }
.chips { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 14rpx; }
.chip { font-size: 24rpx; padding: 12rpx 22rpx; border-radius: 30rpx; background: #f3f3f3; color: #999; }
.chip.on { background: #e6a23c; color: #fff; }
.row { display: flex; align-items: center; gap: 30rpx; margin-bottom: 14rpx; }
.step { width: 64rpx; height: 64rpx; border-radius: 50%; background: #f3f3f3; text-align: center; line-height: 64rpx; font-size: 40rpx; color: #666; }
.score { font-size: 36rpx; font-weight: 800; color: #e6a23c; min-width: 80rpx; text-align: center; }
.up { border: 1px dashed #ddd; border-radius: 14rpx; height: 160rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 14rpx; }
.up-t { font-size: 26rpx; color: #9aa0a6; }
.prev { width: 100%; height: 100%; border-radius: 14rpx; }
.area { height: 110rpx; }
.mbtns { display: flex; gap: 20rpx; margin-top: 10rpx; }
.mb { flex: 1; text-align: center; padding: 22rpx; border-radius: 40rpx; font-size: 30rpx; }
.mb.cancel { background: #f3f3f3; color: #666; }
.mb.ok { background: #07c160; color: #fff; }
.mb.disabled { opacity: 0.6; }
.dark .page { background: var(--c-bg); }
.dark .h { color: var(--c-title); }
.dark .list, .dark .modal { background: var(--c-card); }
.dark .c { border-color: var(--c-input-border); }
.dark .nm { color: var(--c-title); }
.dark .note { color: var(--c-sub); }
.dark .inp, .dark .picker { background: var(--c-input); color: var(--c-text); border-color: var(--c-input-border); }
.dark .chip { background: var(--c-card2); color: var(--c-sub); }
.dark .step { background: var(--c-card2); color: var(--c-sub); }
.dark .mb.cancel { background: var(--c-card2); color: var(--c-sub); }
</style>
