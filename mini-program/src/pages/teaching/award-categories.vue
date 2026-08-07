<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">奖项类别</view>
    <view class="bar">
      <text class="bar-text">管理奖项类别，如 "学习之星"、"进步之星" 等</text>
      <text class="act" @click="openAdd">＋ 添加</text>
    </view>

    <view v-if="loading" class="loading">加载中…</view>
    <view v-else-if="!list.length" class="empty">暂无奖项类别，点击添加</view>
    <view v-else class="list">
      <view v-for="it in list" :key="it.id" class="item">
        <view class="it-top">
          <text class="icon">{{ it.icon || '🏆' }}</text>
          <text class="name">{{ it.name }}</text>
          <text class="cat">{{ it.category }}</text>
        </view>
        <view v-if="it.desc" class="desc">{{ it.desc }}</view>
        <view class="ops">
          <text class="op" @click="openEdit(it)">编辑</text>
          <text class="op del" @click="remove(it)">删除</text>
        </view>
      </view>
    </view>

    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="sheet safe-bottom" @click.stop>
        <view class="sh-t">{{ editing ? '编辑' : '新增' }}奖项类别</view>
        <view class="field">
          <text class="label">名称 *</text>
          <input v-model="form.name" class="inp" placeholder="如：学习之星" />
        </view>
        <view class="field">
          <text class="label">分类</text>
          <picker :range="cats" :value="catIdx" @change="onCatChange">
            <view class="picker">{{ form.category || '请选择' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">图标</text>
          <input v-model="form.icon" class="inp" placeholder="如：🏆" />
        </view>
        <view class="field">
          <text class="label">描述</text>
          <textarea v-model="form.desc" class="inp area" placeholder="类别描述" />
        </view>
        <view class="btn-row">
          <button class="btn cancel" @click="showForm = false">取消</button>
          <button class="btn send" :disabled="saving" @click="submit">{{ saving ? '保存中…' : '保存' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { listAwardCategories, createAwardCategory, updateAwardCategory, removeAwardCategory } from '@/api/award'
import { theme } from '../../common/store'

const list = ref([])
const loading = ref(false)
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const cats = ['学习', '品德', '体育', '艺术', '劳动', '其他']
const catIdx = ref(0)
const form = ref({ name: '', category: '学习', icon: '', desc: '' })

function onCatChange(e) {
  catIdx.value = e.detail.value
  form.value.category = cats[e.detail.value]
}

async function load() {
  loading.value = true
  try {
    const res = await listAwardCategories({ take: 200 })
    list.value = Array.isArray(res) ? res : (res.items || [])
  } catch (e) { list.value = [] }
  finally { loading.value = false }
}

function openAdd() {
  editing.value = null
  form.value = { name: '', category: '学习', icon: '', desc: '' }
  catIdx.value = 0
  showForm.value = true
}

function openEdit(it) {
  editing.value = it
  form.value = { name: it.name, category: it.category || '学习', icon: it.icon || '', desc: it.desc || '' }
  catIdx.value = cats.indexOf(it.category) >= 0 ? cats.indexOf(it.category) : 0
  showForm.value = true
}

async function submit() {
  if (!form.value.name.trim()) return uni.showToast({ title: '请填写名称', icon: 'none' })
  saving.value = true
  try {
    if (editing.value) {
      await updateAwardCategory(editing.value.id, form.value)
    } else {
      await createAwardCategory(form.value)
    }
    showForm.value = false
    uni.showToast({ title: '保存成功', icon: 'success' })
    load()
  } catch (e) { uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' }) }
  finally { saving.value = false }
}

async function remove(it) {
  uni.showModal({
    title: '删除确认', content: '确定删除"' + it.name + '"？',
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await removeAwardCategory(it.id)
        list.value = list.value.filter(x => x.id !== it.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    }
  })
}

onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.bar-text { font-size: 24rpx; color: var(--c-sub); }
.act { font-size: 26rpx; color: var(--c-blue); padding: 8rpx 20rpx; background: var(--c-card); border-radius: 30rpx; }
.loading, .empty { text-align: center; padding: 80rpx 0; font-size: 28rpx; color: var(--c-sub); }
.list { }
.item { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.it-top { display: flex; align-items: center; gap: 12rpx; }
.icon { font-size: 32rpx; }
.name { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.cat { font-size: 22rpx; color: var(--c-sub); background: var(--c-card2); padding: 2rpx 12rpx; border-radius: 20rpx; margin-left: auto; }
.desc { font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; }
.ops { display: flex; gap: 20rpx; margin-top: 12rpx; }
.op { font-size: 24rpx; color: var(--c-blue); }
.op.del { color: #e64340; }

.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 60; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 36rpx; box-sizing: border-box; max-height: 85vh; overflow-y: auto; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; text-align: center; }
.field { margin-bottom: 18rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.area { height: 150rpx; }
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); background: var(--c-input); }
.btn-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.send { background: var(--c-primary); color: #fff; }
.btn.send[disabled] { opacity: 0.6; }
</style>