<script setup lang="ts">
/**
 * 数据管理：导出、导入、备份管理。
 */
import { ref, onMounted } from 'vue'
import {
  Database, Download, Upload, HardDrive, History, Plus,
  Loader2, RotateCcw, Check, AlertCircle, FileJson,
} from 'lucide-vue-next'
import request from '@/api/request'

interface BackupItem {
  id: string
  label: string
  createdAt: string
  size?: number
  status?: string
}

const activeTab = ref<'export' | 'import' | 'backup'>('export')
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

// ===== 导出 =====
const exportLoading = ref(false)
const EXPORT_ENDPOINTS = [
  { key: 'schedules', label: '课程表', path: '/schedules' },
  { key: 'notes', label: '笔记', path: '/notes' },
  { key: 'todos', label: '待办事项', path: '/todos' },
  { key: 'notices', label: '公告', path: '/notices' },
  { key: 'messages', label: '留言', path: '/messages' },
  { key: 'notifications', label: '通知', path: '/notifications' },
  { key: 'students', label: '学生', path: '/students' },
  { key: 'classes', label: '班级', path: '/classes' },
]
const selectedEndpoints = ref(EXPORT_ENDPOINTS.map(e => e.key))

function toggleEndpoint(key: string) {
  const idx = selectedEndpoints.value.indexOf(key)
  if (idx >= 0) {
    selectedEndpoints.value.splice(idx, 1)
  } else {
    selectedEndpoints.value.push(key)
  }
}

function selectAllEndpoints() {
  if (selectedEndpoints.value.length === EXPORT_ENDPOINTS.length) {
    selectedEndpoints.value = []
  } else {
    selectedEndpoints.value = EXPORT_ENDPOINTS.map(e => e.key)
  }
}

async function handleExport() {
  if (!selectedEndpoints.value.length) {
    errorMsg.value = '请至少选择一个要导出的数据类型'
    return
  }
  exportLoading.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const endpoints = EXPORT_ENDPOINTS.filter(e => selectedEndpoints.value.includes(e.key))
    const exportData: Record<string, any> = {
      _exportedAt: new Date().toISOString(),
      _version: '1.0',
    }
    for (const ep of endpoints) {
      try {
        const res = await request.get(ep.path, { params: { take: 10000 } })
        exportData[ep.key] = Array.isArray(res) ? res : (res?.items || [])
      } catch {
        exportData[ep.key] = []
      }
    }
    // 下载 JSON 文件
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    successMsg.value = `已导出 ${endpoints.length} 个数据模块`
  } catch (e: any) {
    errorMsg.value = e?.message || '导出失败'
  } finally {
    exportLoading.value = false
  }
}

// ===== 导入 =====
const importLoading = ref(false)
const importFile = ref<File | null>(null)
const importPreview = ref<{ key: string; count: number }[]>([])
const importData = ref<Record<string, any[]> | null>(null)

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  importFile.value = file
  errorMsg.value = ''
  successMsg.value = ''
  importPreview.value = []
  importData.value = null

  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target?.result as string)
      importData.value = data
      const preview: { key: string; count: number }[] = []
      for (const key of Object.keys(data)) {
        if (key.startsWith('_')) continue
        if (Array.isArray(data[key])) {
          preview.push({ key, count: data[key].length })
        }
      }
      importPreview.value = preview
    } catch {
      errorMsg.value = '文件格式无效，请上传有效的 JSON 文件'
      importFile.value = null
    }
  }
  reader.readAsText(file)
}

async function handleImport() {
  if (!importData.value) {
    errorMsg.value = '请先选择要导入的文件'
    return
  }
  importLoading.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const data = importData.value
    let importedCount = 0
    const keys = Object.keys(data).filter(k => !k.startsWith('_') && Array.isArray(data[k]))
    for (const key of keys) {
      const items = data[key] as any[]
      if (!items.length) continue
      // 尝试匹配 API 路径
      const ep = EXPORT_ENDPOINTS.find(e => e.key === key)
      if (!ep) continue
      for (const item of items) {
        try {
          // 去除 id 字段，让后端自动生成
          const { id, createdAt, updatedAt, ...rest } = item
          await request.post(ep.path, rest)
          importedCount++
        } catch {
          // 单条失败继续
        }
      }
    }
    successMsg.value = `成功导入 ${importedCount} 条数据`
    importFile.value = null
    importPreview.value = []
    importData.value = null
  } catch (e: any) {
    errorMsg.value = e?.message || '导入失败'
  } finally {
    importLoading.value = false
  }
}

// ===== 备份 =====
const backupLoading = ref(false)
const backups = ref<BackupItem[]>([])
const backupLabel = ref('')
const creatingBackup = ref(false)
const restoringId = ref('')

async function loadBackups() {
  backupLoading.value = true
  errorMsg.value = ''
  try {
    const res = await request.get('/backups', { params: { take: 100 } })
    backups.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    errorMsg.value = e?.message || '加载备份列表失败'
    backups.value = []
  } finally {
    backupLoading.value = false
  }
}

