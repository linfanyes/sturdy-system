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
        <input v-model="profile.school" placeholder="如 阳光小学" />
      </view>
    <button class="save" :disabled="savingProfile" @click="saveProfile">{{ savingProfile ? '保存中…' : '保存资料' }}</button>
  </view>

    <view class="card">
      <view class="card-title">AI 配置（密钥仅存后端）</view>
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
      <view class="hint">支持阿里百炼（通义千问）、DeepSeek 等兼容 OpenAI 接口的服务商。切换服务商时需同步修改接口地址与密钥。系统会按消息是否含图自动在文本/多模态模型间切换。</view>
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
            <view class="hm-p">· AI 接口地址和密钥仅保存在后端，前端不存储。</view>
            <view class="hm-p">· 默认使用阿里百炼（通义千问），可从下拉列表切换 DeepSeek、GPT 等主流模型。</view>
            <view class="hm-p">· 切换服务商时需同时修改「接口地址」和「密钥」：DeepSeek 地址为 https://api.deepseek.com/v1，阿里百炼为 https://dashscope.aliyuncs.com/compatible-mode/v1。</view>
            <view class="hm-p">· 从下拉列表选不到想要的模型？选「自定义」手动输入模型名称即可（如 claude-3.5-sonnet、moonshot-v1 等）。</view>
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
import { auth, setUser, logout, theme, setTheme, setFontSize, setColorScheme, mockMode, FONT_SIZES, SCHEMES } from '../../common/store'

// AI 模型预设与默认值常量（默认阿里百炼 / 通义千问，可切换 DeepSeek 等）
const DEFAULT_TEXT_MODELS = ['qwen-plus', 'qwen-max', 'qwen-turbo-latest', 'deepseek-chat', 'deepseek-reasoner']
const DEFAULT_VISION_MODELS = ['qwen-vl-plus', 'qwen-vl-max', 'gpt-4o']
const DEFAULT_TEMPERATURE = 0.7
const DEFAULT_AI_NAME = '小林子'
const DEFAULT_SYSTEM_PROMPT =
  '你是一位亲切、专业的教师助理，名字叫「小林子」。回答要简洁、清晰、有条理。涉及数据时尽量用列表或表格，方便老师快速理解。'

const profile = ref({ name: '', school: '', subjects: [] })
const ai = ref({})
const app = ref([])
const savingProfile = ref(false)
const savingAi = ref(false)
const showHelp = ref(false)

// 下拉选项 = 预设模型 + "自定义"
const textModelOpts = [...DEFAULT_TEXT_MODELS, '自定义']
const visionModelOpts = [...DEFAULT_VISION_MODELS, '自定义']

// 当前选中索引：命中预设返回其索引，否则返回最后一项（自定义）
const textModelIdx = computed(() => {
  const i = DEFAULT_TEXT_MODELS.indexOf(ai.value.textModel)
  return i >= 0 ? i : textModelOpts.length - 1
})
const visionModelIdx = computed(() => {
  const i = DEFAULT_VISION_MODELS.indexOf(ai.value.visionModel)
  return i >= 0 ? i : visionModelOpts.length - 1
})

// 选择预设模型：选"自定义"时不清空（保留当前值方便微调），否则设为对应预设
function onTextModelPick(e) {
  const idx = Number(e.detail.value)
  if (idx !== textModelOpts.length - 1) {
    ai.value.textModel = DEFAULT_TEXT_MODELS[idx]
  }
  // idx === last → 保持 ai.textModel 当前值，由用户在下方输入框修改
}
function onVisionModelPick(e) {
  const idx = Number(e.detail.value)
  if (idx !== visionModelOpts.length - 1) {
    ai.value.visionModel = DEFAULT_VISION_MODELS[idx]
  }
}

// 恢复默认：保留 baseUrl 和 apiKey 不动，其它字段重置为默认值
function resetAiDefaults() {
  const { baseUrl, apiKey } = ai.value
  ai.value = {
    baseUrl,
    apiKey,
    textModel: DEFAULT_TEXT_MODELS[0],
    visionModel: DEFAULT_VISION_MODELS[0],
    temperature: DEFAULT_TEMPERATURE,
    aiName: DEFAULT_AI_NAME,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  }
}

async function load() {
  const me = await api.get('/users/me')
  profile.value = { name: me.name, school: me.school, subjects: me.subjects || [] }
  const a = await api.get('/config/ai')
  // 补全 ai 字段：即使后端返回 undefined 也要赋默认值，避免 UI 报错
  ai.value = {
    baseUrl: a.baseUrl ?? '',
    apiKey: a.apiKey ?? '',
    textModel: a.textModel ?? DEFAULT_TEXT_MODELS[0],
    visionModel: a.visionModel ?? DEFAULT_VISION_MODELS[0],
    temperature:
      typeof a.temperature === 'number' && !isNaN(a.temperature)
        ? a.temperature
        : DEFAULT_TEMPERATURE,
    aiName: a.aiName ?? DEFAULT_AI_NAME,
    systemPrompt: a.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
  }
  app.value = await api.get('/config/app')
}
onShow(load)

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
    await api.put('/config/ai', ai.value)
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
