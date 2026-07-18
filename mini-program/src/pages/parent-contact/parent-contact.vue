<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar"><text class="add" @click="showAdd = !showAdd">+ 新增联系</text></view>
    <view class="list">
      <view class="c" v-for="p in list" :key="p.id">
        <view class="top">
          <text class="stu">{{ p.studentName }}</text>
          <text class="rel">{{ p.relation || '家长' }} · {{ p.parentName }}</text>
        </view>
        <view class="meta">{{ p.method || '电话' }} · {{ p.phone || p.wechat || '' }} · {{ p.date }}</view>
        <view class="ct">{{ p.content }}</view>
        <view class="fu" v-if="p.followUp">📌 跟进：{{ p.followUp }}</view>
        <view class="acts">
          <text class="a" @click="follow(p)">写跟进</text>
          <text class="a del" @click="del(p)">删除</text>
        </view>
      </view>
      <view class="empty" v-if="!list.length">暂无联系记录</view>
    </view>

    <view class="sheet" v-if="showAdd">
      <input v-model="form.studentName" class="inp" placeholder="学生姓名" />
      <input v-model="form.parentName" class="inp" placeholder="家长姓名" />
      <input v-model="form.relation" class="inp" placeholder="关系（父/母/其他）" />
      <input v-model="form.phone" class="inp" placeholder="电话" />
      <input v-model="form.wechat" class="inp" placeholder="微信" />
      <textarea v-model="form.content" class="inp area" placeholder="沟通内容" />
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
const form = ref({ studentName: '', parentName: '', relation: '', phone: '', wechat: '', content: '' })

async function load() { list.value = await api.get('/parent-contacts') }
onShow(load)

async function add() {
  if (!form.value.studentName) return uni.showToast({ title: '请填学生姓名', icon: 'none' })
  try {
    const r = await api.post('/parent-contacts', { ...form.value, method: form.value.phone ? '电话' : '微信' })
    list.value.unshift(r)
    showAdd.value = false
    form.value = { studentName: '', parentName: '', relation: '', phone: '', wechat: '', content: '' }
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) { uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' }) }
}
async function follow(p) {
  uni.showModal({
    title: '跟进记录', editable: true, placeholderText: '填写后续跟进',
    success: async (m) => {
      if (!m.confirm) return
      try { const r = await api.patch('/parent-contacts/' + p.id, { followUp: m.content }); p.followUp = r.followUp; uni.showToast({ title: '已更新', icon: 'none' }) }
      catch (e) { uni.showToast({ title: '失败', icon: 'none' }) }
    },
  })
}
async function del(p) {
  uni.showModal({ title: '删除', content: p.studentName, success: async (m) => {
    if (!m.confirm) return
    try { await api.del('/parent-contacts/' + p.id); list.value = list.value.filter((x) => x.id !== p.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.bar { text-align: right; margin-bottom: 16rpx; }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 24rpx; }
.c { padding: 18rpx 0; border-bottom: 1px solid #f3f3f3; }
.top { display: flex; gap: 12rpx; align-items: center; }
.stu { font-size: 30rpx; font-weight: 700; color: #4a3f35; }
.rel { font-size: 24rpx; color: #9aa0a6; }
.meta { font-size: 24rpx; color: #9aa0a6; margin: 6rpx 0; }
.ct { font-size: 26rpx; color: #5a5048; white-space: pre-wrap; }
.fu { font-size: 24rpx; color: #a07b3b; margin-top: 6rpx; }
.acts { display: flex; gap: 28rpx; margin-top: 8rpx; }
.a { font-size: 26rpx; color: #409eff; }
.a.del { color: #e06c75; }
.empty { text-align: center; color: #9aa0a6; padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 110rpx; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .list, .dark .sheet { background: var(--c-card); }
.dark .stu { color: var(--c-title); }
.dark .ct { color: var(--c-sub); }
.dark .c { border-color: var(--c-input-border); }
.dark .inp { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
</style>
