<template>
  <view class="card bd-card" v-if="weekBirthdays.length">
    <view class="card-h">
      <view class="bd-title-row">
        <text class="bd-cake anim-float">🎂</text>
        <text class="ch-t">本周生日（{{ weekBirthdays.length }} 人）</text>
      </view>
    </view>
    <view v-for="(b, i) in weekBirthdays" :key="b.id" class="li bd-li pop-in" :style="{ '--i': i }">
      <text class="bd-emoji">{{ b.daysLeft === 0 ? '🎉' : '🎂' }}</text>
      <view class="bd-info">
        <text class="li-t">{{ b.name }}</text>
        <text class="bd-date">{{ b.birthLabel }}</text>
      </view>
      <text v-if="b.daysLeft === 0" class="bd-today pulse-dot">今天</text>
      <text v-else class="bd-days">{{ b.daysLeft }} 天后</text>
      <text class="bd-card press-feedback" @click.stop="$emit('genBirthdayCard', b)">🎉 卡片</text>
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
.bd-card { margin-top: 20rpx; background: linear-gradient(135deg, var(--c-card) 0%, #fff5f7 100%); border-radius: 24rpx; padding: 24rpx; box-shadow: 0 4rpx 20rpx var(--c-shadow); position: relative; overflow: hidden; }
.bd-card::before { content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 2rpx; background: linear-gradient(90deg, transparent, rgba(225,108,117,0.4), transparent); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.bd-title-row { display: flex; align-items: center; gap: 12rpx; }
.bd-cake { font-size: 32rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.li { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.li:last-child { border-bottom: none; }
.bd-li { gap: 12rpx; }
.bd-emoji { font-size: 28rpx; flex-shrink: 0; }
.bd-info { flex: 1; display: flex; flex-direction: column; gap: 2rpx; }
.li-t { color: var(--c-title); font-weight: 600; }
.bd-date { font-size: 22rpx; color: var(--c-sub); }
.bd-today { font-size: 22rpx; color: #fff; background: linear-gradient(135deg, #f56c6c, #e06c75); padding: 4rpx 14rpx; border-radius: 20rpx; flex-shrink: 0; position: relative; }
.bd-days { font-size: 22rpx; color: var(--c-accent); background: rgba(230,162,60,.15); padding: 4rpx 14rpx; border-radius: 20rpx; flex-shrink: 0; }
.bd-card:last-child { font-size: 20rpx; color: #fff; background: linear-gradient(135deg, #e06c75, #c9436d); padding: 4rpx 12rpx; border-radius: 16rpx; flex-shrink: 0; }
.pop-in { animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--i, 0) * 0.08s); }
.anim-float { animation: float-soft 3s ease-in-out infinite; }
.press-feedback { transition: transform 0.15s, opacity 0.15s; }
.press-feedback:active { transform: scale(0.9); opacity: 0.85; }
.pulse-dot { position: relative; }
.pulse-dot::before { content: ''; position: absolute; inset: -4rpx; border-radius: 50%; background: rgba(230,67,64,0.3); animation: pulse-ring 1.5s ease-out infinite; z-index: -1; }
@keyframes pop-in { from { opacity: 0; transform: scale(0.8) translateY(20rpx); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes float-soft { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4rpx); } }
@keyframes pulse-ring { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.8); opacity: 0; } }
</style>
