<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Play, RotateCcw, Trophy, Heart } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

// ===== 类型定义 =====
interface Entity {
  id: number
  x: number // 中心点 x（百分比 0~100）
  y: number // 中心点 y（百分比 0~100）
}
interface Bullet extends Entity {}
interface Enemy extends Entity {
  speed: number
}

// ===== 常量 =====
const TICK = 30 // 游戏循环间隔(ms)
const PLAYER_W = 14
const PLAYER_H = 8
const BULLET_W = 2.5
const BULLET_H = 4
const ENEMY_W = 12
const ENEMY_H = 7
const PLAYER_SPEED = 4 // 每次移动百分比
const BULLET_SPEED = 3
const SPAWN_EVERY = 40 // 多少 tick 生成一个敌人
const SHOOT_COOLDOWN = 8 // 射击冷却 tick
const MAX_LIVES = 3

// ===== 状态 =====
const player = ref<Entity>({ id: 0, x: 50, y: 88 })
const bullets = ref<Bullet[]>([])
const enemies = ref<Enemy[]>([])
const score = ref(0)
const bestScore = ref(0)
const lives = ref(MAX_LIVES)
const isPlaying = ref(false)
const gameOver = ref(false)
let gameTimer: number | null = null
let tickCount = 0
let shootCount = 0
let idCounter = 1
const keys = new Set<string>()

function resetState() {
  player.value = { id: 0, x: 50, y: 88 }
  bullets.value = []
  enemies.value = []
  score.value = 0
  lives.value = MAX_LIVES
  tickCount = 0
  shootCount = 0
  idCounter = 1
  keys.clear()
}

function startGame() {
  resetState()
  gameOver.value = false
  isPlaying.value = true
  startLoop()
}

function restartGame() {
  startGame()
}

function startLoop() {
  if (gameTimer) return
  gameTimer = window.setInterval(loop, TICK)
}

function stopLoop() {
  if (gameTimer) {
    clearInterval(gameTimer)
    gameTimer = null
  }
}

function spawnEnemy() {
  const speed = 1.2 + Math.random() * 1.2
  enemies.value.push({
    id: idCounter++,
    x: 8 + Math.random() * 84,
    y: -ENEMY_H,
    speed,
  })
}

function shoot() {
  if (!isPlaying.value || gameOver.value) return
  if (shootCount > 0) return
  bullets.value.push({
    id: idCounter++,
    x: player.value.x,
    y: player.value.y - PLAYER_H / 2,
  })
  shootCount = SHOOT_COOLDOWN
}

// 轴对齐包围盒碰撞检测
function hit(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return (
    Math.abs(ax - bx) * 2 < aw + bw &&
    Math.abs(ay - by) * 2 < ah + bh
  )
}

function loop() {
  if (!isPlaying.value || gameOver.value) return
  tickCount++
  if (shootCount > 0) shootCount--

  // 玩家移动
  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) {
    player.value.x = Math.max(PLAYER_W / 2, player.value.x - PLAYER_SPEED)
  }
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) {
    player.value.x = Math.min(100 - PLAYER_W / 2, player.value.x + PLAYER_SPEED)
  }
  if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) {
    player.value.y = Math.max(PLAYER_H / 2 + 6, player.value.y - PLAYER_SPEED)
  }
  if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) {
    player.value.y = Math.min(94 - PLAYER_H / 2, player.value.y + PLAYER_SPEED)
  }

  // 子弹上移
  bullets.value = bullets.value
    .map(b => ({ ...b, y: b.y - BULLET_SPEED }))
    .filter(b => b.y > -BULLET_H)

  // 敌人下移
  const nextEnemies: Enemy[] = []
  for (const e of enemies.value) {
    const ny = e.y + e.speed
    // 与玩家碰撞
    if (hit(player.value.x, player.value.y, PLAYER_W, PLAYER_H, e.x, ny, ENEMY_W, ENEMY_H)) {
      loseLife()
      continue
    }
    // 抵达底部
    if (ny > 100 + ENEMY_H / 2) {
      loseLife()
      continue
    }
    nextEnemies.push({ ...e, y: ny })
  }
  enemies.value = nextEnemies

  // 子弹击中敌人
  const aliveEnemies: Enemy[] = []
  for (const e of enemies.value) {
    const struck = bullets.value.find(b =>
      hit(b.x, b.y, BULLET_W, BULLET_H, e.x, e.y, ENEMY_W, ENEMY_H),
    )
    if (struck) {
      bullets.value = bullets.value.filter(b => b.id !== struck.id)
      score.value += 10
    } else {
      aliveEnemies.push(e)
    }
  }
  enemies.value = aliveEnemies

  // 周期性生成敌人
  if (tickCount % SPAWN_EVERY === 0) {
    spawnEnemy()
  }
}

function loseLife() {
  lives.value -= 1
  if (lives.value <= 0) {
    endGame()
  }
}

