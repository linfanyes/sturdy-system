<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="bar">
      <text class="title">{{ schema ? schema.title : '管理' }}</text>
      <view class="bar-ops">
        <button v-if="schema && schema.bulkImport" class="imp-btn" @click="openImport">📷 导入</button>
        <input v-if="schema && schema.search" v-model="kw" placeholder="搜索" class="search" />
      </view>
    </view>

    <view class="list">
      <view v-for="item in filtered" :key="item.id" class="item" @click="edit(item)">
        <view class="top">
          <text class="name">{{ displayValue(item, 0) }}</text>
        </view>
        <view class="meta" v-if="schema.display.length > 1">
          <text v-for="(k, i) in schema.display.slice(1)" :key="k" class="m">{{ displayValue(item, i + 1) }}</text>
        </view>
        <view class="ops">
          <text class="del" @click.stop="remove(item)">删除</text>
        </view>
      </view>
      <view v-if="!filtered.length" class="empty">暂无数据，点下方添加</view>
    </view>

    <button class="add" @click="openAdd">{{ showForm ? '收起' : '＋ 添加' + (schema ? schema.title : '') }}</button>

    <view v-if="showForm" class="form">
      <textarea
        v-for="f in textareas"
        :key="f.key"
        v-model="form[f.key]"
        :placeholder="f.label"
        class="ctrl"
      />
      <input
        v-for="f in inputs"
        :key="f.key"
        v-model="form[f.key]"
        :placeholder="f.label"
        class="ctrl"
      />
      <input
        v-for="f in numbers"
        :key="f.key"
        type="number"
        v-model="form[f.key]"
        :placeholder="f.label"
        class="ctrl"
      />
      <picker
        v-for="f in dates"
        :key="f.key"
        mode="date"
        :value="form[f.key]"
        @change="(e) => (form[f.key] = e.detail.value)"
      >
        <view class="ctrl picker">{{ form[f.key] || '选择' + f.label }}</view>
      </picker>
      <picker
        v-for="f in pickers"
        :key="f.key"
        :range="f.options"
        @change="(e) => (form[f.key] = f.options[e.detail.value])"
      >
        <view class="ctrl picker">{{ form[f.key] || '选择' + f.label }}</view>
      </picker>
      <button class="save" :disabled="saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
    </view>

    <!-- 课程表 AI 批量导入弹层 -->
    <view v-if="showImport" class="mask" @click.self="showImport = false">
      <view class="sheet">
        <view class="sheet-h">
          <text class="sheet-t">课程表 AI 批量导入</text>
          <text class="sheet-x" @click="showImport = false">✕</text>
        </view>

        <view class="fld">
          <text class="fld-l">班级</text>
          <picker :range="classNames" @change="(e) => (classIdx = e.detail.value)">
            <view class="fld-v">{{ classNames[classIdx] || '请选择班级' }}</view>
          </picker>
        </view>

        <view class="src-row">
          <button class="src" @click="chooseImage">📷 图片识别</button>
          <button class="src" @click="chooseFile">📄 Excel/CSV</button>
        </view>
        <view v-if="picked" class="picked">已选：{{ picked.name }}（{{ (picked.size / 1024).toFixed(0) }}KB）</view>

        <button class="rec" :disabled="!canRecognize || recognizing" @click="recognize">
          {{ recognizing ? '识别中…' : '开始识别' }}
        </button>

        <view v-if="preview.items.length || preview.errors.length" class="pv">
          <view class="pv-h">识别结果：有效 {{ preview.items.length }} 条，异常 {{ preview.errors.length }} 条</view>
          <view v-if="preview.errors.length" class="pv-err">
            <view v-for="(e, i) in preview.errors" :key="i" class="err-row">· 第{{ e.row }}行：{{ e.reason }}</view>
          </view>
          <scroll-view scroll-y class="pv-list">
            <view v-for="(it, i) in preview.items" :key="i" class="pv-row">
              <text class="c-dow">{{ dow[it.dayOfWeek] }}</text>
              <text class="c-per">{{ it.section || ('第' + it.period + '节') }}</text>
              <text class="c-wk">{{ weekTypeLabel(it.weekType) }}</text>
              <text class="c-subj">{{ it.subject }}</text>
              <text class="c-tech">{{ it.teacher || '-' }}</text>
            </view>
          </scroll-view>
        </view>

        <view class="sheet-ops">
          <button class="cancel" @click="showImport = false">取消</button>
          <button class="confirm" :disabled="!preview.items.length" @click="confirmImport">
            确认导入 {{ preview.items.length }} 条
          </button>
        </view>
        <view class="tip">支持课程表截图（图片）或 Excel/CSV，AI 自动识别星期/节次/科目/教师。</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { CRUD_SCHEMA } from '../../common/crud-schema'
