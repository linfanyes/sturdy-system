<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 顶部三 Tab -->
    <view class="tabs">
      <view
        v-for="t in tabs" :key="t.key"
        class="tab" :class="{ on: tab === t.key }"
        @click="switchTab(t.key)"
      >{{ t.label }}</view>
    </view>

    <!-- 通用搜索框 -->
    <view class="search-bar">
      <view class="search-input">
        <text class="s-ic">🔍</text>
        <input
          v-model="keyword"
          class="s-inp"
          :placeholder="searchPlaceholder"
          confirm-type="search"
          @confirm="reload"
        />
        <text v-if="keyword" class="s-clr" @click="clearKeyword">×</text>
      </view>
    </view>

    <!-- ============ 古诗词 ============ -->
    <block v-if="tab === 'poems'">
      <view class="filter-bar">
        <picker :range="gradeLabels" @change="onGrade">
          <view class="picker" :class="{ active: grade }">{{ gradeLabels[gradeIdx] }}<text class="caret">▾</text></view>
        </picker>
        <picker :range="dynastyLabels" @change="onDynasty">
          <view class="picker" :class="{ active: dynasty }">{{ dynastyLabels[dynastyIdx] }}<text class="caret">▾</text></view>
        </picker>
        <text class="count">共 {{ list.length }} 首</text>
      </view>
      <scroll-view scroll-y class="list">
        <view v-for="p in list" :key="p.id" class="poem-card" @click="toggle(p)">
          <view class="poem-head">
            <text class="poem-title">{{ p.title }}</text>
            <text class="poem-meta">{{ [p.dynasty, p.author].filter(Boolean).join(' · ') }}</text>
          </view>
          <text class="poem-body">{{ preview(p.content) }}</text>
          <text v-if="!p._open && (p.translation || p.appreciation)" class="poem-more">展开译文 / 赏析 ▾</text>
          <view v-if="p._open" class="poem-detail">
            <view v-if="p.translation" class="detail-sec">
              <text class="detail-label">译文</text>
              <text class="detail-text">{{ p.translation }}</text>
            </view>
            <view v-if="p.appreciation" class="detail-sec">
              <text class="detail-label">赏析</text>
              <text class="detail-text">{{ p.appreciation }}</text>
            </view>
          </view>
        </view>
        <EmptyState v-if="!loading && !list.length" icon="📜" text="暂无古诗词" hint="换个关键词或筛选试试" />
      </scroll-view>
    </block>

    <!-- ============ 数学公式 ============ -->
    <block v-if="tab === 'formulas'">
      <scroll-view scroll-x class="cat-scroll" show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="c in formulaCats" :key="c"
            class="cat-tag" :class="{ on: category === c }"
            @click="pickCat(c)"
          >{{ c }}</view>
        </view>
      </scroll-view>
      <scroll-view scroll-y class="list">
        <view v-for="f in list" :key="f.id" class="formula-card">
          <view class="formula-top">
            <text class="formula-title">{{ f.title }}</text>
            <text v-if="f.category" class="formula-cat">{{ f.category }}</text>
          </view>
          <view v-if="f.formula" class="formula-eq">{{ f.formula }}</view>
          <text v-if="f.explanation" class="formula-explain">{{ f.explanation }}</text>
        </view>
        <EmptyState v-if="!loading && !list.length" icon="📐" text="暂无公式" hint="换个类别或关键词试试" />
      </scroll-view>
    </block>

    <!-- ============ 英语单词 ============ -->
    <block v-if="tab === 'words'">
      <scroll-view scroll-x class="cat-scroll" show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="c in wordCatOptions" :key="c"
            class="cat-tag" :class="{ on: category === c }"
            @click="pickCat(c)"
          >{{ c }}</view>
        </view>
      </scroll-view>
      <scroll-view scroll-y class="list">
        <view class="word-grid">
          <view v-for="w in list" :key="w.id" class="word-card" @click="toggle(w)">
            <text class="word">{{ w.word }}</text>
            <text v-if="w.phonetic" class="phonetic">{{ w.phonetic }}</text>
            <text class="meaning">{{ w.meaning }}</text>
            <text v-if="w.example && !w._open" class="word-more">例句 ▾</text>
            <text v-if="w.example && w._open" class="word-example">{{ w.example }}</text>
          </view>
        </view>
        <EmptyState v-if="!loading && !list.length" icon="🔤" text="暂无单词" hint="换个分类或关键词试试" />
      </scroll-view>
    </block>

    <!-- ============ 科学资源 ============ -->
    <block v-if="tab === 'science'">
      <view class="search-bar">
        <view class="search-input">
          <text class="s-ic">🔍</text>
          <input
            v-model="keyword"
            class="s-inp"
            placeholder="搜索科学标题 / 内容 / 关键词"
            confirm-type="search"
            @confirm="reload"
          />
          <text v-if="keyword" class="s-clr" @click="clearKeyword">×</text>
        </view>
      </view>
      <scroll-view scroll-x class="cat-scroll" show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="c in scienceCatOptions" :key="c"
            class="cat-tag" :class="{ on: scienceCategory === c }"
            @click="scienceCategory = c; reload()"
          >{{ c }}</view>
        </view>
      </scroll-view>
      <scroll-view scroll-y class="list">
        <view v-for="s in list" :key="s.id" class="formula-card">
          <view class="formula-top">
            <text class="formula-title">{{ s.title }}</text>
            <text v-if="s.category && s.category !== '全部'" class="formula-cat">{{ s.category }}</text>
          </view>
          <text v-if="s.content" class="formula-explain">{{ s.content }}</text>
        </view>
        <EmptyState v-if="!loading && !list.length" icon="🔬" text="暂无科学资源" hint="换个分类或关键词试试" />
      </scroll-view>
    </block>

    <!-- ============ 道德与法治资源 ============ -->
    <block v-if="tab === 'moral'">
      <view class="search-bar">
        <view class="search-input">
          <text class="s-ic">🔍</text>
          <input
            v-model="keyword"
            class="s-inp"
            placeholder="搜索标题 / 内容 / 关键词"
            confirm-type="search"
            @confirm="reload"
          />
          <text v-if="keyword" class="s-clr" @click="clearKeyword">×</text>
        </view>
      </view>
      <scroll-view scroll-x class="cat-scroll" show-scrollbar="false">
        <view class="cat-row">
          <view
            v-for="c in moralCatOptions" :key="c"
            class="cat-tag" :class="{ on: moralCategory === c }"
            @click="moralCategory = c; reload()"
          >{{ c }}</view>
        </view>
      </scroll-view>
      <scroll-view scroll-y class="list">
        <view v-for="m in list" :key="m.id" class="formula-card">
          <view class="formula-top">
            <text class="formula-title">{{ m.title }}</text>
            <text v-if="m.category && m.category !== '全部'" class="formula-cat">{{ m.category }}</text>
          </view>
          <text v-if="m.content" class="formula-explain">{{ m.content }}</text>
        </view>
        <EmptyState v-if="!loading && !list.length" icon="⚖️" text="暂无道德与法治资源" hint="换个分类或关键词试试" />
      </scroll-view>
    </block>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { parentApi } from '../../common/request'
