<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">成语词典</view>
    <view class="sub">搜索成语，查看释义、出处、近义词</view>

    <view class="search-row">
      <input v-model="keyword" class="ipt" placeholder="输入成语或关键词" @confirm="search" />
      <button class="btn" @click="search">搜索</button>
    </view>

    <view v-if="list.length" class="list">
      <view v-for="it in list" :key="it.id" class="item">
        <view class="word">{{ it.word }}</view>
        <view class="py">{{ it.pinyin }}</view>
        <view class="mean">{{ it.meaning }}</view>
        <view v-if="it.source" class="src">出处：{{ it.source }}</view>
      </view>
    </view>

    <view v-else-if="searched" class="empty">未找到相关成语</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { theme } from '../../common/store'

const keyword = ref('')
const list = ref([])
const searched = ref(false)

// 常用成语库
const IDIOMS = [
  { id: 1, word: '画蛇添足', pinyin: 'huà shé tiān zú', meaning: '做多余的事，反而不恰当', source: '《战国策·齐策二》' },
  { id: 2, word: '守株待兔', pinyin: 'shǒu zhū dài tù', meaning: '比喻死守经验，不知变通', source: '《韩非子·五蠹》' },
  { id: 3, word: '亡羊补牢', pinyin: 'wáng yáng bǔ láo', meaning: '出了问题后及时补救', source: '《战国策·楚策四》' },
  { id: 4, word: '刻舟求剑', pinyin: 'kè zhōu qiú jiàn', meaning: '比喻拘泥成法，不知变通', source: '《吕氏春秋·察今》' },
  { id: 5, word: '掩耳盗铃', pinyin: 'yǎn ěr dào líng', meaning: '比喻自欺欺人', source: '《吕氏春秋·自知》' },
  { id: 6, word: '叶公好龙', pinyin: 'yè gōng hào lóng', meaning: '比喻表面爱好而非真爱', source: '《新序·杂事》' },
  { id: 7, word: '杯弓蛇影', pinyin: 'bēi gōng shé yǐng', meaning: '比喻疑神疑鬼，自相惊扰', source: '《晋书·乐广传》' },
  { id: 8, word: '井底之蛙', pinyin: 'jǐng dǐ zhī wā', meaning: '比喻见识短浅的人', source: '《庄子·秋水》' },
  { id: 9, word: '对牛弹琴', pinyin: 'duì niú tán qín', meaning: '比喻对不懂道理的人讲道理', source: '《理惑论》' },
  { id: 10, word: '画龙点睛', pinyin: 'huà lóng diǎn jīng', meaning: '比喻作文或讲话时关键处点明要旨', source: '《历代名画记》' },
  { id: 11, word: '狐假虎威', pinyin: 'hú jiǎ hǔ wēi', meaning: '比喻借助他人威势欺压别人', source: '《战国策·楚策一》' },
  { id: 12, word: '拔苗助长', pinyin: 'bá miáo zhù zhǎng', meaning: '比喻违反规律，急于求成', source: '《孟子·公孙丑上》' },
]

function search() {
  const kw = keyword.value.trim()
  if (!kw) {
    list.value = IDIOMS.slice(0, 6)
  } else {
    list.value = IDIOMS.filter((i) => i.word.includes(kw) || i.meaning.includes(kw) || i.pinyin.includes(kw))
  }
  searched.value = true
}

// 初始显示推荐
list.value = IDIOMS.slice(0, 6)
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.search-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.ipt { flex: 1; background: var(--c-input); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; }
.btn { background: var(--c-primary); color: #fff; border-radius: 12rpx; font-size: 26rpx; padding: 16rpx 30rpx; }
.list { display: flex; flex-direction: column; gap: 12rpx; }
.item { background: var(--c-card); border-radius: 12rpx; padding: 20rpx; }
.word { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.py { font-size: 24rpx; color: var(--c-primary); margin-top: 4rpx; }
.mean { font-size: 26rpx; color: var(--c-text); margin-top: 8rpx; }
.src { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx; font-size: 26rpx; }
</style>
