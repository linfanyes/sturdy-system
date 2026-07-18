<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">
      <text class="add" @click="showAdd = !showAdd">+ 添加资源</text>
    </view>

    <view class="list">
      <view class="r" v-for="r in list" :key="r.id">
        <image v-if="r.image" :src="r.image" class="thumb" mode="aspectFill" />
        <view class="info">
          <text class="tt">{{ r.title }}</text>
          <text class="cat" v-if="r.category">#{{ r.category }}</text>
          <text class="desc" v-if="r.description">{{ r.description }}</text>
          <text class="link" v-if="r.url && !r.image" @click="copy(r.url)">{{ r.url }}</text>
        </view>
        <text class="del" @click="del(r)">删除</text>
      </view>
      <view class="empty" v-if="!list.length">暂无资源</view>
    </view>

    <view class="sheet" v-if="showAdd">
      <input v-model="form.title" class="inp" placeholder="资源标题" />
      <input v-model="form.url" class="inp" placeholder="外部链接（可选，与下方图片二选一）" />
      <view class="up" @click="pickImg">
        <image v-if="form.image" :src="form.image" class="prev" mode="aspectFill" />
        <text v-else>📷 点击选择图片/文件</text>
      </view>
      <input v-model="form.category" class="inp" placeholder="分类（可选）" />
      <textarea v-model="form.description" class="inp area" placeholder="描述（可选）" />
      <button class="ok" @click="add">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const list = ref([])
const showAdd = ref(false)
const form = ref({ title: '', url: '', image: '', category: '', description: '' })

async function load() {
  list.value = await api.get('/resources')
}
onShow(load)

function pickImg() {
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    success: (res) => {
      const p = res.tempFiles[0].tempFilePath
      uni.getFileSystemManager().readFile({
        filePath: p,
        encoding: 'base64',
        success: (r) => {
          const ext = p.split('.').pop() || 'png'
          form.value.image = 'data:image/' + ext + ';base64,' + r.data
        },
        fail: () => uni.showToast({ title: '读取失败', icon: 'none' }),
      })
    },
  })
}

function copy(u) {
  uni.setClipboardData({ data: u, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) })
}

async function add() {
  if (!form.value.title) return uni.showToast({ title: '请填标题', icon: 'none' })
  if (!form.value.url && !form.value.image) return uni.showToast({ title: '请填链接或选图片', icon: 'none' })
  try {
    const r = await api.post('/resources', { ...form.value })
    list.value.unshift(r)
    showAdd.value = false
    form.value = { title: '', url: '', image: '', category: '', description: '' }
    uni.showToast({ title: '已添加', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '添加失败：' + (e.message || ''), icon: 'none' })
  }
}
async function del(r) {
  uni.showModal({
    title: '删除资源',
    content: r.title,
    success: async (m) => {
      if (!m.confirm) return
      try {
        await api.del('/resources/' + r.id)
        list.value = list.value.filter((x) => x.id !== r.id)
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.bar { display: flex; justify-content: flex-end; margin-bottom: 16rpx; }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 20rpx; }
.r { display: flex; align-items: center; gap: 18rpx; padding: 18rpx 0; border-bottom: 1px solid #f3f3f3; }
.thumb { width: 110rpx; height: 110rpx; border-radius: 12rpx; background: #f3f3f3; flex: 0 0 auto; }
.info { flex: 1; min-width: 0; }
.tt { font-size: 30rpx; font-weight: 700; color: #4a3f35; }
.cat { font-size: 22rpx; color: #a07b3b; margin-left: 10rpx; }
.desc { display: block; font-size: 24rpx; color: #9aa0a6; margin-top: 6rpx; }
.link { display: block; font-size: 22rpx; color: #409eff; margin-top: 6rpx; word-break: break-all; }
.del { font-size: 26rpx; color: #e06c75; flex: 0 0 auto; }
.empty { text-align: center; color: #9aa0a6; padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 110rpx; }
.up { border: 1px dashed #e6a23c; border-radius: 12rpx; padding: 30rpx; text-align: center; color: #a07b3b; font-size: 26rpx; margin-bottom: 14rpx; }
.prev { width: 160rpx; height: 160rpx; border-radius: 12rpx; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .list, .dark .sheet { background: var(--c-card); }
.dark .tt { color: var(--c-title); }
.dark .desc { color: var(--c-sub); }
.dark .r { border-color: var(--c-input-border); }
.dark .inp { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .up { border-color: var(--c-accent); color: var(--c-accent); }
</style>