import { theme } from '../../common/store'
import { compressImage } from '../../common/image'

const schema = ref(null)
const list = ref([])
const kw = ref('')
const showForm = ref(false)
const editingId = ref('')
const form = ref({})
const saving = ref(false)

onLoad((q) => {
  const s = CRUD_SCHEMA[q.type]
  if (!s) {
    uni.showToast({ title: '未知类型: ' + q.type, icon: 'none' })
    return
  }
  schema.value = s
  uni.setNavigationBarTitle({ title: s.title })
  load()
})

onShow(load)

async function load() {
  if (!schema.value) return
  try {
    list.value = await api.get(schema.value.prefix)
  } catch (e) {
    list.value = []
  }
}

const filtered = computed(() => {
  const s = schema.value
  if (!s || !s.search || !kw.value) return list.value
  const k = kw.value.toLowerCase()
  return list.value.filter((it) => String(it[s.search] || '').toLowerCase().includes(k))
})

const textareas = computed(() => schema.value.fields.filter((f) => f.type === 'textarea'))
const inputs = computed(() => schema.value.fields.filter((f) => f.type === 'input'))
const numbers = computed(() => schema.value.fields.filter((f) => f.type === 'number'))
const dates = computed(() => schema.value.fields.filter((f) => f.type === 'date'))
const pickers = computed(() => schema.value.fields.filter((f) => f.type === 'picker'))

function displayValue(item, idx) {
  const key = schema.value.display[idx]
  const v = item[key]
  if (key === 'dayOfWeek' && typeof v === 'number') return dow[v] || v
  if (key === 'weekType') {
    const map = { all: '全周', single: '单周', double: '双周' }
    const s = String(v || '').trim()
    return map[s] || (['全周', '单周', '双周'].includes(s) ? s : '全周')
  }
  if (key === 'period') {
    if (item.section) return item.section
    if (v === undefined || v === null || v === '') return '-'
    return /^\d+$/.test(String(v)) ? `第${v}节` : v
  }
  return v === undefined || v === null || v === '' ? '-' : v
}

function resetForm() {
  const f = {}
  schema.value.fields.forEach((field) => {
    f[field.key] = ''
  })
  form.value = f
}

function openAdd() {
  editingId.value = ''
  resetForm()
  showForm.value = !showForm.value
}

function edit(item) {
  editingId.value = item.id
  const f = {}
  schema.value.fields.forEach((field) => {
    f[field.key] = item[field.key] ?? ''
  })
  form.value = f
  showForm.value = true
}

async function save() {
  if (saving.value) return
  for (const f of schema.value.fields) {
    if (f.required && !String(form.value[f.key] ?? '').trim()) {
      return uni.showToast({ title: '请填写' + f.label, icon: 'none' })
    }
  }
  const payload = {}
  schema.value.fields.forEach((field) => {
    let v = form.value[field.key]
    if (field.type === 'number') v = v === '' || v == null ? undefined : Number(v)
    else if (field.type === 'picker' && field.options && field.options[0] === '是')
      v = v === '是'
    else if (v === '') v = undefined
    payload[field.key] = v
  })
  const p = schema.value.prefix
  saving.value = true
  try {
    if (editingId.value) {
      await api.patch(p + '/' + editingId.value, payload)
      uni.showToast({ title: '已更新', icon: 'success' })
    } else {
      await api.post(p, payload)
      uni.showToast({ title: '已添加', icon: 'success' })
    }
    showForm.value = false
    await load()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    saving.value = false
  }
}