async function createBackup() {
  if (!backupLabel.value.trim()) {
    errorMsg.value = '请输入备份标签'
    return
  }
  creatingBackup.value = true
  errorMsg.value = ''
  successMsg.value = ''
  try {
    await request.post('/backups', { label: backupLabel.value.trim() })
    backupLabel.value = ''
    successMsg.value = '备份创建成功'
    await loadBackups()
  } catch (e: any) {
    errorMsg.value = e?.message || '创建备份失败'
  } finally {
    creatingBackup.value = false
  }
}

async function restoreBackup(backup: BackupItem) {
  if (!await confirm(`确定恢复备份「${backup.label}」？当前数据将被覆盖。`)) return
  restoringId.value = backup.id
  errorMsg.value = ''
  successMsg.value = ''
  try {
    const data = await request.get(`/backups/${backup.id}`)
    if (!data || typeof data !== 'object') {
      errorMsg.value = '备份数据无效'
      return
    }
    let restoredCount = 0
    const keys = Object.keys(data).filter(k => !k.startsWith('_') && Array.isArray(data[k]))
    for (const key of keys) {
      const items = data[key] as any[]
      if (!items.length) continue
      const ep = EXPORT_ENDPOINTS.find(e => e.key === key)
      if (!ep) continue
      for (const item of items) {
        try {
          const { id, createdAt, updatedAt, ...rest } = item
          await request.post(ep.path, rest)
          restoredCount++
        } catch {
          // 单条失败继续
        }
      }
    }
    successMsg.value = `恢复完成，共恢复 ${restoredCount} 条数据`
  } catch (e: any) {
    errorMsg.value = e?.message || '恢复备份失败'
  } finally {
    restoringId.value = ''
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('zh-CN')
}

function formatSize(bytes?: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

onMounted(() => {
  loadBackups()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 标题栏 -->
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Database class="w-6 h-6 text-butter-500" /> 数据管理
    </h1>

    <!-- 消息提示 -->
    <div v-if="successMsg" class="rounded-xl p-4 border border-mint-200 bg-mint-50 text-mint-700 text-sm flex items-center gap-2">
      <Check class="w-4 h-4" /> {{ successMsg }}
    </div>
    <div v-if="errorMsg" class="rounded-xl p-4 border border-sakura-200 bg-sakura-50 text-sakura-700 text-sm flex items-center gap-2">
      <AlertCircle class="w-4 h-4" /> {{ errorMsg }}
    </div>

    <!-- Tab 切换 -->
    <div class="flex gap-2">
      <button
        v-for="tab in [
          { key: 'export', label: '导出数据', icon: Download },
          { key: 'import', label: '导入数据', icon: Upload },
          { key: 'backup', label: '备份管理', icon: History },
        ]"
        :key="tab.key"
        :class="[
          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
          activeTab === tab.key
            ? 'bg-butter-500 text-white shadow-sm'
            : 'bg-white text-cocoa-600 border border-cream-200 hover:bg-cream-50',
        ]"
        @click="activeTab = tab.key as any"
      >
        <component :is="tab.icon" class="w-4 h-4" /> {{ tab.label }}
      </button>
    </div>

    <!-- 导出面板 -->
    <div v-if="activeTab === 'export'" class="bg-white rounded-2xl p-6 shadow-softer border border-cream-200 space-y-4">
      <div class="flex items-center gap-2">
        <Download class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">导出数据</h2>
      </div>
      <p class="text-sm text-cocoa-500">选择要导出的数据模块，导出为 JSON 文件下载。</p>
      <div class="flex items-center gap-2 mb-2">
        <button
          class="text-xs px-2.5 py-1 rounded-lg border border-cream-200 text-cocoa-600 hover:bg-cream-50 transition-colors"
          @click="selectAllEndpoints"
        >
          {{ selectedEndpoints.length === EXPORT_ENDPOINTS.length ? '取消全选' : '全选' }}
        </button>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          v-for="ep in EXPORT_ENDPOINTS"
          :key="ep.key"
          :class="[
            'px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left',
            selectedEndpoints.includes(ep.key)
              ? 'border-butter-400 bg-butter-50 text-butter-700 shadow-sm'
              : 'border-cream-200 bg-white text-cocoa-600 hover:bg-cream-50',
          ]"
          @click="toggleEndpoint(ep.key)"
        >
          <div>{{ ep.label }}</div>
          <div class="text-xs text-cocoa-400 mt-0.5">{{ ep.path }}</div>
        </button>
      </div>
      <button
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-50 text-sm font-medium transition-colors shadow-sm"
        :disabled="exportLoading || !selectedEndpoints.length"
        @click="handleExport"
      >
        <Loader2 v-if="exportLoading" class="w-4 h-4 animate-spin" />
        <Download v-else class="w-4 h-4" />
        {{ exportLoading ? '导出中…' : '导出 JSON' }}
      </button>
    </div>

    <!-- 导入面板 -->
    <div v-if="activeTab === 'import'" class="bg-white rounded-2xl p-6 shadow-softer border border-cream-200 space-y-4">
      <div class="flex items-center gap-2">
        <Upload class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">导入数据</h2>
      </div>
      <p class="text-sm text-cocoa-500">上传之前导出的 JSON 文件，批量写入数据。</p>
      <div class="border-2 border-dashed border-cream-300 rounded-2xl p-8 text-center hover:border-butter-400 transition-colors">
        <input
          type="file"
          accept=".json"
          class="hidden"
          id="import-file-input"
          @change="handleFileSelect"
        />
        <label for="import-file-input" class="cursor-pointer">
          <FileJson class="w-10 h-10 mx-auto text-cocoa-300 mb-2" />
          <p class="text-cocoa-600 font-medium">
            {{ importFile ? importFile.name : '点击选择 JSON 文件' }}
          </p>
          <p v-if="!importFile" class="text-xs text-cocoa-400 mt-1">支持 .json 格式</p>
        </label>
      </div>
      <!-- 预览 -->
      <div v-if="importPreview.length" class="bg-cream-50 rounded-xl p-4">
        <div class="text-sm font-medium text-cocoa-700 mb-2">数据预览：</div>
        <div class="space-y-1">
          <div v-for="p in importPreview" :key="p.key" class="flex items-center justify-between text-sm">
            <span class="text-cocoa-600">{{ EXPORT_ENDPOINTS.find(e => e.key === p.key)?.label || p.key }}</span>
            <span class="text-cocoa-400">{{ p.count }} 条</span>
          </div>
        </div>
      </div>
      <button
        v-if="importData"
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-50 text-sm font-medium transition-colors shadow-sm"
        :disabled="importLoading"
        @click="handleImport"
      >
        <Loader2 v-if="importLoading" class="w-4 h-4 animate-spin" />
        <Upload v-else class="w-4 h-4" />
        {{ importLoading ? '导入中…' : '开始导入' }}
      </button>
    </div>

    <!-- 备份面板 -->
    <div v-if="activeTab === 'backup'" class="space-y-4">
      <!-- 创建备份 -->
      <div class="bg-white rounded-2xl p-6 shadow-softer border border-cream-200 space-y-3">
        <div class="flex items-center gap-2">
          <Plus class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">创建备份</h2>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="backupLabel"
            placeholder="备份标签（如：2026年7月期末）"
            class="flex-1 px-4 py-2.5 rounded-xl border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:border-butter-400 focus:bg-white transition-colors"
            @keydown.enter="createBackup"
          />
          <button
            class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-50 text-sm font-medium transition-colors"
            :disabled="creatingBackup || !backupLabel.trim()"
            @click="createBackup"
          >
            <Loader2 v-if="creatingBackup" class="w-4 h-4 animate-spin" />
            <Plus v-else class="w-4 h-4" />
            {{ creatingBackup ? '创建中…' : '创建备份' }}
          </button>
        </div>
      </div>

      <!-- 备份历史 -->
      <div class="bg-white rounded-2xl p-6 shadow-softer border border-cream-200">
        <div class="flex items-center gap-2 mb-4">
          <History class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">备份历史</h2>
          <button
            class="ml-auto p-1.5 rounded-lg hover:bg-cream-100 text-cocoa-400 transition-colors"
            title="刷新"
            @click="loadBackups"
          >
            <RotateCcw class="w-4 h-4" />
          </button>
        </div>

        <!-- 加载 -->
        <div v-if="backupLoading" class="flex items-center justify-center py-12 text-cocoa-400">
          <Loader2 class="w-5 h-5 animate-spin mr-2" />
          加载中…
        </div>

        <!-- 空 -->
        <div v-else-if="!backups.length" class="text-center py-12 text-cocoa-400">
          <HardDrive class="w-10 h-10 mx-auto mb-3 text-cocoa-300" />
          <p>暂无备份记录</p>
          <p class="text-sm mt-1">创建备份以保护数据安全</p>
        </div>

        <!-- 列表 -->
        <div v-else class="space-y-2">
          <div
            v-for="backup in backups"
            :key="backup.id"
            class="flex items-center justify-between p-4 rounded-xl border border-cream-200 hover:bg-cream-50 transition-colors"
          >
            <div class="flex items-center gap-3">
              <HardDrive class="w-5 h-5 text-cocoa-400" />
              <div>
                <div class="font-medium text-cocoa-900 text-sm">{{ backup.label }}</div>
                <div class="text-xs text-cocoa-400 mt-0.5">
                  {{ formatTime(backup.createdAt) }}
                  <span v-if="backup.size" class="ml-2">| {{ formatSize(backup.size) }}</span>
                </div>
              </div>
            </div>
            <button
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky2-50 text-sky2-600 hover:bg-sky2-100 text-xs font-medium transition-colors disabled:opacity-50"
              :disabled="restoringId === backup.id"
              @click="restoreBackup(backup)"
            >
              <Loader2 v-if="restoringId === backup.id" class="w-3 h-3 animate-spin" />
              <RotateCcw v-else class="w-3 h-3" />
              {{ restoringId === backup.id ? '恢复中…' : '恢复' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>