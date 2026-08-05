<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

const router = useRouter()

// ---- Constants ----
const BOARD_W = 420
const BOARD_H = 520
const SCREEN_X = 100            // Player fixed screen X
const BASELINE = 420            // Platform top Y (screen coords)
const PLATFORM_H = 18
const PLAYER_SIZE = 32
const MAX_TRAVEL = 320          // Max jump distance at full charge
const CHARGE_TIME = 1300        // ms to full charge
const JUMP_DUR = 500            // ms for jump animation
const JUMP_H = 180              // Max jump height
const PERFECT = 12              // Center tolerance for perfect landing

// ---- Reactive state ----
const started = ref(false)
const over = ref(false)
const score = ref(0)
const combo = ref(0)
const charge = ref(0)           // 0–1
const best = ref(parseInt(localStorage.getItem('web_game_jump_highscore') || '0'))

// Reactive game positions (updated each frame via RAF)
const playerX = ref(100)        // Screen X
const playerY = ref(BASELINE - PLAYER_SIZE) // Screen Y
const curScreenX = ref(0)       // Current platform center screen X
const curWidth = ref(130)
const nextScreenX = ref(0)      // Next platform center screen X
const nextWidth = ref(130)

// ---- Non-reactive game state ----
let playerWX = 0                // World X
let curWX = 0                   // Current platform world center
let curW = 130
let nextWX = 0                  // Next platform world center
let nextW = 130
let camX = -SCREEN_X            // Camera offset
let charging = false
let jumping = false
let chargeStart = 0
let jumpStartWX = 0
let travel = 0
let jumpStartTime = 0
let rafId: number | null = null
let chargeRafId: number | null = null

// ---- Sync reactive screen positions from world state ----
function syncScreen() {
  playerX.value = playerWX - camX
  playerY.value = playerY.value // Already set directly
  curScreenX.value = curWX - camX
  curWidth.value = curW
  nextScreenX.value = nextWX - camX
  nextWidth.value = nextW
}

// ---- Helpers ----
function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function nextWidthCalc() {
  return Math.max(55, 130 - score.value * 1.8)
}

function newDist() {
  return rand(150, 280)
}

function spawnNext() {
  nextWX = curWX + newDist()
  nextW = nextWidthCalc()
}

// ---- Jump animation ----
function jumpLoop(time: number) {
  if (!jumping) return
  const elapsed = time - jumpStartTime
  const p = Math.min(1, elapsed / JUMP_DUR)

  playerWX = jumpStartWX + travel * p
  playerY.value = BASELINE - PLAYER_SIZE - 4 * JUMP_H * p * (1 - p)
  playerX.value = playerWX - camX

  if (p >= 1) {
    jumping = false
    land()
  }
  if (jumping) {
    rafId = requestAnimationFrame(jumpLoop)
  } else {
    rafId = null
  }
}

// ---- Landing ----
function land() {
  const landingWX = jumpStartWX + travel
  const lo = nextWX - nextW / 2 - 4
  const hi = nextWX + nextW / 2 + 4

  if (landingWX < lo || landingWX > hi) {
    fail()
    return
  }

  const centerDist = Math.abs(landingWX - nextWX)
  if (centerDist < PERFECT) {
    combo.value++
    score.value += 2 + (combo.value - 1)
  } else {
    score.value += 1
    combo.value = 0
  }

  curWX = nextWX
  curW = nextW
  spawnNext()
  playerWX = landingWX
  camX = playerWX - SCREEN_X
  playerY.value = BASELINE - PLAYER_SIZE
  playerX.value = playerWX - camX
  curScreenX.value = curWX - camX
  curWidth.value = curW
  nextScreenX.value = nextWX - camX
  nextWidth.value = nextW
}

// ---- Fail ----
function fail() {
  if (over.value) return
  over.value = true
  stopLoop()
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('web_game_jump_highscore', String(score.value))
  }
}

// ---- Mouse events ----
function onMouseDown() {
  if (over.value || jumping || !started.value) return
  charging = true
  chargeStart = performance.now()
  charge.value = 0
  startChargeRaf()
}

function onMouseUp() {
  if (!charging || !started.value) return
  charging = false
  stopChargeRaf()
  const elapsed = performance.now() - chargeStart
  const power = Math.min(1, elapsed / CHARGE_TIME)
  charge.value = 0

  if (power < 0.03) return

  jumping = true
  jumpStartWX = playerWX
  travel = power * MAX_TRAVEL
  jumpStartTime = performance.now()
  rafId = requestAnimationFrame(jumpLoop)
}

// ---- Charge indicator ----
function chargeLoop(time: number) {
  if (!charging) return
  const elapsed = time - chargeStart
  charge.value = Math.min(1, elapsed / CHARGE_TIME)
  chargeRafId = requestAnimationFrame(chargeLoop)
}