function remove(item) {
  uni.showModal({
    title: '确认删除',
    content: '确定删除这条记录吗？此操作不可恢复。',
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await api.del(schema.value.prefix + '/' + item.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        load()
      } catch (e) {
        uni.showToast({ title: '删除失败：' + (e.message || '请重试'), icon: 'none' })
      }
    },
  })
}

/* ---------------- 课程表 AI 批量导入 ---------------- */
const dow = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const showImport = ref(false)
const classList = ref([])
const classNames = computed(() => (classList.value || []).map((c) => c.name || c.className || c.id))
const classIdx = ref(0)
const picked = ref(null)
const recognizing = ref(false)
const preview = reactive({ items: [], errors: [] })

const canRecognize = computed(() => !!picked.value && !!classNames.value[classIdx.value])

function selectedClassId() {
  const c = classList.value[classIdx.value]
  return c ? c.id : ''
}

function weekTypeLabel(w) {
  const map = { all: '全周', single: '单周', double: '双周' }
  return map[String(w || '').trim()] || '全周'
}

function openImport() {
  showImport.value = true
  preview.items = []
  preview.errors = []
  picked.value = null
  loadClasses()
}

async function loadClasses() {
  try {
    classList.value = (await api.get('/classes')) || []
    if (classIdx.value >= classList.value.length) classIdx.value = 0
  } catch (e) {
    classList.value = []
  }
}

function chooseImage() {
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sizeType: ['compressed', 'original'],
    success: async (res) => {
      const f = res.tempFiles[0]
      if (f.size > 10 * 1024 * 1024)
        return uni.showToast({ title: '图片过大（>10MB）', icon: 'none' })
      uni.showLoading({ title: '压缩中…' })
      let finalPath = f.tempFilePath
      let finalSize = f.size
      try {
        const r = await compressImage({ src: f.tempFilePath, maxWidth: 1600, maxHeight: 1600, quality: 80, fileType: 'jpg' })
        if (r.tempFilePath && r.size) {
          finalPath = r.tempFilePath
          finalSize = r.size
        }
      } catch (e) {
        // 压缩失败回退原图
      } finally {
        uni.hideLoading()
      }
      readBase64(finalPath).then((b) =>
        (picked.value = {
          name: (finalPath || '').split('/').pop() || 'image.jpg',
          size: finalSize,
          data: b,
          mode: 'image',
        }),
      )
      uni.showToast({ title: '已压缩 ' + Math.round(finalSize / 1024) + 'KB', icon: 'none' })
    },
    fail: () => {},
  })
}

function chooseFile() {
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['xls', 'xlsx', 'csv'],
    success: (res) => {
      const f = res.tempFiles[0]
      if (f.size > 4 * 1024 * 1024)
        return uni.showToast({ title: '文件过大（>4MB）', icon: 'none' })
      readBase64(f.path).then((b) =>
        (picked.value = {
          name: f.name,
          size: f.size,
          data: b,
          mode: f.name.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx',
        }),
      )
    },
    fail: () => {},
  })
}

function readBase64(path) {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success: (r) => resolve(r.data),
      fail: (e) => reject(e),
    })
  })
}

async function recognize() {
  if (!canRecognize.value)
    return uni.showToast({ title: '请先选择班级和文件', icon: 'none' })
  recognizing.value = true
  preview.items = []
  preview.errors = []
  try {
    const r = await api.post('/schedules/import-ai', {
      classId: selectedClassId(),
      mode: picked.value.mode,
      data: picked.value.data,
      filename: picked.value.name,
    })
    preview.items = r.items || []
    preview.errors = r.errors || []
    if (!preview.items.length && !preview.errors.length)
      uni.showToast({ title: '未识别到课程', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: (e && e.message) || '识别失败', icon: 'none' })
  } finally {
    recognizing.value = false
  }
}

