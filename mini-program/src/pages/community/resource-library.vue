<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 顶部三 Tab -->
    <view class="tabs">
      <view
        v-for="t in tabs" :key="t.key"
        class="tab" :class="{ on: tab === t.key }"
        @click="switchTab(t.key)"
      >
        <text class="tab-ic">{{ t.icon }}</text>
        <text class="tab-tx">{{ t.label }}</text>
      </view>
    </view>

    <!-- ============ 古诗词 ============ -->
    <block v-if="tab === 'poems'">
      <view class="search-bar">
        <view class="search-input">
          <text class="s-ic">🔍</text>
          <input
            v-model="poemKeyword"
            class="s-inp"
            placeholder="搜索标题 / 作者 / 内容"
            confirm-type="search"
            @confirm="loadPoems"
          />
          <text v-if="poemKeyword" class="s-clr" @click="clearPoemKeyword">×</text>
        </view>
      </view>
      <view class="filter-bar">
        <picker :range="gradeLabels" @change="onPoemGrade">
          <view class="picker" :class="{ active: poemGrade }">
            {{ gradeLabels[poemGradeIdx] }}<text class="caret">▾</text>
          </view>
        </picker>
        <picker :range="dynastyLabels" @change="onPoemDynasty">
          <view class="picker" :class="{ active: poemDynasty }">
            {{ dynastyLabels[poemDynastyIdx] }}<text class="caret">▾</text>
          </view>
        </picker>
        <text class="count">共 {{ poems.length }} 首</text>
      </view>

      <scroll-view scroll-y class="list">
        <view
          v-for="p in poems" :key="p.id"
          class="poem-card"
          @click="togglePoem(p)"
        >
          <view class="poem-head">
            <text class="poem-title">{{ p.title }}</text>
            <text class="poem-meta">{{ [p.dynasty, p.author].filter(Boolean).join(' · ') }}</text>
            <text v-if="p.grade && p.grade !== '通用'" class="poem-grade">{{ p.grade }}</text>
          </view>
          <text class="poem-body">{{ poemPreview(p.content) }}</text>
          <text v-if="!p._open && (p.translation || p.appreciation)" class="poem-more">点击展开译文 / 赏析 ▾</text>
          <view v-if="p._open" class="poem-detail">
            <view v-if="p.translation" class="detail-sec">
              <text class="detail-label">译文</text>
              <text class="detail-text">{{ p.translation }}</text>
            </view>
            <view v-if="p.appreciation" class="detail-sec">
              <text class="detail-label">赏析</text>
              <text class="detail-text">{{ p.appreciation }}</text>
            </view>
            <text class="poem-more">收起 ▴</text>
          </view>
        </view>
        <EmptyState v-if="!loading.poems && !poems.length" icon="📜" text="暂无古诗词" hint="换个关键词或筛选条件试试" />
      </scroll-view>
    </block>

    <!-- ============ 数学公式 ============ -->
    <block v-if="tab === 'formulas'">
      <view class="search-bar">
        <view class="search-input">
          <text class="s-ic">🔍</text>
          <input
            v-model="formulaKeyword"
            class="s-inp"
            placeholder="搜索公式 / 名称 / 关键词"
            confirm-type="search"
            @confirm="loadFormulas"
          />
          <text v-if="formulaKeyword" class="s-clr" @click="clearFormulaKeyword">×</text>
        </view>
      </view>
      <scroll-view scroll-x class="cat-scroll" show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="c in formulaCats" :key="c"
            class="cat-tag" :class="{ on: formulaCategory === c }"
            @click="pickFormulaCat(c)"
          >{{ c }}</view>
        </view>
      </scroll-view>

      <scroll-view scroll-y class="list">
        <view v-for="f in formulas" :key="f.id" class="formula-card">
          <view class="formula-top">
            <text class="formula-title">{{ f.title }}</text>
            <text v-if="f.category" class="formula-cat">{{ f.category }}</text>
          </view>
          <view v-if="f.formula" class="formula-eq">{{ f.formula }}</view>
          <text v-if="f.explanation" class="formula-explain">{{ f.explanation }}</text>
          <view v-if="f.example" class="formula-example">
            <text class="ex-label">例</text>
            <text class="ex-text">{{ f.example }}</text>
          </view>
        </view>
        <EmptyState v-if="!loading.formulas && !formulas.length" icon="📐" text="暂无公式" hint="换个类别或关键词试试" />
      </scroll-view>
    </block>

    <!-- ============ 英语单词 ============ -->
    <block v-if="tab === 'words'">
      <view class="search-bar">
        <view class="search-input">
          <text class="s-ic">🔍</text>
          <input
            v-model="wordKeyword"
            class="s-inp"
            placeholder="搜索单词 / 释义"
            confirm-type="search"
            @confirm="loadWords"
          />
          <text v-if="wordKeyword" class="s-clr" @click="clearWordKeyword">×</text>
        </view>
      </view>
      <scroll-view scroll-x class="cat-scroll" show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="c in wordCatOptions" :key="c"
            class="cat-tag" :class="{ on: wordCategory === c }"
            @click="pickWordCat(c)"
          >{{ c }}</view>
        </view>
      </scroll-view>

      <scroll-view scroll-y class="list">
        <view class="word-grid">
          <view v-for="w in words" :key="w.id" class="word-card" @click="toggleWord(w)">
            <text class="word">{{ w.word }}</text>
            <text v-if="w.phonetic" class="phonetic">{{ w.phonetic }}</text>
            <text class="meaning">{{ w.meaning }}</text>
            <text v-if="w.example && !w._open" class="word-more">例句 ▾</text>
            <text v-if="w.example && w._open" class="word-example">{{ w.example }}</text>
          </view>
        </view>
        <EmptyState v-if="!loading.words && !words.length" icon="🔤" text="暂无单词" hint="换个分类或关键词试试" />
      </scroll-view>
    </block>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme, auth } from '../../common/store'

