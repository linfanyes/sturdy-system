<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import request from '@/api/request'
import { isValidPhone, PHONE_HINT } from '@/utils/validators'
import { User, School, Phone, BookOpen, Calendar, Save } from 'lucide-vue-next'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const form = ref({
  name: '',
  phone: '',
  subject: '',
  subjects: [] as string[],
  gender: '',
  school: '',
})

/** 平台预设学科列表（从超管配置加载） */
const platformSubjects = ref<string[]>([])
const DEFAULT_SUBJECTS = ['语文', '数学', '英语', '科学', '体育', '音乐', '美术', '道法', '劳动', '信息']

const subjectOptions = computed(() =>
  platformSubjects.value.length ? platformSubjects.value : DEFAULT_SUBJECTS,
)

async function loadProfile() {
  loading.value = true
  try {
    // 同时加载用户信息、平台配置的学科、auth/me
    const [res, appCfg, authMe] = await Promise.all([
      request.get('/users/me'),
      request.get('/config/app-config').catch(() => null),
      request.get('/auth/me').catch(() => null),
    ])
    // 解析平台预设学科（兼容 {items:[...]} 与 map 两种形态）
    if (appCfg) {
      const rawSubjects = Array.isArray(appCfg.items)
        ? (appCfg.items.find((it: any) => it.key === 'defaultSubjects')?.value)
        : appCfg.defaultSubjects
      if (rawSubjects) {
        try {
          platformSubjects.value = typeof rawSubjects === 'string'
            ? JSON.parse(rawSubjects)
            : rawSubjects
        } catch {
          platformSubjects.value = String(rawSubjects).split(',').map((s: string) => s.trim()).filter(Boolean)
        }
      }
    }
    form.value = {
      name: res.name || '',
      phone: res.phone || '',
      subject: res.subject || '',
      subjects: Array.isArray(res.subjects) ? res.subjects : [],
      gender: res.gender || '',
      school: res.school || '',
    }
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}
onMounted(loadProfile)

const phoneError = computed(() =>
  form.value.phone && !isValidPhone(form.value.phone) ? PHONE_HINT : '',
)

/** 切换学科选中状态 */
function toggleSubject(subj: string) {
  const idx = form.value.subjects.indexOf(subj)
  if (idx >= 0) form.value.subjects.splice(idx, 1)
  else form.value.subjects.push(subj)
  // 同步单个 subject 字段（兼容旧逻辑）
  form.value.subject = form.value.subjects.join(',')
}

async function save() {
  if (form.value.phone && !isValidPhone(form.value.phone)) {
    alert(PHONE_HINT)
    return
  }
  saving.value = true
  try {
    await request.patch('/users/me', {
      name: form.value.name,
      phone: form.value.phone,
      subject: form.value.subjects.join(','),
      subjects: form.value.subjects,
      gender: form.value.gender,
    })
    auth.updateUser({ name: form.value.name })
    alert('已保存')
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-cocoa-900">个人中心</h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer max-w-4xl">
      <div v-if="loading" class="text-cocoa-400 text-sm py-4">加载中…</div>
      <div v-else class="space-y-4">
        <div class="flex items-center gap-3 pb-4 border-b border-cream-200">
          <div class="w-16 h-16 rounded-full bg-butter-300 flex items-center justify-center">
            <User class="w-8 h-8 text-cocoa-700" />
          </div>
          <div>
            <div class="text-lg font-semibold text-cocoa-900">{{ auth.user?.name }}</div>
            <div class="text-sm text-cocoa-500">{{ auth.user?.schoolName }}</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm text-cocoa-500 flex items-center gap-1"><User class="w-3.5 h-3.5" />姓名</label>
            <input v-model="form.name" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
          </div>
          <div>
            <label class="text-sm text-cocoa-500 flex items-center gap-1"><Phone class="w-3.5 h-3.5" />手机号</label>
            <input
              v-model="form.phone"
              class="w-full mt-1 px-3 py-2 rounded-xl border focus:outline-none"
              :class="phoneError ? 'border-red-400' : 'border-cream-200 focus:border-butter-400'"
            />
            <p v-if="phoneError" class="text-xs text-red-500 mt-1">{{ phoneError }}</p>
          </div>
          <div>
            <label class="text-sm text-cocoa-500 flex items-center gap-1"><Calendar class="w-3.5 h-3.5" />性别</label>
            <select v-model="form.gender" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
              <option value="">未设置</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="text-sm text-cocoa-500 flex items-center gap-1"><School class="w-3.5 h-3.5" />所属学校</label>
            <input v-model="form.school" readonly placeholder="由学校管理员分配" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 bg-cream-50 text-cocoa-400" />
          </div>
        </div>

        <!-- 任教学科（多选） -->
        <div>
          <label class="text-sm text-cocoa-500 flex items-center gap-1"><BookOpen class="w-3.5 h-3.5" />任教学科（可多选）</label>
          <div class="flex flex-wrap gap-2 mt-2">
            <button
              v-for="subj in subjectOptions"
              :key="subj"
              type="button"
              :class="[
                'text-sm px-3 py-1.5 rounded-full border transition-colors',
                form.subjects.includes(subj)
                  ? 'border-butter-400 bg-butter-100 text-butter-600'
                  : 'border-cream-200 text-cocoa-500 hover:bg-cream-50',
              ]"
              @click="toggleSubject(subj)"
            >{{ subj }}</button>
          </div>
          <p v-if="!subjectOptions.length" class="text-xs text-cocoa-300 mt-1">暂无可选学科</p>
        </div>

        <div class="flex justify-end pt-2">
          <button
            class="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
            :disabled="saving"
            @click="save"
          >
            <Save class="w-4 h-4" /> {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
