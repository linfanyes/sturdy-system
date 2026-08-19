<template>
  <view class="card">
    <view class="card-h">
      <text class="ch-t">✅ 今日待办</text>
      <text class="ch-m">{{ doneCount }}/{{ todayTodos.length }} 完成</text>
    </view>
    <view class="todo-add">
      <input v-model="newTodo" class="ta-inp" placeholder="添加待办，回车保存" @confirm="addTodo" />
      <text class="ta-btn" @click="addTodo">添加</text>
    </view>
    <view v-if="todayTodos.length">
      <view v-for="t in todayTodos" :key="t.id" class="li todo">
        <view class="cb" :class="t.done && 'on'" @click="$emit('toggleTodo', t)"></view>
        <text class="li-t" :class="t.done && 'done'">{{ t.title }}</text>
        <text class="li-del" @click="$emit('delTodo', t)">🗑</text>
      </view>
    </view>
    <view v-else class="empty">还没有待办，享受片刻安静</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { createTodo, updateTodo, deleteTodo } from '@/api/dashboard'

const props = defineProps({
  todayTodos: { type: Array, default: () => [] },
  doneCount: { type: Number, default: 0 },
  todoList: { type: Array, default: () => [] },
})
const emit = defineEmits(['toggleTodo', 'delTodo', 'refreshTodos'])

const newTodo = ref('')
const todayStr = new Date().toISOString().slice(0, 10)

async function addTodo() {
  const t = newTodo.value.trim()
  if (!t) return
  try {
    const r = await createTodo({ title: t, note: '', date: todayStr, done: false })
    emit('refreshTodos', r)
    newTodo.value = ''
  } catch (e) { uni.showToast({ title: '添加失败', icon: 'none' }) }
}
</script>

<style scoped>
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.todo-add { display: flex; gap: 12rpx; margin-bottom: 12rpx; }
.ta-inp { flex: 1; background: var(--c-input); border-radius: 12rpx; padding: 14rpx 18rpx; font-size: 26rpx; }
.ta-btn { font-size: 26rpx; color: #fff; background: var(--c-accent); padding: 0 28rpx; border-radius: 12rpx; display: flex; align-items: center; }
.li { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.li:last-child { border-bottom: none; }
.li-t { flex: 1; color: var(--c-title); }
.li-t.done { color: var(--c-sub); text-decoration: line-through; }
.todo { gap: 14rpx; }
.cb { width: 36rpx; height: 36rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.cb.on { background: var(--c-primary); border-color: var(--c-primary); }
.li-del { font-size: 26rpx; color: var(--c-danger); flex-shrink: 0; margin-left: 10rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 30rpx 0; font-size: 24rpx; }
</style>
