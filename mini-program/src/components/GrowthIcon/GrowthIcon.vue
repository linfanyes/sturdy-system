<template>
  <image
    class="gi"
    :src="src"
    :style="{ width: sizeStr + 'rpx', height: sizeStr + 'rpx' }"
    mode="aspectFit"
  />
</template>

<script>
/**
 * 生长图标（小程序版）—— 与 Web 端 GrowthIcon 共享同一套 SVG path 源。
 * 小程序不支持内联 SVG 渲染，故以 <image> 引用 static/icons 下的本地 svg 文件。
 * name: seed | sprout | bud | bloom
 * size: rpx
 */
export default {
  name: 'GrowthIcon',
  props: {
    name: { type: String, default: 'seed' },
    size: { type: Number, default: 48 },
  },
  computed: {
    src() {
      const n = ['seed', 'sprout', 'bud', 'bloom'].includes(this.name) ? this.name : 'seed'
      return `/static/icons/gi-${n}.svg`
    },
    sizeStr() {
      return this.size
    },
  },
}
</script>

<style scoped>
.gi {
  display: block;
  flex: 0 0 auto;
}
</style>