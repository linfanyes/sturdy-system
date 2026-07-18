<template>
  <view class="page">
    <view class="bar">{{ className }}</view>

    <view class="list">
      <view v-for="s in list" :key="s.id" class="item">
        <view class="top">
          <text class="name">{{ s.name }}</text>
          <text class="no">学号 {{ s.studentNo || '—' }}</text>
        </view>
        <view class="meta">
          <text>{{ s.gender }}</text>
          <text v-if="s.duty" class="duty">· {{ s.duty }}</text>
          <text v-if="s.seatRow" class="seat">· 第{{ s.seatRow }}行第{{ s.seatCol }}列</text>
          <text v-else class="seat">· 未排座</text>
        </view>
      </view>
      <view v-if="!list.length" class="empty">暂无学生，点下方添加或批量导入</view>
    </view>

    <view class="actions">
      <button class="add" @click="toggleForm">{{ showForm ? '收起' : '＋ 添加学生' }}</button>
      <button class="import" @click="showImport = !showImport">{{ showImport ? '收起' : '📥 批量导入' }}</button>
    </view>

    <view v-if="showForm" class="form">
      <input v-model="form.name" placeholder="姓名" />
      <picker :range="['男', '女']" :value="['男','女'].indexOf(form.gender)" @change="(e) => (form.gender = ['男', '女'][e.detail.value])">
        <view class="picker">性别：{{ form.gender }}</view>
      </picker>
      <input v-model="form.studentNo" placeholder="学号" />
      <input v-model="form.parentName" placeholder="家长姓名" />
      <input v-model="form.parentPhone" placeholder="家长电话" />
      <button class="save" @click="save">保存</button>
    </view>

    <view v-if="showImport" class="form import-box">
      <view class="imp-title">批量导入学生</view>
      <view class="imp-tip">支持 Excel(.xlsx/.xls) 或 TXT/CSV，每行：姓名,性别,学号,家长姓名,家长电话</view>
      <button class="tpl" @click="showTpl = true">📄 下载/查看模板</button>
      <button class="pick" @click="pickFile">📂 选择文件</button>

      <view v-if="preview" class="preview">
        <view class="pv-sum">
          校验结果：<text class="ok">有效 {{ preview.validCount }}</text> ·
          <text class="bad">异常 {{ preview.errorCount }}</text> / 共 {{ preview.rows.length }} 行
        </view>
        <view v-if="preview.errorCount" class="pv-errs">
          <view v-for="(r, i) in preview.rows.filter(x=>!x.valid).slice(0,8)" :key="i" class="pv-err">
            第{{ r.line }}行 {{ r.name || '(空)' }}：{{ r.error }}
          </view>
        </view>
        <button class="confirm" :disabled="!preview.validCount" @click="commit">确认导入 {{ preview.validCount }} 条</button>
      </view>
    </view>

    <!-- 模板弹窗 -->
    <view v-if="showTpl" class="mask" @click="showTpl = false">
      <view class="dialog" @click.stop>
        <view class="d-title">导入模板格式</view>
        <view class="d-sub">第一行可写表头（姓名,性别,学号,家长姓名,家长电话），数据从下一行开始：</view>
        <view class="d-code">姓名,性别,学号,家长姓名,家长电话
张三,男,2026001,张父,13800000001
李四,女,2026002,李母,13800000002</view>
        <button class="d-copy" @click="copyTpl">📋 复制示例</button>
        <button class="d-close" @click="showTpl = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import api from '../../common/request'

const classId = ref('')
const className = ref('')
const list = ref([])
const showForm = ref(false)
const showImport = ref(false)
const showTpl = ref(false)
const preview = ref(null)
const form = ref({ name: '', gender: '男', studentNo: '', parentName: '', parentPhone: '' })

onLoad((q) => {
  classId.value = q.classId
  className.value = q.name || '学生管理'
})

async function load() {
  const all = await api.get('/students')
  list.value = all.filter((s) => s.classId === classId.value)
}
onShow(load)

function toggleForm() {
  showForm.value = !showForm.value
}

async function save() {
  if (!form.value.name.trim()) return uni.showToast({ title: '请填写姓名', icon: 'none' })
  if (form.value.gender !== '男' && form.value.gender !== '女')
    return uni.showToast({ title: '请选择性别', icon: 'none' })
  try {
    await api.post('/students', {
      ...form.value,
      classId: classId.value,
      seatNo: list.value.length + 1,
      tags: [],
    })
    uni.showToast({ title: '已保存', icon: 'success' })
    showForm.value = false
    form.value = { name: '', gender: '男', studentNo: '', parentName: '', parentPhone: '' }
    load()
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  }
}

