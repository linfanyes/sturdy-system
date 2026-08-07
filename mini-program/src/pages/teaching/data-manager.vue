<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">数据管理</view>

    <view class="tabs">
      <text :class="['tab', activeTab === 'export' ? 'on' : '']" @click="activeTab = 'export'">导出</text>
      <text :class="['tab', activeTab === 'import' ? 'on' : '']" @click="activeTab = 'import'">导入</text>
      <text :class="['tab', activeTab === 'backup' ? 'on' : '']" @click="activeTab = 'backup'">备份</text>
    </view>

    <view v-if="activeTab === 'export'" class="panel">
      <text class="p-title">选择要导出的数据模块</text>
      <view class="check-list">
        <view v-for="ep in endpoints" :key="ep.key" :class="['check-item', selected.includes(ep.key) ? 'on' : '']" @click="toggleEndpoint(ep.key)">
          <text>{{ ep.label }}</text>
          <text class="check-mark">{{ selected.includes(ep.key) ? '✓' : '' }}</text>
        </view>
      </view>
      <view class="all-row">
        <text @click="selectAll">{{ selected.length === endpoints.length ? '取消全选' : '全选' }}</text>
      </view>
      <button class="btn send" :disabled="exporting || !selected.length" @click="handleExport">
        {{ exporting ? '导出中…' : '导出 JSON' }}
      </button>
    </view>

    <view v-if="activeTab === 'import'" class="panel">
      <text class="p-title">导入 JSON 数据</text>
      <text class="hint">建议使用电脑端 Web 版进行数据导入，操作更方便。您也可以复制 JSON 数据粘贴到下方文本框直接导入。</text>
      <textarea v-model="importJson" class="json-area" placeholder='粘贴 JSON 数据，格式如 {"schedules":[...],"notes":[...]}' :disabled="importing" />
      <button class="btn send" :disabled="importing || !importJson.trim()" @click="handleImport">
        {{ importing ? '导入中…' : '导入 JSON' }}
      </button>
    </view>

    <view v-if="activeTab === 'backup'" class="panel">
      <text class="p-title">备份管理</text>
      <view class="add-row">
        <input v-model="backupLabel" class="inp" placeholder="备份标签（如：2026年7月期末）" />
        <button class="btn send sm" :disabled="creatingBackup || !backupLabel.trim()" @click="createBackup">
          {{ creatingBackup ? '创建中…' : '创建' }}
        </button>
      </view>

      <view v-if="backupLoading" class="loading">加载中…</view>
      <view v-else-if="!backups.length" class="empty">暂无备份记录</view>
      <view v-else class="list">
        <view v-for="b in backups" :key="b.id" class="item">
          <view class="it-top">
            <text class="name">{{ b.label }}</text>
            <text class="time">{{ b.createdAt }}</text>
          </view>
          <view class="ops">
            <text class="op" :class="restoringId === b.id ? 'disabled' : ''" @click="restoreBackup(b)">
              {{ restoringId === b.id ? '恢复中…' : '恢复' }}
            </text>
            <text class="op del" @click="removeBackup(b)">删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import {
  getEndpoints, getEndpointByKey, fetchEndpoint, importEndpoint,
  listBackups, createBackup as createBackupApi, getBackup, removeBackup as removeBackupApi,
} from '@/api/data-manager'
import { theme } from '../../common/store'

const activeTab = ref('export')
const exporting = ref(false)
const importJson = ref('')
const importing = ref(false)
const endpoints = getEndpoints()
const selected = ref(endpoints.map(e => e.key))

function toggleEndpoint(key) {
  const idx = selected.value.indexOf(key)
  if (idx >= 0) selected.value.splice(idx, 1)
  else selected.value.push(key)
}

function selectAll() {
  if (selected.value.length === endpoints.length) selected.value = []
  else selected.value = endpoints.map(e => e.key)
}

async function handleExport() {
  if (!selected.value.length) return uni.showToast({ title: '请至少选择一个模块', icon: 'none' })
  exporting.value = true
  try {
    const exportData = { _exportedAt: new Date().toISOString(), _version: '1.0' }
    const eps = endpoints.filter(e => selected.value.includes(e.key))
    let count = 0
    for (const ep of eps) {
      try {
        const res = await fetchEndpoint(ep.path)
        exportData[ep.key] = Array.isArray(res) ? res : (res?.items || [])
        count++
      } catch (e) { exportData[ep.key] = [] }
    }
    // 复制到剪贴板
    uni.setClipboardData({
      data: JSON.stringify(exportData, null, 2),
      success: () => {
        uni.showToast({ title: `已导出 ${count} 个模块，数据已复制到剪贴板`, icon: 'success', duration: 3000 })
      },
      fail: () => {
        uni.showToast({ title: '导出成功但复制失败，请使用 Web 端下载', icon: 'none', duration: 3000 })
      }
    })
  } catch (e) {
    uni.showToast({ title: '导出失败', icon: 'none' })
  } finally { exporting.value = false }
}