function startChargeRaf() {
  stopChargeRaf()
  chargeRafId = requestAnimationFrame(chargeLoop)
}

function stopChargeRaf() {
  if (chargeRafId !== null) {
    cancelAnimationFrame(chargeRafId)
    chargeRafId = null
  }
}

// ---- Start / Stop ----
function start() {
  score.value = 0
  combo.value = 0
  charge.value = 0
  over.value = false
  charging = false
  jumping = false
  stopLoop()

  playerWX = 0
  playerY.value = BASELINE - PLAYER_SIZE
  curWX = 0
  curW = 130
  nextWX = curWX + newDist()
  nextW = 130
  camX = playerWX - SCREEN_X
  syncScreen()

  started.value = true
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  stopChargeRaf()
}

function stop() {
  stopLoop()
  started.value = false
}

onUnmounted(stop)
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <RefreshCw class="w-6 h-6 text-mint-500" /> 跳一跳
    </h1>

    <!-- Start screen -->
    <div v-if="!started" class="flex flex-col items-center gap-4 py-12">
      <p class="text-cocoa-600">长按蓄力，松手跳跃</p>
      <p class="text-cocoa-400 text-sm text-center max-w-xs">完美落在平台中心 +2 分（连击递增），平台会逐渐变窄</p>
      <button
        class="px-8 py-3 bg-mint-500 text-white rounded-xl font-semibold hover:bg-mint-600 transition-colors"
        @click="start"
      >
        开始游戏
      </button>
      <p class="text-cocoa-400 text-xs mt-4">最高分：{{ best }}</p>
    </div>

    <!-- Game board -->
    <div v-else class="bg-surface rounded-2xl p-4 shadow-softer flex flex-col items-center gap-3">
      <div class="flex items-center justify-between w-full text-sm">
        <span class="text-cocoa-700 font-semibold">得分：{{ score }}</span>
        <span class="text-cocoa-500">连击 {{ combo }}</span>
        <span class="text-cocoa-500">最高 {{ best }}</span>
      </div>

      <div
        class="relative overflow-hidden rounded-xl border-2 border-cocoa-200 select-none"
        :style="{ width: BOARD_W + 'px', height: BOARD_H + 'px' }"
        @mousedown="onMouseDown"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
        @mousedown.prevent
      >
        <!-- Current platform -->
        <div
          class="absolute rounded shadow-sm"
          :style="{
            left: (curScreenX - curWidth / 2) + 'px',
            top: BASELINE + 'px',
            width: curWidth + 'px',
            height: PLATFORM_H + 'px',
          }"
          style="background: #10b981;"
        ></div>

        <!-- Next platform -->
        <div
          class="absolute rounded shadow-sm"
          :style="{
            left: (nextScreenX - nextWidth / 2) + 'px',
            top: BASELINE + 'px',
            width: nextWidth + 'px',
            height: PLATFORM_H + 'px',
          }"
          style="background: #f59e0b;"
        ></div>

        <!-- Center dot (perfect landing indicator) -->
        <div
          class="absolute rounded-full"
          :style="{
            left: (nextScreenX - 4) + 'px',
            top: (BASELINE - 4) + 'px',
            width: '8px',
            height: '8px',
          }"
          style="background: #ef4444; opacity: 0.7;"
        ></div>

        <!-- Player -->
        <div
          class="absolute text-3xl leading-none select-none pointer-events-none"
          :style="{
            left: playerX + 'px',
            top: playerY + 'px',
            transform: 'translate(-50%, -100%)',
          }"
        >
          🟠
        </div>

        <!-- Charge bar track -->
        <div
          class="absolute bottom-4 left-4 right-4 rounded-full"
          :style="{ height: '10px', background: 'rgba(0,0,0,0.1)' }"
        ></div>

        <!-- Charge bar fill -->
        <div
          class="absolute bottom-4 left-4 rounded-full z-10"
          :style="{
            width: (charge * (BOARD_W - 32)) + 'px',
            height: '10px',
            background: charge > 0.7 ? '#ef4444' : charge > 0.4 ? '#f59e0b' : '#10b981',
          }"
        ></div>

        <!-- Game over overlay -->
        <div v-if="over" class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-20">
          <p class="text-white text-xl font-bold">💀 掉落</p>
          <p class="text-white/80 mt-2">
            得分 {{ score }}{{ score > best && score > 0 ? ' · 新纪录' : '' }}
          </p>
          <button
            class="mt-4 px-8 py-2 bg-mint-500 text-white rounded-xl hover:bg-mint-600 transition-colors"
            @click="start"
            @mousedown.stop
            @mouseup.stop
          >
            再来一局
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
