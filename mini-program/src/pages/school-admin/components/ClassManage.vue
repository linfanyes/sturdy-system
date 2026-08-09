<template>
  <view>
    <view class="bar">
      <text class="sc">共 {{ classes.length }} 个班级</text>
      <view class="bar-acts">
        <text class="act export" @click="$emit('export-xls')">📥 XLS</text>
        <text class="act" @click="showClassImport = true">📋 批量导入</text>
        <text class="act" @click="$emit('open-create-class')">＋ 新增班级</text>
      </view>
    </view>
    <view class="list">
      <EmptyState v-if="!classes.length" icon="🏫" text="暂无班级" hint="点击右上角「新增」创建第一个班级" />
      <view class="row" v-for="c in classes" :key="c.id">
        <view class="info" @click="$emit('open-edit-class', c)">
          <view class="nm-line">
            <text class="nm">{{ c.name }}</text>
            <text class="badge on">{{ c.headTeacher }}</text>
          </view>
          <view class="meta">年级：{{ c.grade }} · 班号：{{ c.classNo }} · 学期：{{ c.term || '未设置' }}</view>
          <view class="meta" v-if="c.subjects && c.subjects.length">学科：{{ c.subjects.join('、') }}</view>
          <view class="meta" v-else style="color:var(--c-warn,var(--c-sub))">学科：未设置</view>
        </view>
        <view class="acts">
          <text class="act" @click.stop="$emit('show-class-detail', c)">详情</text>
          <text class="act" @click.stop="$emit('promote-class', c)">升级</text>
          <text class="act del" @click.stop="$emit('del-class', c)">删除</text>
        </view>
      </view>
    </view>

    <!-- 班级详情底部弹出 -->
    <view v-if="showClassDetail" class="mask" @click="showClassDetail = false">
      <view class="sheet safe-bottom" @click.stop>
        <view class="sh-t">{{ classDetail.name }} · 班级详情</view>
        <view class="sh-meta">{{ classDetail.grade }} · {{ classDetail.term || '未设学期' }}<text v-if="classDetail.headTeacher"> · 班主任 {{ classDetail.headTeacher }}</text></view>
        <view class="facets">
          <view class="facet">
            <text class="f-n">{{ classDetail.studentCount || 0 }}</text><text class="f-l">学生</text>
          </view>
          <view class="facet">
            <text class="f-n">{{ classDetail.memberCount || 0 }}</text><text class="f-l">班级成员</text>
          </view>
          <view class="facet" v-if="classDetail.noticesCount != null">
            <text class="f-n">{{ classDetail.noticesCount }}</text><text class="f-l">进行中公告</text>
          </view>
        </view>
        <view class="sh-section" v-if="classDetail.subjects && classDetail.subjects.length">
          <text class="sh-lbl">本学期课程：</text>
          <text class="sh-val">{{ classDetail.subjects.join('、') }}</text>
        </view>
        <view class="sh-section" v-if="classDetail.members && classDetail.members.length">
          <text class="sh-lbl">班级成员：</text>
          <view class="mem-list">
            <view class="mem-row" v-for="m in classDetail.members" :key="m.teacherId">
              <text class="mem-name">{{ m.teacherName }}</text>
              <text class="mem-role" :class="m.role === 'head' ? 'role-head' : 'role-subject'">{{ m.role === 'head' ? '班主任' : '科任老师' }}</text>
            </view>
          </view>
        </view>
        <button class="enter" @click="$emit('go-class-students', classDetail); showClassDetail = false">进入学生管理</button>
        <button class="cancel" @click="showClassDetail = false">关闭</button>
      </view>
    </view>

    <!-- 新增/编辑班级（全屏） -->
    <view v-if="showClassForm" class="full-mask">
      <view class="full-page">
        <view class="full-head">
          <text class="full-back" @click="showClassForm = false">← 返回</text>
          <text class="full-title">{{ editingClassId ? '编辑班级' : '新增班级' }}</text>
          <text class="full-placeholder"></text>
        </view>
        <scroll-view scroll-y class="full-body">
          <view class="form-item">
            <text class="label">班级名称 <text class="req">*</text></text>
            <view class="readonly-inp">{{ className || '请选择年级并填写班级序号' }}</view>
          </view>
          <view class="form-item">
            <text class="label">年级 <text class="req">*</text></text>
            <picker class="picker" :range="gradeOptions" @change="(e)=>classForm.grade=gradeOptions[e.detail.value]">
              <view class="picker-inp">{{ classForm.grade || '请选择年级' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="label">班号</text>
            <input v-model="classForm.classNo" class="inp" placeholder="如：1" />
          </view>
          <view class="form-item">
            <text class="label">班主任 <text class="req">*</text></text>
            <picker class="picker" mode="selector" :range="teacherOptions" range-key="label" @change="onTeacherPick">
              <view class="picker-inp">{{ classForm.headTeacherId ? teacherLabel(classForm.headTeacherId) : '请选择班主任' }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="label">学期</text>
            <input v-model="classForm.term" class="inp" placeholder="如：2026春季学期" />
          </view>
          <view class="form-item">
            <text class="label">班主任任教学科</text>
            <input v-model="classForm.subjectsText" class="inp" placeholder="如：语文,数学,英语" />
            <text class="hint">多个学科用逗号分隔</text>
          </view>
        </scroll-view>
        <view class="full-foot">
          <button class="btn" :disabled="saving" @click="$emit('save-class', classForm, editingClassId)">{{ saving ? '保存中…' : (editingClassId ? '保存修改' : '确认创建') }}</button>
        </view>
      </view>
    </view>

    <!-- ====== 批量导入班级（全屏） ====== -->
    <view v-if="showClassImport" class="full-mask">
      <view class="full-page">
        <view class="full-head">
          <text class="full-back" @click="showClassImport = false">← 返回</text>
          <text class="full-title">批量导入班级</text>
          <text class="full-placeholder"></text>
        </view>
        <scroll-view scroll-y class="full-body">
          <view class="hint-block">
            支持 Excel(.xlsx/.xls) 或 TXT/CSV，每行：班级名称,年级,班级序号,班主任姓名,学期
            <text class="hint-example">例：三年级1班,三年级,1,张老师,2026春季</text>
          </view>
          <button class="btn import-btn" @click="showClassTpl = true">📄 查看模板</button>
          <button class="btn import-btn" @click="$emit('pick-class-file')">📂 选择文件</button>
          <button class="btn import-btn ai" :disabled="classAiRecognizing" @click="$emit('pick-class-image')">{{ classAiRecognizing ? '识别中…' : '📷 拍照/选图识别' }}</button>
          <view class="imp-tip ai-tip">用 AI 识别班级名单图片（需后端配置多模态模型）</view>

          <view v-if="classPreview" class="preview">
            <view class="pv-sum">
              校验结果：<text class="ok">有效 {{ classPreview.validCount }}</text> ·
              <text class="bad">异常 {{ classPreview.errorCount }}</text> / 共 {{ classPreview.rows.length }} 行
            </view>
            <view v-if="classPreview.errorCount" class="pv-errs">
              <view v-for="(r, i) in classPreview.rows.filter(x=>!x.valid).slice(0,8)" :key="i" class="pv-err">
                第{{ r.line }}行 {{ r.name || '(空)' }}：{{ r.error }}
              </view>
            </view>
            <button class="btn" :disabled="!classPreview.validCount || saving" @click="$emit('commit-class-import')">确认导入 {{ classPreview.validCount }} 条</button>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 班级模板弹窗 -->
    <view v-if="showClassTpl" class="mask" @click="showClassTpl = false">
      <view class="dialog" @click.stop>
        <view class="d-title">班级导入模板格式</view>
        <view class="d-sub">第一行可写表头（班级名称,年级,班级序号,班主任姓名,学期），数据从下一行开始：</view>
        <view class="d-code">班级名称,年级,班级序号,班主任姓名,学期
三年级1班,三年级,1,张老师,2026春季
五年级2班,五年级,2,李老师,2026春季</view>
        <button class="d-copy" @click="$emit('copy-class-tpl')">📋 复制示例</button>
        <button class="d-close" @click="showClassTpl = false">关闭</button>
      </view>
    </view>

    <!-- 班级升级（目标年级弹窗） -->
    <view v-if="promoteTarget" class="mask" @click="promoteTarget=null">
      <view class="sheet safe-bottom" @click.stop>
        <view class="sh-t">升级「{{ promoteTarget.name }}」</view>
        <view class="inp-wrap">
          <picker class="picker" :range="promoteGrades" @change="(e)=>promoteTargetGrade=promoteGrades[e.detail.value]">
            <view class="picker-inp">{{ promoteTargetGrade || '选择目标年级' }}</view>
          </picker>
        </view>
        <view class="sh-sub">将「{{ promoteTarget.name }}」升入「{{ promoteTargetGrade || '目标年级' }}」，学生和班主任保留，班级名称自动更新。</view>
        <button class="btn" :disabled="saving || !promoteTargetGrade" @click="$emit('do-promote-class', promoteTarget, promoteTargetGrade)">{{ saving ? '升级中…' : '确认升级' }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import EmptyState from '../../../components/EmptyState/EmptyState.vue'
import { generateClassName } from '@gardener/shared/validators'

const props = defineProps({
  classes: { type: Array, default: () => [] },
  teachers: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  classPreview: { type: Object, default: null },
  classAiRecognizing: { type: Boolean, default: false },
})

const emit = defineEmits([
  'open-create-class', 'open-edit-class', 'show-class-detail', 'del-class', 'promote-class',
  'save-class', 'pick-class-file', 'pick-class-image', 'commit-class-import', 'copy-class-tpl',
  'do-promote-class', 'go-class-students', 'export-xls', 'classes-updated',
])

const gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三']
const promoteGrades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']

const showClassDetail = ref(false)
const classDetail = ref({ name: '', grade: '', term: '', headTeacher: '', studentCount: 0, memberCount: 0, noticesCount: 0, subjects: [], members: [] })
const showClassForm = ref(false)
const editingClassId = ref('')
const classForm = ref({ grade: '', classNo: '', headTeacherId: '', term: '', subjectsText: '' })
const showClassImport = ref(false)
const showClassTpl = ref(false)
const promoteTarget = ref(null)
const promoteTargetGrade = ref('')

const className = computed(() => {
  return generateClassName(classForm.value.grade, classForm.value.classNo, { lenient: true })
})

const teacherOptions = computed(() =>
  props.teachers.map(t => ({ id: t.id, label: t.name + (t.subject ? '(' + t.subject + ')' : '') }))
)

function teacherLabel(id) {
  const t = props.teachers.find(x => x.id === id)
  return t ? t.name + (t.subject ? '(' + t.subject + ')' : '') : '请选择班主任'
}

function onTeacherPick(e) {
  const idx = e.detail.value
  const opt = teacherOptions.value[idx]
  classForm.value.headTeacherId = opt ? opt.id : ''
}

// Expose methods to parent
function openEditClassForm(c) {
  editingClassId.value = c.id
  classForm.value = {
    grade: c.grade || '', classNo: c.classNo || '',
    headTeacherId: c.teacherId || '', term: c.term || '',
    subjectsText: (c.subjects && c.subjects.length) ? c.subjects.join(',') : '',
  }
  showClassForm.value = true
}

function openCreateClassForm() {
  editingClassId.value = ''
  classForm.value = { grade: '', classNo: '', headTeacherId: '', term: '', subjectsText: '' }
  showClassForm.value = true
}

function showClassDetailOf(c) {
  // Fetch detail then show
  emit('show-class-detail', c, (detail) => {
    classDetail.value = detail
    showClassDetail.value = true
  })
}

function setPromoteTarget(c) {
  promoteTarget.value = c
  promoteTargetGrade.value = ''
}

defineExpose({
  openCreateClassForm,
  openEditClassForm,
  showClassDetailOf,
  setPromoteTarget,
  showClassImportRef: showClassImport,
  showClassFormRef: showClassForm,
})
</script>

<style scoped>
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; flex-wrap: wrap; gap: 10rpx; }
.bar-acts { display: flex; gap: 12rpx; align-items: center; }
.export { font-size: 22rpx; color: var(--c-primary); font-weight: 600; padding: 8rpx 18rpx; background: rgba(245,179,66,.1); border-radius: 28rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); font-weight: 500; }
.act { display: inline-flex; align-items: center; font-size: 23rpx; color: var(--c-blue); font-weight: 600; padding: 10rpx 22rpx; border-radius: 30rpx; background: rgba(28,111,179,.08); line-height: 1.4; }
.act.del { color: var(--c-danger); background: rgba(245,108,108,.1); }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 24rpx; background: var(--c-card); border-radius: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.info { flex: 1; min-width: 0; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.nm { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.badge { display: inline-block; font-size: 20rpx; font-weight: 600; padding: 4rpx 16rpx; border-radius: 20rpx; }
.badge.on { background: rgba(245,179,66,.12); color: var(--c-primary); }
.meta { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; line-height: 1.5; }
.acts { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 12rpx; flex-shrink: 0; flex-wrap: wrap; max-width: 46%; }
.full-mask { position: fixed; inset: 0; z-index: 200; background: var(--c-bg); }
.full-page { display: flex; flex-direction: column; height: 100vh; width: 100%; }
.full-head { display: flex; align-items: center; justify-content: space-between; padding: env(safe-area-inset-top) 24rpx 0; height: calc(88rpx + env(safe-area-inset-top)); background: var(--c-card); border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.full-back { font-size: 28rpx; color: var(--c-accent); width: 120rpx; }
.full-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.full-placeholder { width: 120rpx; }
.full-body { flex: 1; width: 100%; padding: 32rpx 30rpx; box-sizing: border-box; }
.full-foot { padding: 20rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); background: var(--c-card); border-top: 1px solid var(--c-border); flex-shrink: 0; }
.form-item { margin-bottom: 26rpx; width: 100%; box-sizing: border-box; }
.label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 8rpx; }
.req { color: #e64340; }
.hint { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; display: block; }
.picker { width: 100%; box-sizing: border-box; }
.picker-inp { height: 80rpx; line-height: 80rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; }
.full-body .inp { width: 100%; margin-bottom: 0; min-height: 84rpx; }
.readonly-inp { font-size: 28rpx; color: var(--c-title); padding: 20rpx 24rpx; background: var(--c-input); border-radius: 14rpx; min-height: 40rpx; }
.btn { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 88rpx; line-height: 88rpx; font-weight: 700; box-shadow: 0 6rpx 18rpx rgba(245,179,66,.25); }
.btn[disabled] { opacity: .6; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 28rpx 28rpx 0 0; padding: 36rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); max-height: 82vh; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; }
.sh-meta { font-size: 24rpx; color: var(--c-sub); margin-bottom: 20rpx; }
.facets { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.facet { flex: 1; background: var(--c-card2); border-radius: 16rpx; padding: 24rpx 0; display: flex; flex-direction: column; align-items: center; }
.f-n { font-size: 36rpx; font-weight: 800; color: var(--c-primary); }
.f-l { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.sh-section { margin-top: 18rpx; padding-top: 14rpx; border-top: 1px dashed var(--c-border); }
.sh-lbl { font-size: 24rpx; color: var(--c-sub); font-weight: 600; }
.sh-val { font-size: 26rpx; color: var(--c-title); margin-left: 8rpx; }
.mem-list { margin-top: 10rpx; }
.mem-row { display: flex; align-items: center; justify-content: space-between; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); }
.mem-row:last-child { border-bottom: none; }
.mem-name { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.mem-role { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 20rpx; }
.role-head { background: rgba(245,179,66, 0.15); color: #07c160; }
.role-subject { background: rgba(58, 142, 230, 0.15); color: #3a8ee6; }
.enter { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-bottom: 14rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; font-weight: 600; }
.cancel { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; margin-top: 14rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.inp-wrap { width: 100%; margin-bottom: 6rpx; }
.sh-sub { font-size: 24rpx; color: var(--c-sub); margin: 8rpx 2rpx 18rpx; line-height: 1.6; }
.hint-block { font-size: 24rpx; color: var(--c-sub); background: var(--c-card2); padding: 18rpx 22rpx; border-radius: 16rpx; margin-bottom: 20rpx; line-height: 1.7; border-left: 6rpx solid var(--c-accent); }
.hint-example { display: block; color: var(--c-sub); font-size: 22rpx; margin-top: 6rpx; white-space: pre; }
.import-btn { margin-bottom: 14rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.import-btn.ai { background: var(--c-primary); }
.import-btn.ai[disabled] { opacity: 0.6; }
.imp-tip { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 16rpx; }
.ai-tip { margin-top: -8rpx; margin-bottom: 14rpx; }
.preview { margin-top: 10rpx; border-top: 1px dashed var(--c-border); padding-top: 16rpx; }
.pv-sum { font-size: 26rpx; color: var(--c-title); }
.pv-sum .ok { color: var(--c-primary); }
.pv-sum .bad { color: var(--c-danger); }
.pv-errs { margin: 10rpx 0; }
.pv-err { font-size: 24rpx; color: var(--c-danger); line-height: 1.6; }
.dialog { width: 86%; max-width: 640rpx; max-height: 80vh; overflow-y: auto; background: var(--c-card); border-radius: 24rpx; padding: 36rpx; box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.3); }
.d-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.d-sub { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; margin-bottom: 16rpx; }
.d-code { background: var(--c-title); color: var(--c-card2); font-size: 22rpx; padding: 20rpx; border-radius: 12rpx; white-space: pre-wrap; line-height: 1.7; font-family: monospace; margin-bottom: 20rpx; }
.d-copy { background: var(--c-blue); color: #fff; border-radius: 50rpx; margin-bottom: 14rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.d-close { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
</style>