async function confirmImport() {
  if (!preview.items.length) return
  try {
    const r = await api.post('/schedules/import-commit', {
      classId: selectedClassId(),
      items: preview.items,
    })
    uni.showToast({
      title: `导入成功 新增${r.created}/更新${r.updated}`,
      icon: 'success',
    })
    showImport.value = false
    load()
  } catch (e) {
    uni.showToast({ title: (e && e.message) || '导入失败', icon: 'none' })
  }
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20rpx; }
.bar-ops { display: flex; align-items: center; gap: 14rpx; }
.title { font-size: 34rpx; font-weight: 700; color: var(--c-title); }
.imp-btn { background: var(--c-accent); color: #fff; border-radius: 30rpx; font-size: 24rpx; padding: 0 22rpx; height: 60rpx; line-height: 60rpx; margin: 0; }
.imp-btn::after { border: none; }
.search { border: 1px solid var(--c-border); border-radius: 30rpx; padding: 10rpx 24rpx; font-size: 26rpx; width: 200rpx; background: var(--c-input); color: var(--c-text); }
.item { background: var(--c-card); border-radius: 20rpx; padding: 26rpx; margin-bottom: 16rpx; position: relative; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 32rpx; font-weight: 600; color: var(--c-text); }
.meta { color: var(--c-sub); font-size: 26rpx; margin-top: 8rpx; }
.meta .m { margin-right: 18rpx; }
.ops { position: absolute; right: 26rpx; bottom: 26rpx; }
.del { color: #e06c75; font-size: 26rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.add { margin-top: 16rpx; background: var(--c-accent); color: #fff; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.form { margin-top: 24rpx; background: var(--c-card); border-radius: 20rpx; padding: 30rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.ctrl { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: var(--c-text); background: var(--c-input); }
.picker { color: var(--c-title); min-height: 80rpx; line-height: 44rpx; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 10rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }

/* 导入弹层 */
.mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: flex-end; z-index: 50; }
.sheet { width: 100%; background: var(--c-card); border-radius: 28rpx 28rpx 0 0; padding: 30rpx; box-sizing: border-box; max-height: 88vh; display: flex; flex-direction: column; }
.sheet-h { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24rpx; }
.sheet-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.sheet-x { font-size: 36rpx; color: var(--c-sub); padding: 0 10rpx; }
.fld { display: flex; align-items: center; margin-bottom: 20rpx; }
.fld-l { font-size: 28rpx; color: var(--c-sub); width: 90rpx; }
.fld-v { flex: 1; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); }
.src-row { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.src { flex: 1; background: var(--c-input); color: var(--c-text); border-radius: 12rpx; font-size: 28rpx; height: 80rpx; line-height: 80rpx; margin: 0; }
.src::after { border: none; }
.picked { font-size: 24rpx; color: var(--c-sub); margin-bottom: 16rpx; }
.rec { background: var(--c-accent); color: #fff; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; margin-bottom: 20rpx; }
.rec[disabled] { opacity: 0.5; }
.pv { background: var(--c-input); border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; }
.pv-h { font-size: 26rpx; color: var(--c-sub); margin-bottom: 12rpx; }
.pv-err { margin-bottom: 12rpx; }
.err-row { font-size: 24rpx; color: #e06c75; line-height: 36rpx; }
.pv-list { max-height: 360rpx; }
.pv-row { display: flex; gap: 12rpx; padding: 12rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; color: var(--c-text); align-items: center; }
.c-dow { width: 90rpx; color: var(--c-accent); font-weight: 600; }
.c-per { width: 120rpx; color: var(--c-sub); }
.c-wk { width: 72rpx; color: var(--c-accent); font-size: 22rpx; }
.c-subj { flex: 1; color: var(--c-title); font-weight: 600; }
.c-tech { width: 140rpx; color: var(--c-sub); text-align: right; }
.sheet-ops { display: flex; gap: 16rpx; }
.cancel { flex: 1; background: var(--c-input); color: var(--c-text); border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; margin: 0; }
.cancel::after { border: none; }
.confirm { flex: 2; background: var(--c-primary); color: #fff; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; margin: 0; }
.confirm[disabled] { opacity: 0.5; }
.confirm::after { border: none; }
.tip { font-size: 22rpx; color: var(--c-sub); margin-top: 16rpx; line-height: 32rpx; }
</style>
