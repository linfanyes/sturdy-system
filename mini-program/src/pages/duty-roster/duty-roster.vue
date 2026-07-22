<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <picker :range="classOpts" @change="pickClass">
      <view class="picker">班级：{{ selName }}</view>
    </picker>
    <view class="topbar">
      <text class="cnt">共 {{ rosters.length }} 张轮值表</text>
      <view class="new" @click="openCreate">＋ 新建轮值表</view>
    </view>

    <EmptyState v-if="!rosters.length" icon="📋" :text="classId ? '还没有轮值表' : '请先在上方选择班级'" hint="点击右上角创建" />

    <view class="roster" v-for="r in rosters" :key="r.id">
      <view class="r-h">
        <view class="r-title">
          <text class="r-name">{{ r.name }}</text>
          <text class="tag" :class="r.type === '值日' ? 't-zh' : 't-bn'">{{ r.type }}</text>
        </view>
        <view class="r-acts">
          <text class="ed" @click="openEdit(r)">编辑</text>
          <text class="del" @click="remove(r)">删除</text>
        </view>
      </view>
      <view class="r-body">
        <view class="row" v-for="(a, i) in r.assignments" :key="i">
          <text class="date">{{ a.date }} 周{{ dayName(a.date) }}</text>
          <view class="persons">
            <text class="p" v-for="(p, pi) in a.persons" :key="pi">{{ p }}</text>
            <text class="p none" v-if="!a.persons.length">—</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 编辑弹窗 -->
    <view class="mask" v-if="editOpen" @click="editOpen = false">
      <view class="sheet" @click.stop>
        <view class="sh-h">{{ editId ? '编辑轮值表' : '新建轮值表' }}</view>
        <view class="row2">
          <view class="fld">
            <text class="lab">名称</text>
            <input v-model="draft.name" class="inp" placeholder="如：本周值日表" />
          </view>
          <view class="fld">
            <text class="lab">类型</text>
            <view class="types">
              <text class="ty" :class="draft.type === '值日' && 'on'" @click="draft.type = '值日'">值日</text>
              <text class="ty" :class="draft.type === '班干部' && 'on'" @click="draft.type = '班干部'">班干部</text>
            </view>
          </view>
        </view>

        <view class="r-list">
          <view class="r-item" v-for="(a, idx) in draft.assignments" :key="idx">
            <view class="ri-h">
              <picker mode="date" :value="a.date" @change="(e)=>a.date = e.detail.value">
                <view class="ri-date">{{ a.date }} 周{{ dayName(a.date) }}</view>
              </picker>
              <text class="ri-del" @click="delRow(idx)">删除</text>
            </view>
            <view class="ri-persons">
              <view class="pi" v-for="(p, pi) in a.persons" :key="pi">
                <input v-model="a.persons[pi]" class="pi-inp" placeholder="姓名" />
                <text class="pi-x" @click="a.persons.splice(pi, 1)">×</text>
              </view>
              <text class="pi-add" @click="a.persons.push('')">＋ 人员</text>
            </view>
          </view>
        </view>
        <view class="add-row" @click="addRow">＋ 添加一天</view>

        <view class="sh-acts">
          <button class="btn-c" @click="editOpen = false">取消</button>
          <button class="btn-s" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import EmptyState from '../../components/EmptyState/EmptyState.vue'
import { isNonEmpty } from '../../common/validators'

const classes = ref([])
const classId = ref('')
const rosters = ref([])

const classOpts = computed(() => classes.value.map((c) => c.name))
const selName = computed(() => {
  const c = classes.value.find((x) => x.id === classId.value)
  return c ? c.name : '请选择班级'
})

async function load() {
  classes.value = await api.getList('/classes', { silent: true })
  if (!classId.value && classes.value.length) classId.value = classes.value[0].id
  if (classId.value) await loadRoster()
}
async function loadRoster() {
  if (!classId.value) { rosters.value = []; return }
  const list = await api.getList('/duty-rosters?classId=' + encodeURIComponent(classId.value), { silent: true })
  rosters.value = list.map((r) => ({
    ...r,
    assignments: (typeof r.assignments === 'string' ? JSON.parse(r.assignments) : r.assignments) || [],
  }))
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
function pickClass(ev) { classId.value = classes.value[ev.detail.value].id; loadRoster() }

function dayName(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.replace(/-/g, '/'))
  return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
}
function nextWeekdays(count) {
  const dates = []
  const d = new Date()
  while (dates.length < count) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow >= 1 && dow <= 5) dates.push(fmt(d))
  }
  return dates
}
function fmt(d) {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return y + '-' + m + '-' + day
}

// 编辑
const editOpen = ref(false)
const editId = ref(null)
const saving = ref(false)
const draft = ref({ name: '', type: '值日', assignments: [] })

