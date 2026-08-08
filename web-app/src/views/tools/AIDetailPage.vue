<script setup lang="ts">
/**
 * 通用 AI 工具详情页（Web 端工具中心落地）
 *
 * 由 shared schemas 驱动，根据 query 参数渲染表单并调用 AI：
 *   - ?key=<subject-tool-key>  → subject-schema 中的学科 AI 工具
 *   - ?q=<quicktool-type>     → quicktool-schema 中的通用 AI 工具
 *
 * Schema 字段渲染支持：input/number/textarea（subject）与 text/number/picker/quicktool 四类。
 * submit 时调用 schema.build(form) 生成 prompt，走 /ai/chat-sync 同步接口返回。
 *
 * 该页替代此前分散的各科"手工视图"，作为 Web 端工具中心的统一渲染器。
 */
import { computed, ref, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { aiChatSync } from '@/api/teacher'
import { useAuthStore } from '@/stores/auth'
import {
  getSubjectTool,
  getTeacherSubjects,
  type SubjectToolDef,
  type SubjectToolFieldDef,
} from '@gardener/shared/schemas/subject-schema'
import {
  getQuickTool,
  type QuickToolDef,
  type QuickToolFieldDef,
} from '@gardener/shared/schemas/quicktool-schema'

const route = useRoute()
const auth = useAuthStore()
const key = computed(() => (route.query.key as string) || '')
const q = computed(() => (route.query.q as string) || '')

// 当前命中的 schema def 与类型
const subjectDef = computed<SubjectToolDef | null>(() => (key.value ? getSubjectTool(key.value) : null))
const quickDef = computed<QuickToolDef | null>(() => (q.value ? getQuickTool(q.value) : null))
const isSubject = computed(() => !!subjectDef.value)
const title = computed(() => subjectDef.value?.title || quickDef.value?.title || 'AI 工具')
const hint = computed(() => quickDef.value?.hint || '')

/** 教师任教学科（用于校验学科工具访问权限） */
const teacherSubjects = computed<string[]>(() =>
  getTeacherSubjects(auth.user?.subject as string | undefined, auth.user?.subjects as string[] | undefined),
)

/**
 * 学科工具访问校验：非本学科教师不可使用该学科 AI 工具
 * - subjectDef 且不在教师任教学科内 → 无权访问（拦截渲染与提交）
 * - quick 通用工具（翻译/评语/总结等公共工具）→ 始终允许
 */
const accessible = computed(() => {
  if (!subjectDef.value) return true
  return teacherSubjects.value.includes(subjectDef.value.subject)
})

// 表单字段归一化
interface NormField {
  k: string
  label: string
  type: 'text' | 'number' | 'textarea' | 'select'
  required?: boolean
  options?: string[]
  placeholder?: string
}
const fields = computed<NormField[]>(() => {
  if (subjectDef.value) {
    return subjectDef.value.fields.map((f: SubjectToolFieldDef): NormField => ({
      k: f.k, label: f.label,
      type: f.type === 'picker' ? 'select' : f.type === 'textarea' ? 'textarea' : f.type === 'number' ? 'number' : 'text',
      required: f.required, options: f.options, placeholder: f.placeholder,
    }))
  }
  if (quickDef.value) {
    return quickDef.value.fields.map((f: QuickToolFieldDef): NormField => ({
      k: f.k, label: f.label,
      type: f.type === 'picker' ? 'select' : f.type === 'textarea' ? 'textarea' : f.type === 'number' ? 'number' : 'text',
      required: f.required, options: f.options, placeholder: f.placeholder,
    }))
  }
  return []
})

// 表单数据（reactive）
const form = reactive<Record<string, any>>({})
// 初始化字段默认值
for (const f of fields.value) {
  if (form[f.k] === undefined) form[f.k] = ''
}

const loading = ref(false)
const result = ref('')
const errorMsg = ref('')

async function submit() {
  // 学科工具访问守卫（配合模板层的 v-else-if 双重保护，防止绕过 UI 直接调用）
  if (!accessible.value) {
    errorMsg.value = '您无权使用该学科工具'
    return
  }
  // 必填校验
  for (const f of fields.value) {
    if (f.required && (form[f.k] === '' || form[f.k] == null)) {
      errorMsg.value = `请填写：${f.label}`
      return
    }
  }
  errorMsg.value = ''
  loading.value = true
  result.value = ''
  try {
    const prompt = isSubject.value
      ? subjectDef.value!.build(form as Record<string, string>)
      : quickDef.value!.build(form as Record<string, string>)
    const res = await aiChatSync(
      [{ role: 'user', content: prompt }],
      // 学科工具附上 subjectKey，供后端做学科权限二次校验
      { subjectKey: isSubject.value ? key.value : undefined },
    )
    result.value = res?.content || ''
  } catch (e: any) {
    errorMsg.value = e?.message || 'AI 调用失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function reset() {
  for (const f of fields.value) form[f.k] = ''
  result.value = ''
  errorMsg.value = ''
}
function copyResult() {
  if (result.value && typeof window !== 'undefined') {
    window.navigator.clipboard.writeText(result.value).catch(() => {
      errorMsg.value = '复制失败，请手动复制'
    })
  }
}
</script>

<template>
  <div class="ai-detail">
    <header class="head">
      <h2>{{ title }}</h2>
      <p v-if="hint" class="hint">{{ hint }}</p>
      <p v-if="isSubject && subjectDef" class="subject-tag" :style="{ color: '#e6a23c' }">学科：{{ subjectDef.subject }}</p>
    </header>

    <div class="empty" v-if="!subjectDef && !quickDef">
      <p>未匹配到工具配置。</p>
      <p class="sub">请通过「学科工具」页面进入，或检查 query 参数（?key= / ?q=）是否正确。</p>
    </div>

    <div class="empty" v-else-if="!accessible">
      <p>您无权使用「{{ subjectDef?.subject }}」学科工具。</p>
      <p class="sub">学科 AI 工具仅对本学科任教教师开放，请联系管理员开通对应任教学科。</p>
    </div>

    <form class="form" v-else @submit.prevent="reset">
      <div v-for="f in fields" :key="f.k" class="form-item">
        <label :for="f.k">
          {{ f.label }}
          <span v-if="f.required" class="req">*</span>
        </label>

        <select v-if="f.type === 'select'" :id="f.k" v-model="form[f.k]">
          <option value="" disabled>请选择…</option>
          <optgroup v-if="f.options?.length" :label="f.label">
            <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
          </optgroup>
        </select>

        <textarea
          v-else-if="f.type === 'textarea'"
          :id="f.k"
          v-model="form[f.k]"
          :placeholder="f.placeholder || '请输入…'"
          :required="f.required"
          rows="4"
        />

        <input
          v-else
          :id="f.k"
          :type="f.type === 'number' ? 'number' : 'text'"
          v-model="form[f.k]"
          :placeholder="f.placeholder || '请输入…'"
          :required="f.required"
        />
      </div>

      <div class="actions">
        <button type="button" class="btn primary" :disabled="loading" @click="submit">
          {{ loading ? '生成中…' : '开始生成' }}
        </button>
        <button type="button" class="btn ghost" @click="reset">清空</button>
      </div>
    </form>

    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <div v-if="result" class="result">
      <div class="result-head">
        <span>生成结果</span>
        <button class="copy" @click="copyResult">复制</button>
      </div>
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<style scoped>
.ai-detail { padding: 20px; max-width: 720px; margin: 0 auto; }
.head { margin-bottom: 16px; }
.head h2 { margin: 0 0 4px; font-size: 18px; }
.hint { margin: 0; color: #666; font-size: 13px; line-height: 1.6; }
.subject-tag { margin: 4px 0 0; font-size: 12px; }
.empty { background: #faf7f2; border: 1px dashed #e0d5c4; border-radius: 8px; padding: 24px; text-align: center; color: #888; }
.empty .sub { font-size: 12px; color: #aaa; margin-top: 4px; }
.form { background: #fff; border: 1px solid #ece4d7; border-radius: 8px; padding: 16px; }
.form-item { margin-bottom: 12px; }
.form-item label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
.req { color: #e74c3c; margin-left: 2px; }
.form-item input,
.form-item select,
.form-item textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #e0d5c4;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color .15s;
}
.form-item input:focus,
.form-item select:focus,
.form-item textarea:focus { border-color: #e6a23c; }
.form-item textarea { resize: vertical; font-family: inherit; }
.actions { display: flex; gap: 8px; margin-top: 8px; }
.btn {
  padding: 8px 18px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 14px;
  transition: opacity .15s;
}
.btn.primary { background: #e6a23c; color: #fff; }
.btn.primary:disabled { opacity: .6; cursor: not-allowed; }
.btn.ghost { background: #fff; color: #666; border-color: #e0d5c4; }
.error { color: #e74c3c; font-size: 13px; margin-top: 12px; }
.result { margin-top: 16px; background: #fff; border: 1px solid #ece4d7; border-radius: 8px; padding: 12px 16px; }
.result-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; font-weight: 500; }
.result-head .copy { background: none; border: 1px solid #e0d5c4; border-radius: 4px; padding: 2px 8px; font-size: 12px; cursor: pointer; }
.result pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.6; font-family: inherit; }
</style>
