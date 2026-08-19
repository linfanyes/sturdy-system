<template>
  <view class="card" v-if="weekBirthdays.length">
    <view class="card-h">
      <text class="ch-t">🎂 本周生日（{{ weekBirthdays.length }} 人）</text>
    </view>
    <view v-for="b in weekBirthdays" :key="b.id" class="li bd-li">
      <text class="bd-emoji">🎂</text>
      <text class="li-t">{{ b.name }}</text>
      <text class="bd-date">{{ b.birthLabel }}</text>
      <text v-if="b.daysLeft === 0" class="bd-today">今天</text>
      <text v-else class="bd-days">{{ b.daysLeft }} 天后</text>
      <text class="bd-card" @click.stop="$emit('genBirthdayCard', b)">🎉 卡片</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { copyText } from '../../../common/print'
import { auth } from '../../../common/store'

const props = defineProps({
  weekBirthdays: { type: Array, default: () => [] },
})
const emit = defineEmits(['genBirthdayCard'])

const showCard = ref(false), cardName = ref(''), cardMsg = ref(''), cardEmoji = ref('🎂')
const greetings = ['愿你健康快乐，学习进步！🌟','愿你像小树一样茁壮成长！🌱','新的一岁，新的精彩，加油！💪','愿你每天都有阳光般的笑容！☀️','祝聪明可爱的你生日快乐！🎈']

function genBirthdayCard(b) {
  cardName.value = b.name
  cardEmoji.value = b.daysLeft === 0 ? '🎂🎉' : '🎂'
  cardMsg.value = greetings[Math.floor(Math.random() * greetings.length)]
  showCard.value = true
}
function copyBirthdayCard() {
  copyText(`🎂 亲爱的${cardName.value}同学：\n\n生日快乐！${cardMsg.value}\n\n——${auth.user?.name||'老师'} ${new Date().toLocaleDateString('zh-CN')}`)
}
</script>

<style scoped>
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.li { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.li:last-child { border-bottom: none; }
.li-t { flex: 1; color: var(--c-title); }
.bd-li { gap: 12rpx; }
.bd-emoji { font-size: 28rpx; flex-shrink: 0; }
.bd-date { font-size: 24rpx; color: var(--c-sub); margin-left: auto; flex-shrink: 0; }
.bd-today { font-size: 22rpx; color: #fff; background: var(--c-danger); padding: 4rpx 14rpx; border-radius: 20rpx; flex-shrink: 0; }
.bd-days { font-size: 22rpx; color: var(--c-accent); background: rgba(230,162,60,.15); padding: 4rpx 14rpx; border-radius: 20rpx; flex-shrink: 0; }
.bd-card { font-size: 20rpx; color: #fff; background: #e06c75; padding: 4rpx 12rpx; border-radius: 16rpx; flex-shrink: 0; }
</style>