import { theme } from '../../common/store'

const tabs = [
  { key: 'poems', label: '古诗词' },
  { key: 'formulas', label: '数学公式' },
  { key: 'words', label: '英语单词' },
  { key: 'science', label: '科学' },
  { key: 'moral', label: '道德与法治' },
]
const tab = ref('poems')

const gradeValues = ['', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '通用']
const gradeLabels = ['全部年级', ...gradeValues.slice(1)]
const dynastyValues = ['', '唐', '宋', '元', '明', '清', '近现代', '其他']
const dynastyLabels = ['全部朝代', ...dynastyValues.slice(1)]
const formulaCats = ['全部', '运算定律', '几何公式', '单位换算', '分数小数', '比例百分数', '思维方法']
const defaultWordCats = ['全部', '季节', '食物', '水果', '数字', '颜色', '动物', '身体', '家庭', '衣物', '交通']
const scienceCats = ['全部', '物质科学', '生命科学', '地球与宇宙', '技术与工程']
const moralCats = ['全部', '个人品德', '家庭美德', '社会公德', '国家情怀']

const list = ref([])
const wordCatOptions = ref([...defaultWordCats])
const scienceCatOptions = ref([...scienceCats])
const moralCatOptions = ref([...moralCats])
const keyword = ref('')
const grade = ref('')
const dynasty = ref('')
const gradeIdx = ref(0)
const dynastyIdx = ref(0)
const category = ref('全部')
const scienceCategory = ref('全部')
const moralCategory = ref('全部')
const loading = ref(false)

const searchPlaceholder = computed(() => {
  if (tab.value === 'poems') return '搜索标题 / 作者 / 内容'
  if (tab.value === 'formulas') return '搜索公式 / 名称 / 关键词'
  return '搜索单词 / 释义'
})

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

async function fetchList(path, loadingText) {
  loading.value = true
  try { uni.showLoading({ title: loadingText || '加载中', mask: false }) } catch (e) { console.error('[mini catch]', e) }
  try {
    const data = await parentApi.get(path)
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items
    if (data && Array.isArray(data.list)) return data.list
    return []
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
    return []
  } finally {
    try { uni.hideLoading() } catch (e) { console.error('[mini catch]', e) }
    loading.value = false
  }
}

