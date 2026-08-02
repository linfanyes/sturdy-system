<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name?: string
    roleLabel?: string
    subtitle?: string
    badge?: string
    avatar?: string
    accent?: 'butter' | 'sakura' | 'mint' | 'sky'
  }>(),
  {
    name: '',
    roleLabel: '',
    subtitle: '',
    badge: '',
    avatar: '🌟',
    accent: 'butter',
  },
)

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
})

const accentClass = computed(
  () =>
    ({
      butter: 'hero-avatar--butter',
      sakura: 'hero-avatar--sakura',
      mint: 'hero-avatar--mint',
      sky: 'hero-avatar--sky',
    })[props.accent],
)
</script>

<template>
  <section class="welcome-banner hero" aria-label="欢迎横幅">
    <span class="hero-orb hero-orb--a" aria-hidden="true"></span>
    <span class="hero-orb hero-orb--b" aria-hidden="true"></span>
    <div class="relative z-10 flex items-center gap-4">
      <div class="hero-avatar" :class="accentClass" role="img" :aria-label="`头像 ${avatar}`">{{ avatar }}</div>
      <div class="flex-1 min-w-0">
        <div class="hero-greeting">
          {{ greeting }}，<span class="hero-name">{{ name }}</span>
          <span v-if="roleLabel" class="hero-role">{{ roleLabel }}</span>
          <span v-if="badge" class="hero-badge">{{ badge }}</span>
        </div>
        <div v-if="subtitle" class="hero-subtitle truncate">{{ subtitle }}</div>
      </div>
      <div v-if="$slots.actions" class="hero-actions shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
}
.hero-orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(10px);
  pointer-events: none;
}
.hero-orb--a {
  width: 130px;
  height: 130px;
  right: -24px;
  top: -36px;
  background: radial-gradient(circle at 30% 30%, #fff6d8, #ffd479);
  opacity: 0.55;
}
.hero-orb--b {
  width: 84px;
  height: 84px;
  right: 86px;
  bottom: -28px;
  background: radial-gradient(circle at 30% 30%, #ffe3ec, #ffb8cc);
  opacity: 0.45;
}
.hero-avatar {
  width: 56px;
  height: 56px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  line-height: 1;
  box-shadow: 0 6px 16px rgba(214, 184, 126, 0.35);
  flex: 0 0 auto;
}
.hero-avatar--butter {
  background: linear-gradient(135deg, #ffe7a8, #ffd479);
}
.hero-avatar--sakura {
  background: linear-gradient(135deg, #ffd6e2, #ffb8cc);
}
.hero-avatar--mint {
  background: linear-gradient(135deg, #cdeed0, #9be0a8);
}
.hero-avatar--sky {
  background: linear-gradient(135deg, #cfe4fb, #9cc8f5);
}

.hero-greeting {
  font-size: 1.25rem;
  line-height: 1.6rem;
  font-weight: 700;
  color: #3d2e1f;
}
.hero-name {
  color: #b9821f;
}
.hero-role {
  font-size: 0.875rem;
  font-weight: 400;
  color: rgba(61, 46, 31, 0.7);
  margin-left: 0.25rem;
}
.hero-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.1rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #7a5a2e;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 9999px;
  vertical-align: middle;
}
.hero-subtitle {
  font-size: 0.875rem;
  color: rgba(61, 46, 31, 0.7);
  margin-top: 0.125rem;
}
.hero-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 640px) {
  .hero-greeting {
    font-size: 1.1rem;
  }
  .hero-avatar {
    width: 48px;
    height: 48px;
    font-size: 22px;
  }
}
</style>