const tabs = [
  { key: 'poems', label: '古诗词', icon: '📜' },
  { key: 'formulas', label: '数学公式', icon: '📐' },
  { key: 'words', label: '英语单词', icon: '🔤' },
]
// 按教师主学科默认选中对应 tab：语文→古诗词，数学→公式，英语→单词
const _teacherSubject = (auth.user && (auth.user.subjects && auth.user.subjects[0])) || (auth.user && auth.user.subject) || ''
const _defaultTab = _teacherSubject === '数学' ? 'formulas' : _teacherSubject === '英语' ? 'words' : 'poems'
const tab = ref(_defaultTab)

// 枚举
const gradeValues = ['', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '通用']
const gradeLabels = ['全部年级', ...gradeValues.slice(1)]
const dynastyValues = ['', '唐', '宋', '元', '明', '清', '近现代', '其他']
const dynastyLabels = ['全部朝代', ...dynastyValues.slice(1)]
const formulaCats = ['全部', '运算定律', '几何公式', '单位换算', '分数小数', '比例百分数', '思维方法']
const defaultWordCats = ['全部', '季节', '食物', '水果', '数字', '颜色', '动物', '身体', '家庭', '衣物', '交通']

// 状态
const poems = ref([])
const formulas = ref([])
const words = ref([])
const wordCatOptions = ref([...defaultWordCats])

const poemKeyword = ref('')
const poemGrade = ref('')
const poemDynasty = ref('')
const poemGradeIdx = ref(0)
const poemDynastyIdx = ref(0)

const formulaKeyword = ref('')
const formulaCategory = ref('全部')

const wordKeyword = ref('')
const wordCategory = ref('全部')

const loading = reactive({ poems: false, formulas: false, words: false })

// 构建查询串：跳过空值
function qs(params) {
  const parts = []
  for (const k in params) {
    const v = params[k]
    if (v !== '' && v !== undefined && v !== null) {
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v))
    }
  }
  return parts.length ? '?' + parts.join('&') : ''
}

