<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="filter">
      <picker :range="classOptions" range-key="label" :value="classIdx" @change="onClassChange">
        <view class="picker-val">班级：{{ classOptions[classIdx] && classOptions[classIdx].label }}</view>
      </picker>
      <text class="count">共 {{ list.length }} 条</text>
    </view>

    <view class="bar"><text class="add" @click="openAdd">+ 新增联系</text><text class="add batch" @click="showBatch = !showBatch">📨 批量通知</text></view>
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
      <input v-model="form.phone" class="inp" placeholder="电话" @blur="checkPhone" />
      <text v-if="phoneError" class="field-err">{{ phoneError }}</text>
      <input v-model="form.wechat" class="inp" placeholder="微信" />
      <textarea v-model="form.content" class="inp area" placeholder="沟通内容" />
      <button class="ok" :disabled="saving" @click="add">{{ saving ? '保存中…' : '保存' }}</button>
    </view>

    <!-- 批量通知 -->
    <view v-if="showBatch" class="sheet2">
      <view class="sh-t">📨 批量家长通知</view>
      <picker :range="classList.map(c=>c.name)" @change="pickBatchClass">
        <view class="inp picker">班级：{{ batchClassName || '请选择' }}</view>
      </picker>
      <view class="batch-list" v-if="batchStudents.length">
        <label class="batch-all" @click="toggleAll"><text class="ck" :class="allSelected && 'on'"></text>全选（{{ batchStudents.length }} 人）</label>
        <view class="batch-row" v-for="s in batchStudents" :key="s.id" @click="toggleStudent(s.id)">
          <text class="ck" :class="batchSel.has(s.id) && 'on'"></text>
          <text class="bs-name">{{ s.name }}</text>
          <text class="bs-phone">{{ s.parentPhone || '无电话' }}</text>
          <text class="bs-parent">{{ s.parentName || '' }}</text>
        </view>
      </view>
      <textarea v-model="batchMsg" class="inp area" placeholder="通知内容（可用 {{name}} 表示学生姓名、{{parent}} 表示家长称呼）" />
      <view class="preview" v-if="batchPreview">📝 预览：{{ batchPreview }}</view>
      <button class="ok" :disabled="!batchSel.size || !batchMsg.trim()" @click="sendBatch">📋 生成通知文案（复制到剪贴板）</button>
      <button class="ok ghost" @click="showBatch = false">关闭</button>
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
const showBatch = ref(false)
const batchStudents = ref([])
const batchClassName = ref('')
const batchSel = ref(new Set())
const batchMsg = ref('')

const allSelected = computed(() => batchStudents.value.length > 0 && batchSel.value.size === batchStudents.value.length)

const batchPreview = computed(() => {
  const first = [...batchSel.value][0]
  if (!first || !batchMsg.value) return ''
  const s = batchStudents.value.find((x) => x.id === first)
  if (!s) return ''
  return batchMsg.value.replace(/{{name}}/g, s.name).replace(/{{parent}}/g, s.parentName || '家长')
})

function pickBatchClass(e) {
  const c = classList.value[e.detail.value]
  batchClassName.value = c.name
  batchSel.value = new Set()
  api.get('/students?classId=' + encodeURIComponent(c.id)).then((arr) => {
    batchStudents.value = (arr || []).filter((s) => s.parentPhone)
  })
}
function toggleAll() {
  if (allSelected.value) batchSel.value = new Set()
  else batchSel.value = new Set(batchStudents.value.map((s) => s.id))
}
function toggleStudent(id) {
  const ns = new Set(batchSel.value)
  if (ns.has(id)) ns.delete(id); else ns.add(id)
  batchSel.value = ns
}
function sendBatch() {
  if (!batchSel.value.size || !batchMsg.value.trim()) return
  const selStudents = batchStudents.value.filter((s) => batchSel.value.has(s.id))
  const lines = selStudents.map((s) => {
    const msg = batchMsg.value.replace(/{{name}}/g, s.name).replace(/{{parent}}/g, s.parentName || '家长')
    return `【${s.name}家长 ${s.parentName || ''}】${s.parentPhone || ''}\n${msg}`
  })
  const text = '===== 批量通知（共 ' + selStudents.length + ' 人）=====\n\n' + lines.join('\n\n---\n\n')
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: '已复制 ' + selStudents.length + ' 条通知', icon: 'success' })
      // 自动生成家长联系记录
      Promise.all(selStudents.map((s) =>
        api.post('/parent-contacts', {
          studentId: s.id, studentName: s.name, parentName: s.parentName || '',
          phone: s.parentPhone || '', method: '通知', date: new Date().toISOString().slice(0, 10),
          content: batchMsg.value.replace(/{{name}}/g, s.name).replace(/{{parent}}/g, s.parentName || '家长'),
        }).catch(() => {}),
      )).then(() => load())
    },
  })
}
const saving = ref(false)
// 顶部筛选：0 = 全部；>0 对应 classList[idx-1]
const classIdx = ref(0)
// 新增表单中选中的班级下标（-1 未选）
const formClassIdx = ref(-1)
const form = ref({ studentName: '', parentName: '', relation: '', phone: '', wechat: '', content: '' })
const phoneError = ref('')

function checkPhone() {
  if (form.value.phone && !isPhone(form.value.phone)) {
    phoneError.value = '手机号格式错误（11 位）'
  } else {
    phoneError.value = ''
  }
}

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
  if (form.value.phone && !isPhone(form.value.phone)) {
    phoneError.value = '手机号格式错误（11 位）'
    return uni.showToast({ title: phoneError.value, icon: 'none' })
  }
  phoneError.value = ''
  const cls = classList.value[formClassIdx.value]
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
.add.batch { margin-left: 16rpx; color: #409eff; }
/* 批量通知 */
.sheet2 { margin-top: 16rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; }
.batch-list { max-height: 400rpx; overflow-y: auto; margin: 12rpx 0; border: 1px solid var(--c-border); border-radius: 12rpx; }
.batch-all { display: flex; align-items: center; gap: 10rpx; padding: 12rpx 14rpx; background: var(--c-card2); font-size: 26rpx; color: var(--c-title); font-weight: 600; }
.batch-row { display: flex; align-items: center; gap: 10rpx; padding: 12rpx 14rpx; border-top: 1px solid var(--c-border); }
.ck { width: 28rpx; height: 28rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.ck.on { background: var(--c-primary); border-color: var(--c-primary); }
.bs-name { width: 110rpx; font-size: 26rpx; color: var(--c-title); }
.bs-phone { flex: 1; font-size: 22rpx; color: var(--c-sub); }
.bs-parent { width: 100rpx; font-size: 22rpx; color: var(--c-sub); text-align: right; }
.preview { font-size: 24rpx; color: var(--c-sub); background: var(--c-card2); border-radius: 10rpx; padding: 12rpx; margin: 10rpx 0; line-height: 1.6; }
.ok.ghost { background: var(--c-card2); color: var(--c-sub); margin-top: 10rpx; }
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
.sheet { margin-top: 16rpx; background: var(--c-card); border-radius: 16rpx; padding: 24rpx; width: 100%; box-sizing: border-box; }
.row { display: flex; gap: 14rpx; margin-bottom: 14rpx; }
.half { flex: 1; }
.inp { border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx; margin-bottom: 14rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-card); }
.inp.picker { color: var(--c-title); line-height: 44rpx; }
.area { height: 110rpx; }
.ok { background: var(--c-primary); color: #fff; border-radius: 50rpx; }
.field-err { display: block; font-size: 22rpx; color: #e64340; margin-top: 4rpx; }
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