function endGame() {
  stopLoop()
  gameOver.value = true
  isPlaying.value = false
  if (score.value > bestScore.value) {
    bestScore.value = score.value
    localStorage.setItem('plane-best', String(bestScore.value))
  }
}

function handleKeydown(e: KeyboardEvent) {
  const k = e.key
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) {
    e.preventDefault()
  }
  if (k === ' ') {
    if (!isPlaying.value && !gameOver.value) {
      startGame()
    } else if (isPlaying.value && !gameOver.value) {
      shoot()
    }
    return
  }
  keys.add(k)
}

function handleKeyup(e: KeyboardEvent) {
  keys.delete(e.key)
}

// 触摸：点击屏幕发射
function handleTouch() {
  if (!isPlaying.value && !gameOver.value) {
    startGame()
  } else if (isPlaying.value && !gameOver.value) {
    shoot()
  }
}

onMounted(() => {
  const saved = localStorage.getItem('plane-best')
  if (saved) bestScore.value = parseInt(saved, 10)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
})

onUnmounted(() => {
  stopLoop()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="✈️"
      title="飞机大战"
      description="方向键或 WASD 移动，空格键开火！"
      gradient="from-sky2-100 via-cream-50 to-mint-100"
      status-text="动作射击"
      status-color="bg-sky2-100 text-sky2-600"
      :back-to="'games'"
    />

    <!-- 分数面板 -->
    <div class="flex gap-3">
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Trophy :size="12" />
          当前分数
        </div>
        <div class="text-2xl font-bold text-cocoa-900 font-number">{{ score }}</div>
      </div>
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Trophy :size="12" />
          最高分
        </div>
        <div class="text-2xl font-bold text-sky2-600 font-number">{{ bestScore }}</div>
      </div>
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Heart :size="12" />
          生命
        </div>
        <div class="text-2xl font-bold text-red-400 font-number">
          {{ '❤️'.repeat(Math.max(0, lives)) || '—' }}
        </div>
      </div>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="relative" @click="handleTouch" @touchend.prevent="handleTouch">
        <div
          class="card-soft p-2 overflow-hidden bg-gradient-to-b from-sky2-50 to-cream-100"
          style="width: min(92vw, 420px); height: min(70vh, 560px)"
        >
          <div class="relative w-full h-full overflow-hidden rounded-xl bg-gradient-to-b from-sky2-100/60 to-cream-50">
            <!-- 玩家飞机 -->
            <div
              class="absolute flex items-center justify-center text-xl select-none"
              :style="{
                left: (player.x - PLAYER_W / 2) + '%',
                top: (player.y - PLAYER_H / 2) + '%',
                width: PLAYER_W + '%',
                height: PLAYER_H + '%',
              }"
            >
              🚀
            </div>

            <!-- 子弹 -->
            <div
              v-for="b in bullets"
              :key="b.id"
              class="absolute rounded-full bg-yellow-400 shadow"
              :style="{
                left: (b.x - BULLET_W / 2) + '%',
                top: (b.y - BULLET_H / 2) + '%',
                width: BULLET_W + '%',
                height: BULLET_H + '%',
              }"
            ></div>

            <!-- 敌人 -->
            <div
              v-for="e in enemies"
              :key="e.id"
              class="absolute flex items-center justify-center text-lg select-none"
              :style="{
                left: (e.x - ENEMY_W / 2) + '%',
                top: (e.y - ENEMY_H / 2) + '%',
                width: ENEMY_W + '%',
                height: ENEMY_H + '%',
              }"
            >
              🛸
            </div>
          </div>
        </div>

        <!-- 开始遮罩 -->
        <div
          v-if="!isPlaying && !gameOver"
          class="absolute inset-0 bg-cocoa-900/40 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">✈️</div>
          <div class="text-xl font-bold text-white mb-4">准备好了吗？</div>
          <button class="btn-primary" @click.stop="startGame">
            <Play :size="16" />
            开始游戏
          </button>
        </div>

        <!-- 结束遮罩 -->
        <div
          v-if="gameOver"
          class="absolute inset-0 bg-cocoa-900/60 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">💥</div>
          <div class="text-2xl font-bold text-white mb-1">游戏结束</div>
          <div class="text-sm text-white/80 mb-1">本局得分：{{ score }}</div>
          <div class="text-xs text-white/70 mb-4">最高分：{{ bestScore }}</div>
          <button class="btn-primary" @click.stop="restartGame">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button v-if="!isPlaying && !gameOver" class="btn-primary" @click="startGame">
        <Play :size="16" />
        开始游戏
      </button>
      <button v-else-if="isPlaying" class="btn-mint" @click="shoot">
        <Trophy :size="16" />
        发射
      </button>
      <button v-if="gameOver" class="btn-primary" @click="restartGame">
        <RotateCcw :size="16" />
        重新开始
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 方向键 / WASD 控制飞机移动，空格键发射子弹</p>
      <p>击中 🛸 敌人得 10 分，被撞或漏过敌人扣 1 点生命，生命耗尽即结束</p>
    </div>
  </div>
</template>
