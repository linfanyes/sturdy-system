<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <text class="h">🎨 图像创造</text>
      <text class="sub">AI 驱动的图像与视频生成</text>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <view class="tab" :class="tab === 'image' && 'on'" @click="tab = 'image'">🖼️ 图片生成</view>
      <view class="tab" :class="tab === 'video' && 'on'" @click="tab = 'video'">🎬 视频生成</view>
    </view>

    <!-- 模型信息 -->
    <view class="model-info" v-if="currentModel">
      <text class="mi-label">使用模型：</text>
      <text class="mi-name">{{ currentModel }}</text>
      <text class="mi-prov" v-if="aiConfig.baseUrl">（{{ providerLabel }}）</text>
    </view>
    <view class="model-info warn" v-else>
      ⚠️ 请在「设置 → AI 配置」中将服务商切换为「智谱GLM」以使用图像创造功能
    </view>

    <!-- Prompt 输入 -->
    <view class="prompt-box">
      <text class="pb-title">{{ tab === 'image' ? '描述你想要生成的图片' : '描述你想要生成的视频' }}</text>
      <textarea v-model="prompt" class="pb-input" :placeholder="tab === 'image' ? '例如：一只可爱的橘猫坐在窗台上，阳光洒在身上，画面温馨治愈' : '例如：海边的日落，海浪轻轻拍打着沙滩，云彩缓缓飘动'" />
      <view class="pb-tips">
        <text v-for="t in tips" :key="t" class="pb-tip" @click="prompt = t">{{ t }}</text>
      </view>
    </view>

    <!-- 生成按钮 -->
    <button class="gen-btn" :disabled="loading || !prompt || !currentModel" @click="generate">
      {{ loading ? '生成中…' : (tab === 'image' ? '🖼️ 生成图片' : '🎬 生成视频') }}
    </button>

    <!-- 结果区域 -->
    <view v-if="resultSrc" class="result">
      <view class="r-title">生成结果</view>
      <view class="r-prompt">提示词：{{ resultPrompt }}</view>

      <!-- 图片结果 -->
      <image v-if="tab === 'image' && prevMode === 'image'" :src="resultSrc" class="r-img" mode="widthFix" @click="preview(resultSrc)" />
      <!-- 视频结果 -->
      <video v-if="prevMode === 'video'" :src="resultSrc" class="r-video" controls autoplay loop muted />

      <view class="r-acts">
        <text class="ra" @click="saveToAlbum">📁 添加到我的相册</text>
        <text class="ra" @click="download">💾 下载</text>
        <text class="ra" @click="regenerate">🔄 重新生成</text>
      </view>

      <!-- 添加到相册：选择相册 -->
      <view v-if="showAlbumPicker" class="album-picker">
        <view class="ap-title">选择目标相册（自动分类：{{ autoCategory }}）</view>
        <view v-for="a in albumList" :key="a.id" class="ap-opt" @click="doAddToAlbum(a.id)">{{ a.title }}</view>
        <view class="ap-opt new" @click="createAndAdd">＋ 新建「{{ autoCategory }}」相册并添加</view>
        <button class="cancel" @click="showAlbumPicker = false">取消</button>
      </view>
    </view>

    <!-- 预览大图 -->
    <view v-if="previewSrc" class="preview-mask" @click="previewSrc = ''">
      <image :src="previewSrc" class="preview-img" mode="widthFix" @click.stop show-menu-by-longpress />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'

const tab = ref('image')
const prompt = ref('')
const loading = ref(false)
const resultSrc = ref('')
const resultPrompt = ref('')
const prevMode = ref('image')
const previewSrc = ref('')
const showAlbumPicker = ref(false)
const albumList = ref([])
const aiConfig = ref({})
const autoCategory = ref('其他')

// 提示词快捷输入
const tips = computed(() => tab.value === 'image'
  ? ['一只可爱的猫咪在窗边看书', '春天的樱花树下，花瓣飘落', '未来城市夜景，霓虹闪烁', '水墨画风格的山水风景', '卡通风格的生日蛋糕']
  : ['海边的日落，海浪轻轻拍打', '猫咪在花园里追蝴蝶', '雪花飘飘的冬季街景', '星空下的露营篝火', '城市的车流夜景延时']
)