async function reload() {
  const kw = keyword.value.trim()
  if (tab.value === 'poems') {
    list.value = await fetchList(
      '/resource-library/poems' + qs({ grade: grade.value, dynasty: dynasty.value, keyword: kw }),
      '加载古诗词'
    )
  } else if (tab.value === 'formulas') {
    const cat = category.value === '全部' ? '' : category.value
    list.value = await fetchList(
      '/resource-library/formulas' + qs({ category: cat, keyword: kw }),
      '加载公式'
    )
  } else if (tab.value === 'science') {
    const cat = scienceCategory.value === '全部' ? '' : scienceCategory.value
    list.value = await fetchList(
      '/resource-library/science' + qs({ category: cat, keyword: kw }),
      '加载科学资源'
    )
  } else {
    const cat = moralCategory.value === '全部' ? '' : moralCategory.value
    list.value = await fetchList(
      '/resource-library/moral' + qs({ category: cat, keyword: kw }),
      '加载道德与法治资源'
    )
  }
}

async function loadWordCategories() {
  try {
    const data = await parentApi.get('/resource-library/words/categories')
    const arr = Array.isArray(data) ? data.filter(Boolean) : []
    if (arr.length) wordCatOptions.value = ['全部', ...arr]
  } catch (e) {
    // 降级使用默认分类
  }
}

function switchTab(key) {
  tab.value = key
  keyword.value = ''
  category.value = '全部'
  scienceCategory.value = '全部'
  moralCategory.value = '全部'
  if (key === 'words') {
    if (wordCatOptions.value.length <= 1) loadWordCategories()
  }
  reload()
}

function onGrade(e) {
  gradeIdx.value = e.detail.value
  grade.value = gradeValues[e.detail.value]
  reload()
}
function onDynasty(e) {
  dynastyIdx.value = e.detail.value
  dynasty.value = dynastyValues[e.detail.value]
  reload()
}
function pickCat(c) {
  category.value = c
  reload()
}
function clearKeyword() {
  keyword.value = ''
  reload()
}
function preview(content) {
  if (!content) return ''
  const lines = String(content).split(/\n+/).filter((l) => l.trim())
  return lines.slice(0, 2).join('\n')
}
function toggle(item) {
  item._open = !item._open
}

onShow(() => {
  loadWordCategories()
  reload()
})

onPullDownRefresh(async () => {
  await reload()
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

/* —— Tab —— */
.tabs {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx;
  margin: 20rpx 0 20rpx;
  box-shadow: 0 4rpx 14rpx rgba(38, 70, 83, 0.06);
}
.tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 27rpx;
  color: #8a8a8a;
  border-radius: 12rpx;
  transition: all 0.2s;
}
.tab.on {
  background: linear-gradient(135deg, #f4a261 0%, #e8945a 100%);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(244, 162, 97, 0.3);
}

/* —— 搜索 —— */
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

/* —— 筛选 —— */
.filter-bar { display: flex; align-items: center; gap: 14rpx; margin-bottom: 18rpx; }
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
.cat-scroll { white-space: nowrap; margin-bottom: 18rpx; }
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

/* —— 列表 —— */
.list { height: calc(100vh - 300rpx); box-sizing: border-box; }

/* —— 古诗词 —— */
.poem-card {
  position: relative;
  background: linear-gradient(135deg, #fffdf8 0%, #fbf6ec 100%);
  border-radius: 16rpx;
  padding: 24rpx 26rpx 24rpx 34rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 3rpx 10rpx rgba(38, 70, 83, 0.05);
  overflow: hidden;
}
.poem-card::before {
  content: '';
  position: absolute;
  left: 16rpx;
  top: 24rpx;
  bottom: 24rpx;
  width: 6rpx;
  border-radius: 3rpx;
  background: linear-gradient(180deg, #f4a261, #e76f51);
}
.poem-head { display: flex; align-items: baseline; gap: 14rpx; flex-wrap: wrap; }
.poem-title { font-size: 31rpx; font-weight: 700; color: #264653; }
.poem-meta { font-size: 24rpx; color: #8a8a8a; }
.poem-body {
  display: block;
  font-size: 27rpx;
  color: #44606b;
  line-height: 1.8;
  margin-top: 12rpx;
  white-space: pre-wrap;
}
.poem-more { display: block; font-size: 22rpx; color: #f4a261; margin-top: 12rpx; }
.poem-detail { margin-top: 4rpx; }
.detail-sec { margin-top: 14rpx; padding-top: 14rpx; border-top: 1rpx dashed #e8dcc8; }
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

/* —— 公式 —— */
.formula-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 26rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 3rpx 10rpx rgba(38, 70, 83, 0.05);
  border-left: 8rpx solid #2a9d8f;
}
.formula-top { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.formula-title { font-size: 29rpx; font-weight: 700; color: #264653; }
.formula-cat {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 16rpx;
  background: #e8f5f2;
  color: #2a9d8f;
  flex-shrink: 0;
}
.formula-eq {
  margin: 16rpx 0;
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

/* —— 单词 —— */
.word-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
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

/* —— 深色 —— */
.dark.page { background: #15171c; }
.dark .tabs { background: #1f232b; box-shadow: none; }
.dark .tab { color: #9aa0a6; }
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
.dark .word-card { background: #1f232b; box-shadow: none; }
.dark .word { color: #f2f2f2; }
.dark .meaning { color: #b0b0b0; }
.dark .word-example { background: #262b34; color: #b0b0b0; }
</style>
