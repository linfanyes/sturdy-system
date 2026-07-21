<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="card">
      <view class="card-title">个人资料</view>
      <view class="field">
        <text class="label">称呼</text>
        <input v-model="profile.name" placeholder="如 王老师" />
      </view>
      <view class="field">
        <text class="label">学校</text>
        <input v-model="profile.school" placeholder="由学校管理员分配" disabled="true" />
      </view>
    <button class="save" :disabled="savingProfile" @click="saveProfile">{{ savingProfile ? '保存中…' : '保存资料' }}</button>
  </view>

    <view class="card">
      <view class="card-title">📆 学期管理</view>
      <view class="row">
        <view class="row-text">
          <text class="row-name">当前学期：{{ currentSemesterName || '未设置' }}</text>
          <text class="row-sub">{{ currentSemesterName ? currentSemester.startDate + ' ~ ' + currentSemester.endDate : '点击右侧按钮自动生成当前日期的学期' }}</text>
        </view>
        <text class="sem-add" @click="autoAddSemester">＋ 添加当前学期</text>
      </view>
      <view class="sem-list" v-if="semesters.length">
        <view class="sem-row" v-for="s in semesters" :key="s.id">
          <view class="sem-info">
            <text class="sem-name" :class="{ cur: s.current }">{{ s.name }}{{ s.current ? ' ✓' : '' }}</text>
            <text class="sem-date">{{ s.startDate }} ~ {{ s.endDate }}</text>
          </view>
          <view class="sem-acts">
            <text v-if="!s.current" class="sem-act" @click="setCurrent(s)">设为当前</text>
            <text class="sem-act del" @click="delSemester(s)">删除</text>
          </view>
        </view>
      </view>
      <view v-if="showSem" class="sem-edit">
        <view class="sem-field">
          <text class="sem-label">学年</text>
          <picker :range="yearOpts" :value="yearIdx" @change="onYearPick">
            <view class="inp-sm pick-view">{{ yearOpts[yearIdx] }}年</view>
          </picker>
        </view>
        <view class="sem-field">
          <text class="sem-label">学期</text>
          <view class="sem-seasons">
            <text class="sem-season" :class="semForm.season === '春季' && 'on'" @click="onSeasonPick('春季')">春季</text>
            <text class="sem-season" :class="semForm.season === '秋季' && 'on'" @click="onSeasonPick('秋季')">秋季</text>
          </view>
        </view>
        <view class="sem-preview">学期名称：{{ semForm.name || '请选择' }}</view>
        <view class="sem-ebtn">
          <text class="sem-cancel" @click="showSem=false">取消</text>
          <text class="sem-ok" @click="saveSemester">{{ editingSem ? '更新' : '添加' }}</text>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="card-title">AI 配置（密钥仅存后端）</view>
      <view class="field">
        <text class="label">服务商</text>
        <picker :range="PROVIDER_NAMES" :value="providerIdx" @change="onProviderChange">
          <view class="picker-view">{{ PROVIDER_NAMES[providerIdx] || '请选择' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">接口地址</text>
        <input v-model="ai.baseUrl" placeholder="AI 接口地址" />
      </view>
      <view class="field">
        <text class="label">密钥</text>
        <input v-model="ai.apiKey" placeholder="AI 密钥" password />
      </view>
      <view class="field">
        <text class="label">文本模型</text>
        <picker :range="textModelOpts" :value="textModelIdx" @change="onTextModelPick">
          <view class="picker-view">{{ textModelOpts[textModelIdx] }}</view>
        </picker>
        <input v-if="textModelIdx === textModelOpts.length - 1" v-model="ai.textModel" placeholder="输入模型名，如 claude-3.5-sonnet" />
      </view>
      <view class="field">
        <text class="label">多模态模型</text>
        <picker :range="visionModelOpts" :value="visionModelIdx" @change="onVisionModelPick">
          <view class="picker-view">{{ visionModelOpts[visionModelIdx] }}</view>
        </picker>
        <input v-if="visionModelIdx === visionModelOpts.length - 1" v-model="ai.visionModel" placeholder="自定义模型名称" />
      </view>
      <view class="field" v-if="hasImageModels">
        <text class="label">文生图模型</text>
        <picker :range="imageModelOpts" :value="imageModelIdx" @change="onImageModelPick">
          <view class="picker-view">{{ imageModelOpts[imageModelIdx] }}</view>
        </picker>
        <input v-if="imageModelIdx === imageModelOpts.length - 1" v-model="ai.imageModel" placeholder="自定义模型名称" />
        <view class="hint" style="margin-top:6rpx">用于「图像创造」的文生图功能（当前服务商：{{ PROVIDER_NAMES[providerIdx] }}）</view>
      </view>
      <view class="field" v-if="hasVideoModels">
        <text class="label">文生视频模型</text>
        <picker :range="videoModelOpts" :value="videoModelIdx" @change="onVideoModelPick">
          <view class="picker-view">{{ videoModelOpts[videoModelIdx] }}</view>
        </picker>
        <input v-if="videoModelIdx === videoModelOpts.length - 1" v-model="ai.videoModel" placeholder="自定义模型名称" />
        <view class="hint" style="margin-top:6rpx">用于「图像创造」的文生视频功能（当前服务商：{{ PROVIDER_NAMES[providerIdx] }}）</view>
      </view>
      <view class="field">
        <text class="label">温度（{{ ai.temperature }}）</text>
        <input type="digit" v-model="ai.temperature" placeholder="0 - 2" />
        <slider :value="ai.temperature" :min="0" :max="2" :step="0.1" @change="e => ai.temperature = e.detail.value" activeColor="#07c160" />
      </view>
      <view class="field">
        <text class="label">AI 名字</text>
        <input v-model="ai.aiName" placeholder="AI 名字" />
      </view>
      <view class="field">
        <text class="label">系统提示词</text>
        <textarea v-model="ai.systemPrompt" class="ta" placeholder="系统提示词（描述 AI 角色与回答风格）" />
      </view>
      <view class="hint">当前服务商：{{ PROVIDER_NAMES[providerIdx] || '自定义' }}。切换服务商将自动更新接口地址与默认模型。{{ providerIdx === 1 ? 'DeepSeek v4 为原生多模态模型，文本与视觉使用同一模型名。' : '' }}</view>
      <view class="reset-row">
        <button class="ghost-btn" @click="resetAiDefaults">恢复默认</button>
      </view>
      <button class="save" :disabled="savingAi" @click="saveAi">{{ savingAi ? '保存中…' : '保存 AI 配置' }}</button>
    </view>

    <view class="card">
      <view class="card-title">外观</view>
      <view class="row">
        <view class="row-text">
          <text class="row-name">深色模式</text>
          <text class="row-sub">切换后全应用深色配色（含导航栏与底栏）</text>
        </view>
        <switch :checked="theme.mode === 'dark'" color="#07c160" @change="onTheme" />
      </view>
      <view class="row">
        <view class="row-text">
          <text class="row-name">字体大小</text>
          <text class="row-sub">小 / 标准 / 大，影响主要文字</text>
        </view>
        <view class="font-group">
          <text
            v-for="f in FONT_SIZES"
            :key="f.value"
            class="font-i"
            :class="{ on: theme.fontSize === f.value }"
            @click="onFont(f.value)"
          >{{ f.label }}</text>
        </view>
      </view>
      <view class="row">
        <view class="row-text">
          <text class="row-name">主题色</text>
          <text class="row-sub">影响 tabBar 选中色与默认强调色</text>
        </view>
        <view class="scheme-group">
          <text
            v-for="s in SCHEMES"
            :key="s.value"
            class="scheme-i"
            :class="{ on: theme.colorScheme === s.value }"
            :style="{ background: s.color }"
            @click="onScheme(s.value)"
          >{{ s.label }}</text>
        </view>
      </view>
    </view>

    <!-- 演示模式 -->
    <view class="card">
      <view class="card-title">🛝 演示模式</view>
      <view class="row">
        <view class="row-text">
          <text class="row-name">启用演示模式</text>
          <text class="row-sub">开启后所有数据使用本地模拟内容，无需后端即可预览全部功能。适合展示、试用场景。</text>
        </view>
        <switch :checked="mockMode.enabled" color="#e6a23c" @change="onMockMode" />
      </view>
      <view v-if="mockMode.enabled" class="hint" style="color:#e6a23c;">⚡ 演示模式已开启，数据不会影响真实后端。关闭后需重新登录。</view>
    </view>

    <view class="card">
      <view class="card-title">平台配置（来自后端）</view>
      <view v-for="c in app" :key="c.key" class="kv">
        <text class="k">{{ c.key }}</text>
        <text class="v">{{ c.value }}</text>
      </view>
    </view>

    <button class="help-btn" @click="showHelp = true">📖 使用帮助</button>

    <button class="logout" @click="doLogout">退出登录</button>

    <!-- 使用帮助弹层 -->
    <view v-if="showHelp" class="mask" @click="showHelp = false">
      <view class="help-modal" @click.stop>
        <view class="hm-title">📖 使用帮助</view>
        <scroll-view scroll-y class="hm-body">
          <view class="hm-sec">
            <view class="hm-h">🎓 应用简介</view>
            <view class="hm-p">园丁工作台是面向中小学教师的一站式班务管理工具，覆盖班级、学生、考试、成绩、作业、公告、考勤、座位表、班费、活动、AI 教案/试卷/知识点生成等场景。</view>
          </view>
          <view class="hm-sec">
            <view class="hm-h">🚀 快速上手</view>
            <view class="hm-p">1. 在「班级管理」创建班级，在「学生管理」批量录入学生（支持 Excel/图片 AI 识别）。</view>
            <view class="hm-p">2. 在「考试管理」创建考试，在「成绩管理」按班级/考试/科目录入或导入成绩。</view>
            <view class="hm-p">3. 在「作业管理」布置作业，状态自动同步到「班级公告」。</view>
            <view class="hm-p">4. 在「工具箱」使用随机点名、计时器、计分板、奖励兑换、笔顺演示等课堂神器。</view>
          </view>
          <view class="hm-sec">
            <view class="hm-h">🤖 AI 配置说明</view>
            <view class="hm-p">· 通过「服务商」下拉可一键切换阿里百炼（通义千问）/ DeepSeek，接口地址与默认模型自动填充。</view>
            <view class="hm-p">· 阿里百炼：文本模型 qwen-plus/qwen-max/qwen-turbo-latest，多模态 qwen-vl-plus/qwen-vl-max。</view>
            <view class="hm-p">· DeepSeek：文本模型 deepseek-v4-flash/deepseek-v4-pro，v4 为原生多模态模型，文本与视觉可使用同一模型。</view>
            <view class="hm-p">· 选「自定义」可手动输入任意兼容 OpenAI 接口的模型名（如 claude-3.5-sonnet、moonshot-v1 等）。</view>
            <view class="hm-p">· AI 接口地址和密钥仅保存在后端，前端不存储。</view>
            <view class="hm-p">· 温度越高回答越发散，越低越确定。教学场景建议 0.5-0.7。</view>
            <view class="hm-p">· 系统提示词决定 AI 角色和回答风格，可按学科/学段自定义。</view>
          </view>
          <view class="hm-sec">
            <view class="hm-h">📊 数据导入</view>
            <view class="hm-p">· 学生：支持 .xlsx/.xls/.txt/.csv 格式，每行：姓名,性别,学号,家长姓名,家长电话。</view>
            <view class="hm-p">· 成绩：先选好「班级/考试/科目/日期」，再导入 Excel/TXT，列：学号或姓名,分数。</view>
            <view class="hm-p">· 图片识别：可拍照学生名单图片，AI 自动识别后导入。</view>
          </view>
          <view class="hm-sec">
            <view class="hm-h">🎨 个性化</view>
            <view class="hm-p">· 深色模式：夜间护眼。</view>
            <view class="hm-p">· 字体大小：小/标准/大。</view>
            <view class="hm-p">· 主题色：橙/绿/蓝等多种选择。</view>
            <view class="hm-p">· 工具箱「管理」模式：可隐藏不常用工具、调整分区顺序。</view>
          </view>
          <view class="hm-sec">
            <view class="hm-h">🔒 隐私说明</view>
            <view class="hm-p">· 数据通过微信云托管私有链路传输，仅本人账号可见。</view>
            <view class="hm-p">· 学生生日、家长电话等敏感信息不会对外公开。</view>
            <view class="hm-p">· 退出登录后本地缓存自动清理。</view>
          </view>
          <view class="hm-sec">
            <view class="hm-h">❓ 常见问题</view>
            <view class="hm-p">Q: AI 没反应？A: 请检查 AI 接口地址、密钥是否正确，模型是否支持。</view>
            <view class="hm-p">Q: 数据加载慢？A: 请检查网络，下拉刷新或重启小程序。</view>
            <view class="hm-p">Q: 成绩导入失败？A: 请确认 Excel 列顺序、分数范围（0-100）、学生姓名/学号匹配。</view>
          </view>
        </scroll-view>
        <button class="hm-close" @click="showHelp = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api, { setMockMode } from '../../common/request'
import { auth, setUser, logout, theme, setTheme, setFontSize, setColorScheme, mockMode, FONT_SIZES, SCHEMES, flushTabBarStyle } from '../../common/store'

// ==================== 服务商预设（切换服务商时自动更新接口地址与模型列表） ====================
const PROVIDER_PRESETS = {
  '阿里百炼（通义千问）': {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    textModels: ['qwen-plus', 'qwen-max', 'qwen-turbo-latest'],
    visionModels: ['qwen-vl-plus', 'qwen-vl-max'],
    imageModels: [],
    videoModels: [],
  },
  'DeepSeek': {
    baseUrl: 'https://api.deepseek.com/v1',
    textModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    visionModels: ['deepseek-v4-pro'],
    imageModels: [],
    videoModels: [],
  },
  '智谱GLM': {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    textModels: ['GLM-4.7-Flash'],
    visionModels: ['GLM-4.6V-Flash'],
    imageModels: ['GLM-4.6V-Flash'],   // 文生图
    videoModels: ['CogVideoX-Flash'],  // 文生视频
  },
  '自定义': {
    baseUrl: '',
    textModels: [],
    visionModels: [],
    imageModels: [],
    videoModels: [],
  },
}
const PROVIDER_NAMES = Object.keys(PROVIDER_PRESETS)

const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_AI_NAME = '小林子'
const DEFAULT_SYSTEM_PROMPT =
  '你是一位亲切、专业的教师助理，名字叫「小林子」。回答要简洁、清晰、有条理。涉及数据时尽量用列表或表格，方便老师快速理解。'

// 根据 baseUrl 反查当前服务商索引
function detectProvider(baseUrl) {
  if (baseUrl && baseUrl.includes('dashscope.aliyuncs.com')) return 0
  if (baseUrl && baseUrl.includes('api.deepseek.com')) return 1
  if (baseUrl && baseUrl.includes('open.bigmodel.cn')) return 2
  return 3
}

const profile = ref({ name: '', school: '', subjects: [] })
const ai = ref({})
const app = ref([])
const savingProfile = ref(false)
const savingAi = ref(false)
const showHelp = ref(false)
const providerIdx = ref(0)

// 学期管理
const semesters = ref([])
const showSem = ref(false)
const editingSem = ref(null)
const semForm = ref({ name: '', startDate: '', endDate: '', season: '春季', year: '' })
const currentSemester = computed(() => semesters.value.find((s) => s.current) || null)
const currentSemesterName = computed(() => currentSemester.value ? currentSemester.value.name : '')

// 年份选项：近五年（当前年份前2年 ~ 后2年）
const yearOpts = computed(() => {
  const y = new Date().getFullYear()
  return [y - 2, y - 1, y, y + 1, y + 2].map(String)
})
const yearIdx = ref(2) // 默认选中当前年份

// 根据年份+季节生成学期名和日期
function buildSemester(year, season) {
  const name = year + '年' + season + '学期'
  let startDate, endDate
  if (season === '春季') {
    startDate = year + '-02-17'
    endDate = year + '-07-04'
  } else {
    startDate = year + '-09-01'
    endDate = (Number(year) + 1) + '-01-15'
  }
  return { name, startDate, endDate }
}
function onYearPick(e) {
  yearIdx.value = e.detail.value
  const y = yearOpts.value[yearIdx.value]
  const built = buildSemester(y, semForm.value.season)
  semForm.value = { ...semForm.value, year: y, ...built }
}
function onSeasonPick(season) {
  const y = yearOpts.value[yearIdx.value]
  const built = buildSemester(y, season)
  semForm.value = { ...semForm.value, season, year: y, ...built }
}

// 自动学期检测：上半年=春季，下半年=秋季
function autoSemesterName() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m <= 6 ? y + '年春季学期' : y + '年秋季学期'
}

async function loadSemesters() {
  try { semesters.value = await api.get('/semesters') } catch (e) { semesters.value = [] }
  // 无当前学期时自动弹出添加对话框
  if (!currentSemester.value) {
    initSemForm()
    showSem.value = true
  }
}
function initSemForm() {
  const now = new Date()
  const y = String(now.getFullYear())
  const m = now.getMonth() + 1
  const season = m <= 6 ? '春季' : '秋季'
  yearIdx.value = yearOpts.value.indexOf(y) >= 0 ? yearOpts.value.indexOf(y) : 2
  const built = buildSemester(y, season)
  semForm.value = { name: built.name, startDate: built.startDate, endDate: built.endDate, season, year: y }
  editingSem.value = null
}
function autoAddSemester() {
  initSemForm()
  showSem.value = true
}
async function saveSemester() {
  if (!semForm.value.name.trim()) return uni.showToast({ title: '请选择年份和学期', icon: 'none' })
  try {
    const payload = { name: semForm.value.name, startDate: semForm.value.startDate, endDate: semForm.value.endDate }
    if (editingSem.value) {
      await api.patch('/semesters/' + editingSem.value.id, payload)
    } else {
      // 新建学期时如果不存在当前学期，自动设为当前
      await api.post('/semesters', { ...payload, current: !currentSemester.value })
    }
    showSem.value = false
    await loadSemesters()
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) { uni.showToast({ title: '失败:' + (e.message || ''), icon: 'none' }) }
}
async function setCurrent(s) {
  try {
    // 清除所有 current
    for (const sem of semesters.value) {
      if (sem.current) await api.patch('/semesters/' + sem.id, { current: false })
    }
    await api.patch('/semesters/' + s.id, { current: true })
    await loadSemesters()
  } catch (e) { uni.showToast({ title: '失败', icon: 'none' }) }
}
async function delSemester(s) {
  uni.showModal({ title: '删除学期', content: s.name, success: async (m) => {
    if (!m.confirm) return
    try { await api.del('/semesters/' + s.id); await loadSemesters() }
    catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
  }})
}

// 当前服务商的模型列表（computed）
const currentTextModels = computed(() => PROVIDER_PRESETS[PROVIDER_NAMES[providerIdx.value]].textModels)
const currentVisionModels = computed(() => PROVIDER_PRESETS[PROVIDER_NAMES[providerIdx.value]].visionModels)
const currentImageModels = computed(() => PROVIDER_PRESETS[PROVIDER_NAMES[providerIdx.value]].imageModels)
const currentVideoModels = computed(() => PROVIDER_PRESETS[PROVIDER_NAMES[providerIdx.value]].videoModels)

// 是否支持文生图/文生视频（有预设模型时显示对应字段）
const hasImageModels = computed(() => currentImageModels.value.length > 0)
const hasVideoModels = computed(() => currentVideoModels.value.length > 0)

// 下拉选项 = 当前服务商模型 + "自定义"
const textModelOpts = computed(() => [...currentTextModels.value, '自定义'])
const visionModelOpts = computed(() => [...currentVisionModels.value, '自定义'])
const imageModelOpts = computed(() => [...currentImageModels.value, '自定义'])
const videoModelOpts = computed(() => [...currentVideoModels.value, '自定义'])

// 当前选中索引：命中当前服务商预设返回其索引，否则返回最后一项（自定义）
const textModelIdx = computed(() => {
  const i = currentTextModels.value.indexOf(ai.value.textModel)
  return i >= 0 ? i : textModelOpts.value.length - 1
})
const visionModelIdx = computed(() => {
  const i = currentVisionModels.value.indexOf(ai.value.visionModel)
  return i >= 0 ? i : visionModelOpts.value.length - 1
})
const imageModelIdx = computed(() => {
  const i = currentImageModels.value.indexOf(ai.value.imageModel)
  return i >= 0 ? i : imageModelOpts.value.length - 1
})
const videoModelIdx = computed(() => {
  const i = currentVideoModels.value.indexOf(ai.value.videoModel)
  return i >= 0 ? i : videoModelOpts.value.length - 1
})

// 服务商切换：自动填充接口地址 + 默认模型（含文生图/文生视频）
function onProviderChange(e) {
  const idx = Number(e.detail.value)
  if (idx === providerIdx.value) return
  providerIdx.value = idx
  const preset = PROVIDER_PRESETS[PROVIDER_NAMES[idx]]
  ai.value.baseUrl = preset.baseUrl || ai.value.baseUrl
  if (preset.textModels.length) ai.value.textModel = preset.textModels[0]
  if (preset.visionModels.length) ai.value.visionModel = preset.visionModels[0]
  if (preset.imageModels.length) ai.value.imageModel = preset.imageModels[0]
  if (preset.videoModels.length) ai.value.videoModel = preset.videoModels[0]
}

// 选择预设模型：选"自定义"时不清空（保留当前值方便微调），否则设为对应预设
function onTextModelPick(e) {
  const idx = Number(e.detail.value)
  if (idx !== textModelOpts.value.length - 1) {
    ai.value.textModel = currentTextModels.value[idx]
  }
}
function onVisionModelPick(e) {
  const idx = Number(e.detail.value)
  if (idx !== visionModelOpts.value.length - 1) {
    ai.value.visionModel = currentVisionModels.value[idx]
  }
}
function onImageModelPick(e) {
  const idx = Number(e.detail.value)
  if (idx !== imageModelOpts.value.length - 1) {
    ai.value.imageModel = currentImageModels.value[idx]
  }
}
function onVideoModelPick(e) {
  const idx = Number(e.detail.value)
  if (idx !== videoModelOpts.value.length - 1) {
    ai.value.videoModel = currentVideoModels.value[idx]
  }
}

// 恢复默认：重置为当前服务商的默认配置
function resetAiDefaults() {
  const preset = PROVIDER_PRESETS[PROVIDER_NAMES[providerIdx.value]]
  ai.value = {
    baseUrl: preset.baseUrl || '',
    apiKey: ai.value.apiKey,
    textModel: preset.textModels[0] || '',
    visionModel: preset.visionModels[0] || '',
    imageModel: preset.imageModels[0] || '',
    videoModel: preset.videoModels[0] || '',
    temperature: DEFAULT_TEMPERATURE,
    aiName: DEFAULT_AI_NAME,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  }
}

async function load() {
  const me = await api.get('/users/me')
  profile.value = { name: me.name, school: me.school, subjects: me.subjects || [] }
  loadSemesters()
  const a = await api.get('/config/ai')
  // 补全 ai 字段：即使后端返回 undefined 也要赋默认值，避免 UI 报错
  const firstProvider = PROVIDER_PRESETS[PROVIDER_NAMES[0]]
  ai.value = {
    baseUrl: a.baseUrl ?? firstProvider.baseUrl,
    apiKey: a.apiKey ?? '',
    textModel: a.textModel ?? firstProvider.textModels[0],
    visionModel: a.visionModel ?? firstProvider.visionModels[0],
    imageModel: a.imageModel ?? (firstProvider.imageModels[0] || ''),
    videoModel: a.videoModel ?? (firstProvider.videoModels[0] || ''),
    temperature:
      typeof a.temperature === 'number' && !isNaN(a.temperature)
        ? a.temperature
        : DEFAULT_TEMPERATURE,
    aiName: a.aiName ?? DEFAULT_AI_NAME,
    systemPrompt: a.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
  }
  // 根据已保存的接口地址反查服务商
  providerIdx.value = detectProvider(ai.value.baseUrl)
  app.value = await api.get('/config/app')
}
onShow(load)
onShow(() => flushTabBarStyle())

function onTheme(e) {
  setTheme(e.detail.value ? 'dark' : 'light')
}
function onFont(v) {
  setFontSize(v)
  uni.showToast({ title: '已切换字体', icon: 'none' })
}
function onScheme(v) {
  setColorScheme(v)
  uni.showToast({ title: '已切换主题色', icon: 'none' })
}
function onMockMode(e) {
  const enabled = e.detail.value
  mockMode.enabled = enabled
  uni.setStorageSync('g_mock_mode', String(enabled))
  setMockMode(enabled)
  if (enabled) {
    uni.showToast({ title: '演示模式已开启，请下拉刷新', icon: 'none' })
  } else {
    // 关闭演示模式 → 清除模拟 token → 跳登录
    logout()
    uni.reLaunch({ url: '/pages/login/login' })
  }
}
async function saveProfile() {
  if (savingProfile.value) return
  savingProfile.value = true
  try {
    await api.put('/users/me', { name: profile.value.name, school: profile.value.school })
    setUser({ ...auth.user, name: profile.value.name, school: profile.value.school })
    uni.showToast({ title: '资料已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    savingProfile.value = false
  }
}
async function saveAi() {
  if (savingAi.value) return
  savingAi.value = true
  try {
    // 显式构造纯对象，避免 Vue reactive proxy 序列化异常；temperature 转数字
    const payload = {
      baseUrl: ai.value.baseUrl || '',
      apiKey: ai.value.apiKey || '',
      textModel: ai.value.textModel || '',
      visionModel: ai.value.visionModel || '',
      imageModel: ai.value.imageModel || '',
      videoModel: ai.value.videoModel || '',
      temperature: Number(ai.value.temperature) || 0.7,
      aiName: ai.value.aiName || '',
      systemPrompt: ai.value.systemPrompt || '',
    }
    await api.put('/config/ai', payload)
    uni.showToast({ title: 'AI 配置已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    savingAi.value = false
  }
}
function doLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    confirmColor: '#e64340',
    success: (r) => {
      if (!r.confirm) return
      logout()
      uni.reLaunch({ url: '/pages/login/login' })
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 24rpx; padding-bottom: 16rpx; border-bottom: 1px solid var(--c-border); }
.field { margin-bottom: 20rpx; }
.label { display: block; font-size: 26rpx; color: var(--c-sub); margin-bottom: 10rpx; }
.field input {
  width: 100%; height: 80rpx; min-height: 80rpx; line-height: 44rpx;
  border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx;
  font-size: 28rpx; color: var(--c-text); background: var(--c-input);
  box-sizing: border-box;
}
.hint { display: block; font-size: 24rpx; color: var(--c-sub); line-height: 1.8; margin: 6rpx 0 18rpx; word-break: break-word; padding: 10rpx 0; }
.save { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 8rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.kv { display: flex; justify-content: space-between; align-items: flex-start; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); gap: 20rpx; }
.k { color: var(--c-sub); font-size: 26rpx; flex-shrink: 0; line-height: 1.6; }
.v { color: var(--c-title); font-size: 26rpx; flex: 1; text-align: right; word-break: break-all; line-height: 1.6; }
.row { display: flex; align-items: center; justify-content: space-between; }
.row-text { flex: 1; padding-right: 20rpx; }
.row-name { display: block; font-size: 28rpx; color: var(--c-text); font-weight: 600; }
.row-sub { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; line-height: 1.5; }
.picker-view { height: 80rpx; line-height: 80rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; }
.picker-view + input { margin-top: 12rpx; }
.ta { width: 100%; min-height: 220rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; line-height: 1.6; }
.ghost-btn { background: transparent; color: var(--c-primary); border: 1px solid var(--c-primary); border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
.reset-row { margin-top: 16rpx; margin-bottom: 16rpx; }
.font-group { display: flex; gap: 8rpx; }
.font-i { font-size: 24rpx; padding: 8rpx 20rpx; border-radius: 24rpx; background: var(--c-card2); color: var(--c-sub); }
.font-i.on { background: var(--c-primary); color: #fff; }
.scheme-group { display: flex; gap: 8rpx; }
.scheme-i { font-size: 22rpx; padding: 8rpx 16rpx; border-radius: 24rpx; color: #fff; opacity: 0.55; }
.scheme-i.on { opacity: 1; box-shadow: 0 0 0 4rpx rgba(255,255,255,0.6); }
.logout { background: var(--c-danger); color: #fff; border-radius: 50rpx; margin-top: 10rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
/* 学期管理 */
.sem-add { font-size: 24rpx; color: #fff; background: var(--c-accent); padding: 8rpx 18rpx; border-radius: 20rpx; flex-shrink: 0; }
.sem-list { margin-top: 14rpx; }
.sem-row { display: flex; align-items: center; justify-content: space-between; padding: 14rpx 0; border-top: 1px solid var(--c-border); }
.sem-info { display: flex; flex-direction: column; }
.sem-name { font-size: 28rpx; color: var(--c-title); }
.sem-name.cur { color: var(--c-accent); font-weight: 700; }
.sem-date { font-size: 22rpx; color: var(--c-sub); }
.sem-acts { display: flex; gap: 18rpx; }
.sem-act { font-size: 24rpx; color: var(--c-primary); }
.sem-act.del { color: var(--c-danger); }
.sem-edit { margin-top: 14rpx; padding: 16rpx; background: var(--c-card2); border-radius: 14rpx; }
.inp-sm { width: 100%; border: 1px solid var(--c-border); border-radius: 10rpx; padding: 12rpx 14rpx; margin-bottom: 10rpx; font-size: 26rpx; box-sizing: border-box; }
.pick-view { color: var(--c-title); background: var(--c-card); min-height: 44rpx; }
.sem-field { margin-bottom: 14rpx; }
.sem-label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 8rpx; }
.sem-seasons { display: flex; gap: 16rpx; }
.sem-season { flex: 1; text-align: center; font-size: 28rpx; padding: 16rpx 0; border-radius: 12rpx; border: 2rpx solid var(--c-border); color: var(--c-sub); background: var(--c-card); }
.sem-season.on { border-color: var(--c-accent); color: #fff; background: var(--c-accent); font-weight: 700; }
.sem-preview { font-size: 26rpx; color: var(--c-title); margin: 10rpx 0; padding: 10rpx 14rpx; background: var(--c-card); border-radius: 10rpx; }
.sem-ebtn { display: flex; gap: 14rpx; justify-content: flex-end; }
.sem-cancel { font-size: 26rpx; color: var(--c-sub); padding: 10rpx 20rpx; }
.sem-ok { font-size: 26rpx; color: #fff; background: var(--c-primary); padding: 10rpx 28rpx; border-radius: 20rpx; }
.help-btn { background: var(--c-card); color: var(--c-accent); border: 1px solid var(--c-accent); border-radius: 50rpx; margin-top: 10rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
/* P2-1: 使用帮助弹层 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.help-modal { width: 640rpx; max-height: 84vh; background: var(--c-card); border-radius: 24rpx; padding: 30rpx; display: flex; flex-direction: column; box-sizing: border-box; }
.hm-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); text-align: center; margin-bottom: 16rpx; }
.hm-body { flex: 1; max-height: 60vh; }
.hm-sec { margin-bottom: 20rpx; }
.hm-h { font-size: 28rpx; font-weight: 700; color: var(--c-accent); margin-bottom: 8rpx; }
.hm-p { display: block; font-size: 24rpx; color: var(--c-title); line-height: 1.7; margin-bottom: 6rpx; }
.hm-close { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 16rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; }
</style>