// 列表加载帮手：loading 提示 + 失败 toast + 数组兜底
async function fetchList(path, loadingText) {
  try { uni.showLoading({ title: loadingText || '加载中', mask: false }) } catch (e) { console.error('[mini catch]', e) }
  try {
    const data = await api.get(path)
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items
    if (data && Array.isArray(data.list)) return data.list
    return []
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
    return []
  } finally {
    try { uni.hideLoading() } catch (e) { console.error('[mini catch]', e) }
  }
}

async function loadPoems() {
  loading.poems = true
  poems.value = await fetchList(
    '/resource-library/poems' + qs({
      grade: poemGrade.value,
      dynasty: poemDynasty.value,
      keyword: poemKeyword.value.trim(),
    }),
    '加载古诗词'
  )
  loading.poems = false
}

async function loadFormulas() {
  loading.formulas = true
  const cat = formulaCategory.value === '全部' ? '' : formulaCategory.value
  formulas.value = await fetchList(
    '/resource-library/formulas' + qs({
      category: cat,
      keyword: formulaKeyword.value.trim(),
    }),
    '加载公式'
  )
  loading.formulas = false
}

async function loadWords() {
  loading.words = true
  const cat = wordCategory.value === '全部' ? '' : wordCategory.value
  words.value = await fetchList(
    '/resource-library/words' + qs({
      category: cat,
      keyword: wordKeyword.value.trim(),
    }),
    '加载单词'
  )
  loading.words = false
}

async function loadWordCategories() {
  try {
    const data = await api.get('/resource-library/words/categories')
    const arr = Array.isArray(data) ? data.filter(Boolean) : []
    if (arr.length) {
      wordCatOptions.value = ['全部', ...arr]
    }
  } catch (e) {
    // 降级使用默认分类
  }
}

function switchTab(key) {
  tab.value = key
  if (key === 'poems' && !poems.value.length) loadPoems()
  else if (key === 'formulas' && !formulas.value.length) loadFormulas()
  else if (key === 'words') {
    if (!wordCatOptions.value.length || wordCatOptions.value.length <= 1) loadWordCategories()
    if (!words.value.length) loadWords()
  }
}

function onPoemGrade(e) {
  poemGradeIdx.value = e.detail.value
  poemGrade.value = gradeValues[e.detail.value]
  loadPoems()
}
function onPoemDynasty(e) {
  poemDynastyIdx.value = e.detail.value
  poemDynasty.value = dynastyValues[e.detail.value]
  loadPoems()
}
function clearPoemKeyword() {
  poemKeyword.value = ''
  loadPoems()
}
function pickFormulaCat(c) {
  formulaCategory.value = c
  loadFormulas()
}
function clearFormulaKeyword() {
  formulaKeyword.value = ''
  loadFormulas()
}
function pickWordCat(c) {
  wordCategory.value = c
  loadWords()
}
function clearWordKeyword() {
  wordKeyword.value = ''
  loadWords()
}

// 古诗词预览：取前 2 行
function poemPreview(content) {
  if (!content) return ''
  const lines = String(content).split(/\n+/).filter((l) => l.trim())
  return lines.slice(0, 2).join('\n')
}
function togglePoem(p) {
  p._open = !p._open
}
function toggleWord(w) {
  w._open = !w._open
}

onShow(() => {
  loadWordCategories()
  if (tab.value === 'poems') loadPoems()
  else if (tab.value === 'formulas') loadFormulas()
  else loadWords()
})