async function handleImport() {
  const raw = importJson.value.trim()
  if (!raw) return uni.showToast({ title: '请先粘贴 JSON 数据', icon: 'none' })
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    return uni.showToast({ title: 'JSON 格式错误，请检查后重试', icon: 'none' })
  }
  if (!data || typeof data !== 'object') {
    return uni.showToast({ title: '数据格式不正确', icon: 'none' })
  }
  importing.value = true
  try {
    const keys = Object.keys(data).filter(k => !k.startsWith('_') && Array.isArray(data[k]))
    if (!keys.length) {
      uni.showToast({ title: '未找到可导入的数据模块', icon: 'none' })
      return
    }
    let count = 0
    for (const key of keys) {
      const ep = endpoints.find(e => e.key === key)
      if (!ep) continue
      const items = data[key]
      if (!Array.isArray(items) || !items.length) continue
      for (const item of items) {
        try {
          const { id, createdAt, updatedAt, ...rest } = item
          await importEndpoint(ep.path, rest)
          count++
        } catch (e) { /* skip duplicate / error */ }
      }
    }
    importJson.value = ''
    uni.showToast({ title: `导入完成，共 ${count} 条`, icon: 'success', duration: 3000 })
  } catch (e) {
    uni.showToast({ title: '导入失败', icon: 'none' })
  } finally { importing.value = false }
}

// 备份
const backupLoading = ref(false)
const backups = ref([])
const backupLabel = ref('')
const creatingBackup = ref(false)
const restoringId = ref('')

async function loadBackups() {
  backupLoading.value = true
  try {
    const res = await listBackups({ take: 100 })
    backups.value = Array.isArray(res) ? res : (res.items || [])
  } catch (e) { backups.value = [] }
  finally { backupLoading.value = false }
}

async function createBackup() {
  if (!backupLabel.value.trim()) return uni.showToast({ title: '请输入备份标签', icon: 'none' })
  creatingBackup.value = true
  try {
    await createBackupApi({ label: backupLabel.value.trim() })
    backupLabel.value = ''
    uni.showToast({ title: '备份创建成功', icon: 'success' })
    loadBackups()
  } catch (e) { uni.showToast({ title: '创建失败', icon: 'none' }) }
  finally { creatingBackup.value = false }
}

async function restoreBackup(b) {
  uni.showModal({
    title: '恢复确认', content: `确定恢复备份「${b.label}」？当前数据将被覆盖。`,
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      restoringId.value = b.id
      try {
        const data = await getBackup(b.id)
        if (!data || typeof data !== 'object') { uni.showToast({ title: '备份数据无效', icon: 'none' }); return }
        let restoredCount = 0
        const keys = Object.keys(data).filter(k => !k.startsWith('_') && Array.isArray(data[k]))
        for (const key of keys) {
          const items = data[key]
          if (!items.length) continue
          const ep = endpoints.find(e => e.key === key)
          if (!ep) continue
          for (const item of items) {
            try {
              const { id, createdAt, updatedAt, ...rest } = item
              await importEndpoint(ep.path, rest)
              restoredCount++
            } catch (e) { /* skip */ }
          }
        }
        uni.showToast({ title: `恢复完成，共 ${restoredCount} 条`, icon: 'success' })
      } catch (e) { uni.showToast({ title: '恢复失败', icon: 'none' }) }
      finally { restoringId.value = '' }
    }
  })
}

async function removeBackup(b) {
  uni.showModal({
    title: '删除确认', content: '确定删除该备份？',
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await removeBackupApi(b.id)
        backups.value = backups.value.filter(x => x.id !== b.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    }
  })
}

onShow(() => { loadBackups() })
onPullDownRefresh(async () => { await loadBackups(); uni.stopPullDownRefresh() })
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.tabs { display: flex; gap: 14rpx; margin-bottom: 20rpx; }
.tab { flex: 1; text-align: center; background: var(--c-card); border-radius: 40rpx; padding: 14rpx 0; font-size: 28rpx; color: var(--c-sub); font-weight: 600; }
.tab.on { background: #e6a23c; color: #fff; }
.panel { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.p-title { font-size: 28rpx; font-weight: 600; color: var(--c-title); display: block; margin-bottom: 16rpx; }
.check-list { }
.check-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 20rpx; border-radius: 12rpx; margin-bottom: 8rpx; font-size: 28rpx; color: var(--c-sub); background: var(--c-card2); }
.check-item.on { background: #fdf6ec; color: #e6a23c; }
.check-mark { font-size: 28rpx; font-weight: 700; }
.all-row { text-align: right; margin: 8rpx 0 16rpx; }
.all-row text { font-size: 24rpx; color: var(--c-blue); }
.hint { font-size: 24rpx; color: var(--c-sub); text-align: center; padding: 40rpx 0; display: block; line-height: 1.6; }
.json-area { width: 100%; min-height: 300rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 20rpx; font-size: 24rpx; box-sizing: border-box; background: var(--c-input); color: var(--c-text); margin-bottom: 20rpx; }
.upload-area { border: 2rpx dashed var(--c-input-border); border-radius: 16rpx; padding: 60rpx; text-align: center; font-size: 28rpx; color: var(--c-sub); }
.up-icon { font-size: 48rpx; display: block; margin-bottom: 12rpx; }

.add-row { display: flex; gap: 12rpx; margin-bottom: 20rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; flex: 1; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.btn { border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.btn.send { background: var(--c-primary); color: #fff; }
.btn.send[disabled] { opacity: 0.6; }
.btn.send.sm { flex: 0; padding: 0 32rpx; height: auto; line-height: 1; border-radius: 12rpx; }
.loading, .empty { text-align: center; padding: 60rpx 0; font-size: 28rpx; color: var(--c-sub); }
.list { margin-top: 16rpx; }
.item { background: var(--c-card2); border-radius: 12rpx; padding: 18rpx 20rpx; margin-bottom: 12rpx; }
.it-top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.time { font-size: 22rpx; color: var(--c-sub); }
.ops { display: flex; gap: 20rpx; margin-top: 10rpx; }
.op { font-size: 24rpx; color: var(--c-blue); }
.op.del { color: #e64340; }
.op.disabled { opacity: 0.5; }
</style>