// 当前模型
const currentModel = computed(() => tab.value === 'image' ? aiConfig.value.imageModel : aiConfig.value.videoModel)
const providerLabel = computed(() => {
  const url = aiConfig.value.baseUrl || ''
  if (url.includes('dashscope')) return '阿里百炼'
  if (url.includes('deepseek')) return 'DeepSeek'
  if (url.includes('bigmodel')) return '智谱GLM'
  return '自定义'
})

// 自动分类
function categorize(p) {
  const cats = {
    '风景': ['风景', '山水', '日出', '日落', '海', '山', '河', '湖', '森林', '花', '树', '云', '天空'],
    '人物': ['人物', '人', '肖像', '美女', '帅哥', '小孩', '学生'],
    '动物': ['动物', '猫', '狗', '鸟', '鱼', '宠物', '兔子', '熊猫'],
    '美食': ['美食', '食物', '蛋糕', '甜品', '饮料', '水果'],
    '建筑': ['建筑', '房子', '城市', '夜景', '街景', '桥'],
    '艺术': ['画', '水墨', '抽象', '插画', '卡通', '动漫', '油画'],
    '科技': ['科技', '未来', '机器人', 'AI', '科幻', '太空', '星空'],
  }
  for (const [cat, kws] of Object.entries(cats)) {
    if (kws.some((k) => p.includes(k))) return cat
  }
  return '其他'
}

async function loadConfig() {
  try {
    aiConfig.value = await api.get('/config/ai')
  } catch (_) {
    aiConfig.value = {}
  }
}

async function loadAlbums() {
  try {
    albumList.value = await api.getList('/my-galleries', { silent: true })
  } catch (_) {
    albumList.value = []
  }
}

onShow(() => { loadConfig(); loadAlbums() })

function generate() {
  if (tab.value === 'image') generateImage()
  else generateVideo()
}