onPullDownRefresh(async () => {
  if (tab.value === 'poems') await loadPoems()
  else if (tab.value === 'formulas') await loadFormulas()
  else await loadWords()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 0 24rpx 40rpx;
  background: #f9f7f2;
  box-sizing: border-box;
}

/* —— 顶部 Tab —— */
.tabs {
  display: flex;
  background: #fff;
  border-radius: 20rpx;
  padding: 10rpx;
  margin: 20rpx 0 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(38, 70, 83, 0.06);
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx 0;
  border-radius: 14rpx;
  transition: all 0.2s;
}
.tab-ic { font-size: 34rpx; margin-bottom: 4rpx; }
.tab-tx { font-size: 24rpx; color: #8a8a8a; }
.tab.on {
  background: linear-gradient(135deg, #f4a261 0%, #e8945a 100%);
  box-shadow: 0 6rpx 16rpx rgba(244, 162, 97, 0.35);
}
.tab.on .tab-ic { color: #fff; }
.tab.on .tab-tx { color: #fff; font-weight: 600; }

/* —— 搜索栏 —— */
.search-bar { margin-bottom: 16rpx; }
.search-input {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 40rpx;
  padding: 0 24rpx;
  height: 72rpx;
  box-shadow: 0 2rpx 10rpx rgba(38, 70, 83, 0.05);
}
.s-ic { font-size: 28rpx; margin-right: 12rpx; opacity: 0.6; }
.s-inp { flex: 1; font-size: 28rpx; color: #264653; }
.s-clr { font-size: 36rpx; color: #bbb; padding: 0 8rpx; }

/* —— 筛选栏 —— */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 20rpx;
}
.picker {
  background: #fff;
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
  font-size: 25rpx;
  color: #264653;
  border: 1px solid #ece4d7;
}
.picker.active { border-color: #f4a261; color: #e08a3c; background: #fdf3ea; }
.caret { font-size: 20rpx; color: #bbb; margin-left: 6rpx; }
.count { margin-left: auto; font-size: 22rpx; color: #8a8a8a; }

/* —— 分类横滑 —— */
.cat-scroll { white-space: nowrap; margin-bottom: 20rpx; }
.cat-row { display: inline-flex; gap: 14rpx; padding: 4rpx 0; }
.cat-tag {
  flex-shrink: 0;
  background: #fff;
  border-radius: 30rpx;
  padding: 12rpx 28rpx;
  font-size: 25rpx;
  color: #264653;
  border: 1px solid #ece4d7;
}
.cat-tag.on { background: #2a9d8f; color: #fff; border-color: #2a9d8f; font-weight: 600; }

/* —— 列表容器 —— */
.list { height: calc(100vh - 320rpx); box-sizing: border-box; }

/* —— 古诗词卡片 —— */
.poem-card {
  position: relative;
  background: linear-gradient(135deg, #fffdf8 0%, #fbf6ec 100%);
  border-radius: 18rpx;
  padding: 26rpx 28rpx 26rpx 36rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 3rpx 12rpx rgba(38, 70, 83, 0.05);
  overflow: hidden;
}
.poem-card::before {
  content: '';
  position: absolute;
  left: 18rpx;
  top: 26rpx;
  bottom: 26rpx;
  width: 6rpx;
  border-radius: 3rpx;
  background: linear-gradient(180deg, #f4a261, #e76f51);
}
.poem-head {
  display: flex;
  align-items: baseline;
  gap: 14rpx;
  flex-wrap: wrap;
}
.poem-title { font-size: 32rpx; font-weight: 700; color: #264653; }
.poem-meta { font-size: 24rpx; color: #8a8a8a; }
.poem-grade {
  font-size: 20rpx;
  padding: 2rpx 14rpx;
  border-radius: 16rpx;
  background: #e8f5f2;
  color: #2a9d8f;
}
.poem-body {
  display: block;
  font-size: 27rpx;
  color: #44606b;
  line-height: 1.8;
  margin-top: 14rpx;
  white-space: pre-wrap;
}
.poem-more {
  display: block;
  font-size: 22rpx;
  color: #f4a261;
  margin-top: 14rpx;
}
.poem-detail { margin-top: 6rpx; }
.detail-sec { margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx dashed #e8dcc8; }
.detail-label {
  display: inline-block;
  font-size: 21rpx;
  color: #fff;
  background: #2a9d8f;
  border-radius: 8rpx;
  padding: 2rpx 14rpx;
  margin-bottom: 8rpx;
}
.detail-text { display: block; font-size: 25rpx; color: #5a6b73; line-height: 1.75; }

/* —— 数学公式卡片 —— */
.formula-card {
  background: #fff;
  border-radius: 18rpx;
  padding: 26rpx 28rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 3rpx 12rpx rgba(38, 70, 83, 0.05);
  border-left: 8rpx solid #2a9d8f;
}
.formula-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.formula-title { font-size: 30rpx; font-weight: 700; color: #264653; }
.formula-cat {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 16rpx;
  background: #e8f5f2;
  color: #2a9d8f;
  flex-shrink: 0;
}
.formula-eq {
  margin: 18rpx 0;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, #f0f7f5 0%, #e6f2ef 100%);
  border-radius: 12rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #2a9d8f;
  text-align: center;
  letter-spacing: 1rpx;
  word-break: break-all;
}
.formula-explain { display: block; font-size: 25rpx; color: #5a6b73; line-height: 1.7; }
.formula-example {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed #ece4d7;
}
.ex-label {
  flex-shrink: 0;
  font-size: 21rpx;
  color: #fff;
  background: #f4a261;
  border-radius: 8rpx;
  padding: 2rpx 14rpx;
  height: fit-content;
}
.ex-text { font-size: 24rpx; color: #5a6b73; line-height: 1.7; }

/* —— 英语单词网格 —— */
.word-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.word-card {
  width: calc(50% - 8rpx);
  background: #fff;
  border-radius: 16rpx;
  padding: 22rpx 20rpx;
  box-sizing: border-box;
  box-shadow: 0 3rpx 10rpx rgba(38, 70, 83, 0.05);
  border-top: 6rpx solid #f4a261;
}
.word { display: block; font-size: 34rpx; font-weight: 700; color: #264653; }
.phonetic { display: block; font-size: 22rpx; color: #2a9d8f; margin-top: 4rpx; }
.meaning { display: block; font-size: 25rpx; color: #5a6b73; margin-top: 10rpx; line-height: 1.5; }
.word-more { display: block; font-size: 21rpx; color: #f4a261; margin-top: 12rpx; }
.word-example {
  display: block;
  font-size: 22rpx;
  color: #5a6b73;
  margin-top: 12rpx;
  padding: 12rpx;
  background: #f9f7f2;
  border-radius: 10rpx;
  line-height: 1.5;
  font-style: italic;
}

/* —— 深色模式 —— */
.dark.page { background: #15171c; }
.dark .tabs { background: #1f232b; box-shadow: none; }
.dark .tab-tx { color: #9aa0a6; }
.dark .search-input { background: #1f232b; box-shadow: none; }
.dark .s-inp { color: #e6e6e6; }
.dark .picker { background: #1f232b; border-color: #2c313a; color: #e6e6e6; }
.dark .picker.active { background: #3a2a1c; border-color: #f4a261; color: #f4a261; }
.dark .count { color: #9aa0a6; }
.dark .cat-tag { background: #1f232b; border-color: #2c313a; color: #e6e6e6; }
.dark .cat-tag.on { background: #2a9d8f; color: #fff; border-color: #2a9d8f; }
.dark .poem-card { background: #1f232b; box-shadow: none; }
.dark .poem-title { color: #f2f2f2; }
.dark .poem-meta { color: #9aa0a6; }
.dark .poem-body { color: #c8c8c8; }
.dark .detail-sec { border-top-color: #2c313a; }
.dark .detail-text { color: #b0b0b0; }
.dark .formula-card { background: #1f232b; box-shadow: none; }
.dark .formula-title { color: #f2f2f2; }
.dark .formula-eq { background: #262b34; }
.dark .formula-explain { color: #b0b0b0; }
.dark .formula-example { border-top-color: #2c313a; }
.dark .ex-text { color: #b0b0b0; }
.dark .word-card { background: #1f232b; box-shadow: none; }
.dark .word { color: #f2f2f2; }
.dark .meaning { color: #b0b0b0; }
.dark .word-example { background: #262b34; color: #b0b0b0; }
</style>
