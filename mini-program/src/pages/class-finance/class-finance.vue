<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>

    <view class="sum" v-if="classId">
      <view class="s in"><text class="n">¥{{ totalIn }}</text><text class="l">收入</text></view>
      <view class="s out"><text class="n">¥{{ totalOut }}</text><text class="l">支出</text></view>
      <view class="s bal"><text class="n">¥{{ balance }}</text><text class="l">结余</text></view>
    </view>

    <view class="bar"><text class="add" @click="showAdd = !showAdd">+ 记一笔</text></view>
    <view class="list">
      <view class="e" v-for="it in sorted" :key="it.id">
        <view class="top">
          <text class="ty">{{ it.type || '支出' }}</text>
          <text class="amt" :class="Number(it.amount) >= 0 ? 'plus' : 'minus'">{{ it.amount >= 0 ? '+' : '' }}{{ it.amount }}</text>
        </view>
        <view class="meta">{{ it.category || '' }} · {{ it.date }} · {{ it.handler || '' }}</view>
        <view class="ct" v-if="it.description">{{ it.description }}</view>
        <text class="del" @click="del(it)">删除</text>
      </view>
      <view class="empty" v-if="!sorted.length">暂无记录</view>
    </view>

    <view class="sheet" v-if="showAdd">
      <view class="seg">
        <text class="seg-i" :class="form.type==='收入' && 'on'" @click="form.type='收入'">收入</text>
        <text class="seg-i" :class="form.type==='支出' && 'on'" @click="form.type='支出'">支出</text>
      </view>
      <picker :range="cats" @change="(e)=>form.category=cats[e.detail.value]">
        <view class="picker sm">分类：{{ form.category || '请选择' }}</view>
      </picker>
      <input v-model="form.amount" type="digit" class="inp" placeholder="金额（正为收入，负为支出）" />
      <input v-model="form.handler" class="inp" placeholder="经手人" />
      <picker mode="date" :value="form.date" @change="(e)=>form.date = e.detail.value">
        <view class="picker sm">日期：{{ form.date || '今天' }}</view>
      </picker>
      <textarea v-model="form.description" class="inp area" placeholder="说明（可选）" />
      <button class="ok" :disabled="saving" @click="add">{{ saving ? '保存中…' : '保存' }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import { isAmount } from '../../common/validators'

const cats = ['班费', '活动', '资料', '奖品', '午餐', '交通', '其他']
const classes = ref([])
const classId = ref('')
const list = ref([])
const showAdd = ref(false)
const form = ref({ type: '支出', category: '', amount: '', handler: '', date: '', description: '' })
const saving = ref(false)

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})
const sorted = computed(() => [...list.value].sort((a, b) => (b.date || '').localeCompare(a.date || '')))
const totalIn = computed(() => list.value.filter((x) => Number(x.amount) >= 0).reduce((s, x) => s + Number(x.amount || 0), 0))
const totalOut = computed(() => list.value.filter((x) => Number(x.amount) < 0).reduce((s, x) => s + Number(x.amount || 0), 0))
const balance = computed(() => totalIn.value + totalOut.value)

async function load() {
  classes.value = await api.getList('/classes', { silent: true })
  if (classId.value) await loadList()
}
async function loadList() {
  if (!classId.value) return
  list.value = await api.getList('/class-expenses?classId=' + encodeURIComponent(classId.value), { silent: true })
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
function pickClass(ev) { classId.value = classes.value[ev.detail.value].id; loadList() }

async function add() {
  if (!classId.value) return uni.showToast({ title: '请先选班级', icon: 'none' })
  if (form.value.amount === '') return uni.showToast({ title: '请填金额', icon: 'none' })
  if (!isAmount(form.value.amount)) return uni.showToast({ title: '金额必须为正数（最多两位小数）', icon: 'none' })
  if (!['收入', '支出'].includes(form.value.type)) return uni.showToast({ title: '类型必须是收入或支出', icon: 'none' })
  saving.value = true
  try {
    const r = await api.post('/class-expenses', {
      classId: classId.value, type: form.value.type, category: form.value.category,
      amount: (form.value.type === '支出' ? -1 : 1) * Math.abs(Number(form.value.amount) || 0), handler: form.value.handler,
      date: form.value.date, description: form.value.description,
    })
    list.value.unshift(r)
    showAdd.value = false
    form.value = { type: '支出', category: '', amount: '', handler: '', date: '', description: '' }
    uni.showToast({ title: '已记录', icon: 'none' })
  } catch (e) { uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' }) }
  finally { saving.value = false }
}
async function del(it) {
  uni.showModal({ title: '删除', content: String(it.amount), success: async (m) => {
    if (!m.confirm) return
    uni.showLoading({ title: '删除中…', mask: true })
    try { await api.del('/class-expenses/' + it.id); list.value = list.value.filter((x) => x.id !== it.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    finally { uni.hideLoading() }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.picker { background: #fff; border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.sum { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.s { flex: 1; border-radius: 14rpx; padding: 18rpx 0; text-align: center; }
.s.in { background: #e8f9e8; }
.s.out { background: #fde8ea; }
.s.bal { background: #fff3e0; }
.n { display: block; font-size: 34rpx; font-weight: 800; color: #4a3f35; }
.l { font-size: 22rpx; color: #888; }
.bar { text-align: right; margin-bottom: 14rpx; }
.add { font-size: 28rpx; color: #e6a23c; font-weight: 600; }
.list { background: #fff; border-radius: 16rpx; padding: 10rpx 24rpx; }
.e { padding: 16rpx 0; border-bottom: 1px solid #f3f3f3; }
.top { display: flex; justify-content: space-between; align-items: center; }
.ty { font-size: 28rpx; color: #4a3f35; font-weight: 600; }
.amt { font-size: 30rpx; font-weight: 700; }
.plus { color: #07c160; }
.minus { color: #e06c75; }
.meta { font-size: 24rpx; color: #9aa0a6; margin: 4rpx 0; }
.ct { font-size: 26rpx; color: #5a5048; }
.del { font-size: 24rpx; color: #e06c75; }
.empty { text-align: center; color: #9aa0a6; padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; }
.inp { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: #fff; }
.area { height: 100rpx; }
.seg { display: flex; background: #f3f3f3; border-radius: 12rpx; padding: 6rpx; margin-bottom: 14rpx; }
.seg-i { flex: 1; text-align: center; font-size: 28rpx; padding: 14rpx 0; border-radius: 10rpx; color: #888; }
.seg-i.on { background: #fff; color: #07c160; font-weight: 700; box-shadow: 0 2rpx 6rpx rgba(0,0,0,.08); }
.picker.sm { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; background: #fff; }
.ok { background: #07c160; color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .list, .dark .sheet { background: var(--c-card); }
.dark .ty, .dark .n { color: var(--c-title); }
.dark .ct { color: var(--c-sub); }
.dark .e { border-color: var(--c-input-border); }
.dark .inp, .dark .picker.sm { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .seg { background: var(--c-input); }
.dark .seg-i.on { background: var(--c-card); color: var(--c-accent); }
</style>