async function generateImage() {
  if (loading.value || !prompt.value) return
  loading.value = true; resultSrc.value = ''
  try {
    const res = await api.post('/ai/gen-image', {
      prompt: prompt.value,
      model: currentModel.value || 'GLM-4.6V-Flash',
      size: '1024x1024',
    })
    resultSrc.value = res.imageUrl || res.content || ''
    resultPrompt.value = prompt.value
    prevMode.value = 'image'
    autoCategory.value = categorize(prompt.value)
    if (!resultSrc.value) uni.showToast({ title: '服务端未返回图片', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '生成失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function generateVideo() {
  if (loading.value || !prompt.value) return
  loading.value = true; resultSrc.value = ''
  try {
    const res = await api.post('/ai/gen-video', {
      prompt: prompt.value,
      model: currentModel.value || 'CogVideoX-Flash',
    })
    resultSrc.value = res.videoUrl || res.content || ''
    resultPrompt.value = prompt.value
    prevMode.value = 'video'
    autoCategory.value = categorize(prompt.value)
    if (!resultSrc.value) uni.showToast({ title: '服务端未返回视频', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '生成失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

function regenerate() { generate() }

function saveToAlbum() {
  if (!resultSrc.value) return uni.showToast({ title: '暂无生成结果', icon: 'none' })
  loadAlbums()
  autoCategory.value = categorize(resultPrompt.value || prompt.value)
  showAlbumPicker.value = true
}

async function doAddToAlbum(albumId) {
  try {
    const album = albumList.value.find((a) => a.id === albumId)
    const photos = [...(album.photos || []), resultSrc.value]
    await api.patch('/my-galleries/' + albumId, { photos })
    uni.showToast({ title: '已添加到相册', icon: 'success' })
    showAlbumPicker.value = false
  } catch (e) {
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

async function createAndAdd() {
  try {
    const r = await api.post('/my-galleries', {
      title: autoCategory.value,
      date: new Date().toISOString().slice(0, 10),
      description: '由 AI 图像创造自动生成',
      photos: [resultSrc.value],
    })
    uni.showToast({ title: '已创建并添加', icon: 'success' })
    showAlbumPicker.value = false; loadAlbums()
  } catch (e) {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}

function download() {
  if (!resultSrc.value) return
  if (prevMode.value === 'video') {
    uni.downloadFile({
      url: resultSrc.value,
      success: (r) => {
        uni.saveVideoToPhotosAlbum({ filePath: r.tempFilePath, success: () => uni.showToast({ title: '已保存到系统相册', icon: 'success' }) })
      },
      fail: () => uni.showToast({ title: '下载失败', icon: 'none' }),
    })
  } else {
    if (resultSrc.value.startsWith('data:')) {
      const fs = wx.getFileSystemManager()
      const fp = wx.env.USER_DATA_PATH + '/img_' + Date.now() + '.jpg'
      fs.writeFile({ filePath: fp, data: resultSrc.value.replace(/^data:image\/\w+;base64,/, ''), encoding: 'base64', success: () => {
        uni.saveImageToPhotosAlbum({ filePath: fp, success: () => uni.showToast({ title: '已保存到系统相册', icon: 'success' }) })
      }, fail: () => uni.showToast({ title: '保存失败', icon: 'none' }) })
    } else {
      uni.downloadFile({ url: resultSrc.value, success: (r) => {
        uni.saveImageToPhotosAlbum({ filePath: r.tempFilePath, success: () => uni.showToast({ title: '已保存到系统相册', icon: 'success' }) })
      }, fail: () => uni.showToast({ title: '下载失败', icon: 'none' }) })
    }
  }
}

function preview(src) {
  if (prevMode.value === 'image') previewSrc.value = src
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.head { margin-bottom: 16rpx; }
.h { font-size: 36rpx; font-weight: 800; color: var(--c-title); display: block; }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; display: block; }
.tabs { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 16rpx; font-size: 28rpx; background: var(--c-card2); color: var(--c-sub); }
.tab.on { background: var(--c-accent); color: #fff; font-weight: 600; }
.model-info { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 16rpx; font-size: 24rpx; color: var(--c-sub); }
.model-info.warn { background: #fff3cd; color: #856404; }
.mi-name { color: var(--c-accent); font-weight: 600; }
.prompt-box { margin-bottom: 16rpx; }
.pb-title { font-size: 28rpx; color: var(--c-title); font-weight: 600; margin-bottom: 10rpx; display: block; }
.pb-input { width: 100%; height: 160rpx; border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 18rpx 20rpx; font-size: 28rpx; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.pb-tips { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; }
.pb-tip { font-size: 22rpx; padding: 8rpx 18rpx; background: var(--c-card2); color: var(--c-sub); border-radius: 20rpx; }
.gen-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border-radius: 50rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; margin-bottom: 20rpx; }
.gen-btn[disabled] { opacity: 0.5; }
.result { background: var(--c-card); border-radius: 20rpx; padding: 24rpx; }
.r-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 8rpx; }
.r-prompt { font-size: 24rpx; color: var(--c-sub); margin-bottom: 16rpx; line-height: 1.5; }
.r-img { width: 100%; border-radius: 14rpx; }
.r-video { width: 100%; border-radius: 14rpx; }
.r-acts { display: flex; gap: 16rpx; margin-top: 20rpx; flex-wrap: wrap; }
.ra { font-size: 26rpx; padding: 14rpx 24rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-accent); }
.album-picker { margin-top: 20rpx; border-top: 1px solid var(--c-border); padding-top: 20rpx; }
.ap-title { font-size: 26rpx; color: var(--c-sub); margin-bottom: 12rpx; }
.ap-opt { padding: 18rpx 24rpx; background: var(--c-card2); border-radius: 12rpx; margin-bottom: 10rpx; font-size: 28rpx; color: var(--c-title); }
.ap-opt.new { color: var(--c-primary); border: 1px dashed var(--c-primary); background: transparent; }
.cancel { background: var(--c-card2); color: var(--c-sub); border-radius: 50rpx; height: 78rpx; line-height: 78rpx; font-size: 28rpx; margin-top: 10rpx; }
.preview-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100; }
.preview-img { max-width: 94vw; max-height: 80vh; border-radius: 12rpx; }
</style>