function copyTpl() {
  uni.setClipboardData({
    data: '姓名,性别,学号,家长姓名,家长电话\n张三,男,2026001,张父,13800000001\n李四,女,2026002,李母,13800000002',
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
  })
}

function pickFile() {
  uni.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['xlsx', 'xls', 'txt', 'csv'],
    success: async (res) => {
      const f = res.tempFiles[0]
      if (f.size > 5 * 1024 * 1024) return uni.showToast({ title: '文件不能超过 5MB', icon: 'none' })
      uni.showLoading({ title: '解析中…' })
      try {
        const data = await readAsBase64(f.path)
        const r = await api.post('/students/import', { filename: f.name, data })
        preview.value = r
        if (!r.validCount) uni.showToast({ title: '没有可导入的有效数据', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: '解析失败：' + (e.message || '文件格式错误'), icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    },
    fail: () => {},
  })
}

function readAsBase64(path) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: path,
      encoding: 'base64',
      success: (r) => resolve(r.data),
      fail: reject,
    })
  })
}

async function commit() {
  const items = preview.value.rows.filter((r) => r.valid)
  if (!items.length) return
  uni.showLoading({ title: '导入中…' })
  try {
    const r = await api.post('/students/import-commit', { classId: classId.value, items })
    uni.showToast({ title: `成功导入 ${r.count} 名学生`, icon: 'success' })
    preview.value = null
    showImport.value = false
    load()
  } catch (e) {
    uni.showToast({ title: '导入失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
</script>

<style scoped>
.page { padding: 30rpx; }
.bar { font-size: 34rpx; font-weight: 700; color: #4a3f35; margin-bottom: 20rpx; }
.item { background: #fff; border-radius: 20rpx; padding: 26rpx; margin-bottom: 16rpx; }
.top { display: flex; justify-content: space-between; align-items: center; }
.name { font-size: 32rpx; font-weight: 600; }
.no { color: #9aa0a6; font-size: 24rpx; }
.meta { color: #9aa0a6; font-size: 26rpx; margin-top: 8rpx; }
.duty { color: #409eff; }
.empty { text-align: center; color: #c0c4cc; padding: 80rpx 0; }
.actions { display: flex; gap: 20rpx; margin-top: 16rpx; }
.add, .import { flex: 1; border-radius: 50rpx; color: #fff; font-size: 28rpx; }
.add { background: #e6a23c; }
.import { background: #409eff; }
.form { margin-top: 24rpx; background: #fff; border-radius: 20rpx; padding: 30rpx; }
.form input, .picker { border: 1px solid #e5e5e5; border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; box-sizing: border-box; min-height: 80rpx; line-height: 44rpx; color: #333; background: #fff; }
.save { background: #07c160; color: #fff; border-radius: 50rpx; margin-top: 6rpx; }
.import-box { background: #f6fbff; }
.imp-title { font-size: 30rpx; font-weight: 700; color: #2a6fbb; margin-bottom: 10rpx; }
.imp-tip { font-size: 24rpx; color: #6a7c8c; line-height: 1.6; margin-bottom: 16rpx; }
.tpl, .pick { background: #fff; color: #2a6fbb; border: 1px solid #bcdcff; border-radius: 50rpx; font-size: 28rpx; margin-bottom: 14rpx; }
.pick { background: #409eff; color: #fff; border: none; }
.preview { margin-top: 10rpx; border-top: 1px dashed #cfe3f5; padding-top: 16rpx; }
.pv-sum { font-size: 26rpx; color: #4a3f35; }
.pv-sum .ok { color: #07c160; }
.pv-sum .bad { color: #e64340; }
.pv-errs { margin: 10rpx 0; }
.pv-err { font-size: 24rpx; color: #e64340; line-height: 1.6; }
.confirm { background: #07c160; color: #fff; border-radius: 50rpx; margin-top: 6rpx; }
.confirm[disabled] { opacity: 0.5; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dialog { width: 620rpx; background: #fff; border-radius: 24rpx; padding: 36rpx; }
.d-title { font-size: 32rpx; font-weight: 700; color: #4a3f35; margin-bottom: 10rpx; }
.d-sub { font-size: 24rpx; color: #9aa0a6; line-height: 1.6; margin-bottom: 16rpx; }
.d-code { background: #2b2b2b; color: #f6f6f6; font-size: 22rpx; padding: 20rpx; border-radius: 12rpx; white-space: pre-wrap; line-height: 1.7; font-family: monospace; margin-bottom: 20rpx; }
.d-copy { background: #409eff; color: #fff; border-radius: 50rpx; margin-bottom: 14rpx; }
.d-close { background: #f2f3f5; color: #666; border-radius: 50rpx; }
</style>