function openCreate() {
  if (!classId.value) return uni.showToast({ title: '请先选班级', icon: 'none' })
  editId.value = null
  draft.value = {
    name: '值日安排表',
    type: '值日',
    assignments: nextWeekdays(5).map((d) => ({ date: d, persons: [] })),
  }
  editOpen.value = true
}
function openEdit(r) {
  editId.value = r.id
  draft.value = {
    name: r.name,
    type: r.type,
    assignments: (r.assignments || []).map((a) => ({ date: a.date, persons: [...a.persons] })),
  }
  editOpen.value = true
}
function addRow() {
  draft.value.assignments.push({ date: fmt(new Date()), persons: [] })
}
function delRow(idx) {
  draft.value.assignments.splice(idx, 1)
}
async function save() {
  if (saving.value) return
  if (!isNonEmpty(draft.value.name)) return uni.showToast({ title: '请输入名称', icon: 'none' })
  const payload = {
    classId: classId.value,
    name: draft.value.name,
    type: draft.value.type,
    assignments: draft.value.assignments
      .filter((a) => a.persons.some((p) => (p || '').trim()))
      .map((a) => ({ date: a.date, persons: a.persons.map((p) => (p || '').trim()).filter(Boolean) })),
  }
  saving.value = true
  try {
    if (editId.value) {
      const r = await api.patch('/duty-rosters/' + editId.value, payload)
      Object.assign(rosters.value.find((x) => x.id === editId.value), r)
      uni.showToast({ title: '已更新', icon: 'none' })
    } else {
      const r = await api.post('/duty-rosters', payload)
      rosters.value.push({ ...r, assignments: payload.assignments })
      uni.showToast({ title: '已创建', icon: 'none' })
    }
    editOpen.value = false
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}
function remove(r) {
  uni.showModal({
    title: '删除轮值表', content: '确定删除「' + r.name + '」？',
    success: async (res) => {
      if (!res.confirm) return
      uni.showLoading({ title: '删除中…', mask: true })
      try { await api.del('/duty-rosters/' + r.id); rosters.value = rosters.value.filter((x) => x.id !== r.id); uni.showToast({ title: '已删除', icon: 'none' }) }
      catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
      finally { uni.hideLoading() }
    }
  })
}
</script>

<style scoped>
.page { padding: 24rpx; }
.picker { background: var(--c-card); border-radius: 16rpx; padding: 22rpx 24rpx; margin-bottom: 14rpx; font-size: 28rpx; }
.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.cnt { font-size: 24rpx; color: var(--c-sub); }
.new { font-size: 26rpx; color: #fff; background: var(--c-primary); padding: 12rpx 24rpx; border-radius: 30rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 60rpx 0; }
.roster { background: var(--c-card); border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 16rpx; }
.r-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.r-title { display: flex; align-items: center; gap: 12rpx; }
.r-name { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.tag { font-size: 20rpx; padding: 2rpx 12rpx; border-radius: 16rpx; }
.t-zh { background: #e8f9e8; color: var(--c-primary); }
.t-bn { background: #e8f1fb; color: #409eff; }
.r-acts { display: flex; gap: 18rpx; }
.ed { font-size: 24rpx; color: #a07b3b; }
.del { font-size: 24rpx; color: var(--c-danger); }
.r-body { border-top: 1px solid var(--c-card2); padding-top: 8rpx; }
.row { display: flex; align-items: flex-start; gap: 16rpx; padding: 12rpx 0; border-bottom: 1px solid #f7f7f7; }
.row:last-child { border-bottom: none; }
.date { font-size: 24rpx; color: var(--c-title); width: 200rpx; flex: 0 0 auto; }
.persons { flex: 1; display: flex; flex-wrap: wrap; gap: 10rpx; }
.p { font-size: 22rpx; background: #f7f1e6; color: #a07b3b; padding: 4rpx 16rpx; border-radius: 20rpx; }
.p.none { background: var(--c-card2); color: #bbb; }
/* 弹窗 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; z-index: 99; }
.sheet { background: var(--c-card); width: 100%; border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 88vh; overflow-y: auto; }
.sh-h { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.row2 { display: flex; gap: 18rpx; }
.fld { flex: 1; }
.lab { font-size: 24rpx; color: #5a5048; display: block; margin-bottom: 8rpx; }
.inp { background: #f6f7fb; border-radius: 12rpx; padding: 16rpx 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.types { display: flex; gap: 12rpx; }
.ty { font-size: 24rpx; padding: 14rpx 24rpx; border-radius: 12rpx; background: var(--c-card2); color: var(--c-sub); }
.ty.on { background: #f7d9a8; color: #a07b3b; }
.r-list { margin-top: 10rpx; max-height: 420rpx; overflow-y: auto; }
.r-item { background: #f6f7fb; border-radius: 12rpx; padding: 14rpx; margin-bottom: 12rpx; }
.ri-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.ri-date { font-size: 26rpx; color: var(--c-title); background: var(--c-card); padding: 10rpx 16rpx; border-radius: 10rpx; }
.ri-del { font-size: 24rpx; color: var(--c-danger); }
.ri-persons { display: flex; flex-wrap: wrap; gap: 10rpx; }
.pi { display: flex; align-items: center; gap: 6rpx; background: var(--c-card); border-radius: 10rpx; padding: 4rpx 8rpx; }
.pi-inp { width: 120rpx; font-size: 24rpx; }
.pi-x { color: var(--c-danger); font-size: 28rpx; }
.pi-add { font-size: 22rpx; color: var(--c-primary); padding: 8rpx 12rpx; }
.add-row { text-align: center; font-size: 26rpx; color: #a07b3b; padding: 16rpx; border: 1px dashed #e6d3b0; border-radius: 12rpx; margin-top: 6rpx; }
.sh-acts { display: flex; gap: 18rpx; margin-top: 20rpx; }
.btn-c { flex: 1; background: var(--c-card2); color: #5a5048; border-radius: 50rpx; }
.btn-s { flex: 1; background: var(--c-primary); color: #fff; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .picker, .dark .roster, .dark .sheet { background: var(--c-card); }
.dark .r-name, .dark .date, .dark .ri-date, .dark .sh-h { color: var(--c-title); }
.dark .r-body, .dark .row { border-color: var(--c-input-border); }
.dark .p { background: var(--c-card2); color: var(--c-accent); }
.dark .inp, .dark .r-item, .dark .pi { background: var(--c-input); }
.dark .ty { background: var(--c-card2); color: var(--c-sub); }
.dark .btn-c { background: var(--c-card2); color: var(--c-title); }
</style>
