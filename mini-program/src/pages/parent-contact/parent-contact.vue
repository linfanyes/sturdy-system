<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="filter">
      <picker :range="classOptions" range-key="label" :value="classIdx" @change="onClassChange">
        <view class="picker-val">班级：{{ classOptions[classIdx] && classOptions[classIdx].label }}</view>
      </picker>
      <text class="count">共 {{ list.length }} 条</text>
    </view>

    <view class="bar"><text class="add" @click="openAdd">+ 新增联系</text></view>
    <view class="list">
      <view class="c" v-for="p in list" :key="p.id">
        <view class="top">
          <text class="stu">{{ p.studentName }}</text>
          <text class="cls" v-if="classNameOf(p.classId)">{{ classNameOf(p.classId) }}</text>
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
      <EmptyState v-if="!list.length" icon="📞" text="暂无联系记录" hint="点击「+ 新增联系」记录与家长的沟通" />
    </view>

    <view class="sheet" v-if="showAdd">
      <view class="row">
        <picker class="half" :range="classList" range-key="name" :value="formClassIdx" @change="(e) => (formClassIdx = e.detail.value)">
          <view class="inp picker">班级：{{ formClassIdx >= 0 ? classList[formClassIdx].name : '请选择' }}</view>
        </picker>
        <input v-model="form.studentName" class="inp half" placeholder="学生姓名" />
      </view>
      <input v-model="form.parentName" class="inp" placeholder="家长姓名" />
      <input v-model="form.relation" class="inp" placeholder="关系（父/母/其他）" />
      <input v-model="form.phone" class="inp" placeholder="电话" />
      <input v-model="form.wechat" class="inp" placeholder="微信" />
      <textarea v-model="form.content" class="inp area" placeholder="沟通内容" />
      <button class="ok" :disabled="saving" @click="add">{{ saving ? '保存中…' : '保存' }}</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { isPhone } from '../../common/validators'
import { theme } from '../../common/store'

const list = ref([])
const classList = ref([])
const showAdd = ref(false)
const saving = ref(false)
// 顶部筛选：0 = 全部；>0 对应 classList[idx-1]
const classIdx = ref(0)
// 新增表单中选中的班级下标（-1 未选）
const formClassIdx = ref(-1)
const form = ref({ studentName: '', parentName: '', relation: '', phone: '', wechat: '', content: '' })

const classOptions = computed(() => [
  { label: '全部', value: '' },
  ...classList.value.map((c) => ({ label: c.name, value: c.id })),
])

const classNameOf = (id) => {
  if (!id) return ''
  const c = classList.value.find((x) => x.id === id)
  return c ? c.name : ''
}

async function loadClasses() {
  classList.value = await api.getList('/classes', { silent: true })
}

async function load() {
  const sel = classOptions.value[classIdx.value]
  const cid = sel ? sel.value : ''
  list.value = await api.getList(
    cid ? '/parent-contacts?classId=' + encodeURIComponent(cid) : '/parent-contacts',
    { loading: true, loadingText: '加载联系记录' },
  )
}

onShow(async () => {
  await loadClasses()
  await load()
})

// 下拉刷新：与 onShow 行为一致，先加载班级再加载联系记录
onPullDownRefresh(async () => {
  await loadClasses()
  await load()
  uni.stopPullDownRefresh()
})

function onClassChange(e) {
  classIdx.value = e.detail.value
  load()
}

function openAdd() {
  // 默认预选当前筛选班级（若非「全部」）
  if (classIdx.value > 0) {
    formClassIdx.value = classIdx.value - 1
  } else {
    formClassIdx.value = classList.value.length ? 0 : -1
  }
  showAdd.value = !showAdd.value
}

