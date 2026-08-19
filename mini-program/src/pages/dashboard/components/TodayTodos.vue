<template>
  <view class="card pop-in">
    <view class="card-h">
      <text class="ch-t">✅ 今日待办</text>
      <text class="ch-m">{{ doneCount }}/{{ todayTodos.length }}</text>
    </view>
    <view class="todo-add">
      <input v-model="newTodo" class="ta-inp" placeholder="添加待办，回车保存" @confirm="addTodo" />
      <view class="ta-btn" @click="addTodo">添加</view>
    </view>
    <view v-if="todayTodos.length" class="todo-list">
      <view v-for="(t, i) in todayTodos" :key="t.id" class="li pop-in" :style="{ '--i': i }">
        <view class="cb" :class="t.done && 'on'" @click="$emit('toggleTodo', t)"></view>
        <text class="li-t" :class="t.done && 'done'">{{ t.title }}</text>
        <text class="li-del" @click="$emit('delTodo', t)">🗑</text>
      </view>
    </view>
    <view v-else class="empty">
      <text class="empty-icon">☕</text>
      <text class="empty-text">还没有待办，享受片刻安静</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { createTodo } from '@/api/dashboard'

const props = defineProps({
  todayTodos: { type: Array, default: () => [] },
  doneCount: { type: Number, default: 0 },
})
const emit = defineEmits(['toggleTodo', 'delTodo', 'refreshTodos'])

const newTodo = ref('')
const todayStr = new Date().toISOString().slice(0, 10)

async function addTodo() {
  const title = newTodo.value.trim()
  if (!title) return
  try {
    const r = await createTodo({ title, note: '', date: todayStr, done: false })
    emit('refreshTodos', r)
    newTodo.value = ''
  } catch (e) { uni.showToast({ title: '添加失败', icon: 'none' }) }
}
</script>

<style scoped>
.card {
  margin-top: 20rpx;
  background: var(--c-card);
  border-radius: var(--r-lg);
  padding: 24rpx;
  box-shadow: var(--c-shadow-paper);
  position: relative;
  overflow: hidden;
}
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 15%; right: 15%;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
}
.card-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.todo-add { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.ta-inp {
  flex: 1;
  background: var(--c-input);
  border-radius: 12rpx;
  padding: 14rpx 18rpx;
  font-size: 26rpx;
  border: 2rpx solid transparent;
  transition: border-color 0.2s;
}
.ta-inp:focus { border-color: var(--c-primary); }
.ta-btn {
  font-size: 26rpx;
  color: #fff;
  background: var(--c-primary);
  padding: 0 28rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  font-weight: 600;
  transition: transform 0.15s;
}
.ta-btn:active { transform: scale(0.92); }
.todo-list { display: flex; flex-direction: column; }
.li {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid var(--c-border);
}
.li:last-child { border-bottom: none; }
.li-t { flex: 1; font-size: 26rpx; color: var(--c-title); }
.li-t.done { color: var(--c-sub); text-decoration: line-through; }
.cb {
  width: 36rpx; height: 36rpx;
  border-radius: 50%;
  border: 3rpx solid var(--c-border);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.cb.on {
  background: var(--c-success);
  border-color: var(--c-success);
}
.cb.on::after {
  content: '✓';
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
}
.li-del {
  font-size: 26rpx;
  color: var(--c-danger);
  flex-shrink: 0;
  margin-left: 10rpx;
  transition: transform 0.15s;
}
.li-del:active { transform: scale(0.85); }
.empty {
  text-align: center;
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.empty-icon { font-size: 48rpx; }
.empty-text { font-size: 24rpx; color: var(--c-sub); }
/* 弹出动画 */
.pop-in {
  animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--i, 0) * 0.06s);
}
@keyframes pop-in {
  from { opacity: 0; transform: translateX(-14rpx); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