async function add() {
  if (!form.value.studentName) return uni.showToast({ title: '请填学生姓名', icon: 'none' })
  if (formClassIdx.value < 0 || !classList.value[formClassIdx.value]) {
    return uni.showToast({ title: '请选择班级', icon: 'none' })
  }
  const cls = classList.value[formClassIdx.value]
  if (form.value.phone && !isPhone(form.value.phone)) return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  saving.value = true
  try {
    const r = await api.post('/parent-contacts', {
      ...form.value,
      classId: cls.id,
      method: form.value.phone ? '电话' : '微信',
      date: new Date().toISOString().slice(0, 10),
    })
    list.value.unshift(r)
    showAdd.value = false
    form.value = { studentName: '', parentName: '', relation: '', phone: '', wechat: '', content: '' }
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) { uni.showToast({ title: '失败：' + (e.message || ''), icon: 'none' }) }
  finally { saving.value = false }
}
async function follow(p) {
  uni.showModal({
    title: '跟进记录', editable: true, placeholderText: '填写后续跟进',
    success: async (m) => {
      if (!m.confirm) return
      uni.showLoading({ title: '保存中…', mask: true })
      try { const r = await api.patch('/parent-contacts/' + p.id, { followUp: m.content }); p.followUp = r.followUp; uni.showToast({ title: '已更新', icon: 'none' }) }
      catch (e) { uni.showToast({ title: '失败', icon: 'none' }) }
      finally { uni.hideLoading() }
    },
  })
}
async function del(p) {
  uni.showModal({ title: '删除', content: p.studentName, success: async (m) => {
    if (!m.confirm) return
    uni.showLoading({ title: '删除中…', mask: true })
    try { await api.del('/parent-contacts/' + p.id); list.value = list.value.filter((x) => x.id !== p.id) }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    finally { uni.hideLoading() }
  } })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.filter { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.picker-val { font-size: 26rpx; color: var(--c-title); background: var(--c-card); border-radius: 30rpx; padding: 12rpx 24rpx; border: 1px solid var(--c-border); }
.count { margin-left: auto; font-size: 24rpx; color: var(--c-sub); }
.bar { text-align: right; margin-bottom: 16rpx; }
.add { font-size: 28rpx; color: var(--c-accent); font-weight: 600; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 10rpx 24rpx; }
.c { padding: 18rpx 0; border-bottom: 1px solid var(--c-card2); }
.top { display: flex; gap: 12rpx; align-items: center; flex-wrap: wrap; }
.stu { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.cls { font-size: 20rpx; color: #409eff; background: #e8f1fb; padding: 4rpx 14rpx; border-radius: 20rpx; }
.rel { font-size: 24rpx; color: var(--c-sub); }
.meta { font-size: 24rpx; color: var(--c-sub); margin: 6rpx 0; }
.ct { font-size: 26rpx; color: #5a5048; white-space: pre-wrap; }
.fu { font-size: 24rpx; color: #a07b3b; margin-top: 6rpx; }
.acts { display: flex; gap: 28rpx; margin-top: 8rpx; }
.a { font-size: 26rpx; color: #409eff; }
.a.del { color: var(--c-danger); }
.empty { text-align: center; color: var(--c-sub); padding: 40rpx 0; }
.sheet { margin-top: 16rpx; background: var(--c-card); border-radius: 16rpx; padding: 24rpx; }
.row { display: flex; gap: 14rpx; margin-bottom: 14rpx; }
.half { flex: 1; }
.inp { border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-card); }
.inp.picker { color: var(--c-title); line-height: 44rpx; }
.area { height: 110rpx; }
.ok { background: var(--c-primary); color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker-val, .dark .list, .dark .sheet { background: var(--c-card); color: var(--c-title); border-color: var(--c-border); }
.dark .picker-val { color: var(--c-title); }
.dark .stu { color: var(--c-title); }
.dark .ct { color: var(--c-sub); }
.dark .c { border-color: var(--c-input-border); }
.dark .inp { border-color: var(--c-input-border); background: var(--c-input); color: var(--c-text); }
.dark .cls { background: var(--c-card2); color: #6db3f2; }
</style>
