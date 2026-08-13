import type { Directive } from 'vue'

/**
 * v-lazy 图片懒加载指令。
 * - 使用 IntersectionObserver，当元素进入视口时才加载 src。
 * - 支持自定义占位符 v-lazy:placeholder="'data:image/svg+xml,...'"
 * - 自动解绑，避免内存泄漏。
 *
 * 用法：
 *   <img v-lazy="imageUrl" />
 *   <img v-lazy:placeholder="placeholderUrl" :src="imageUrl" />
 */

type LazyValue = string | { src: string; placeholder?: string }

const io = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLImageElement
            const realSrc = el.dataset.lazySrc || ''
            if (realSrc) {
              el.src = realSrc
              el.removeAttribute('data-lazy-src')
            }
            io?.unobserve(el)
          }
        }
      },
      { rootMargin: '100px', threshold: 0.01 },
    )
  : null

export const lazy: Directive<HTMLImageElement, LazyValue> = {
  mounted(el, binding) {
    let src: string
    let placeholder = ''

    if (typeof binding.value === 'string') {
      src = binding.value
    } else if (binding.value && typeof binding.value === 'object') {
      src = binding.value.src
      placeholder = binding.value.placeholder || ''
    } else {
      return
    }

    if (placeholder) {
      el.src = placeholder
    } else {
      // 默认加载骨架占位
      el.src =
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjVmNWY1Ij48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIvPjwvc3ZnPg=='
    }

    el.dataset.lazySrc = src
    el.setAttribute('loading', 'lazy')

    if (io) {
      io.observe(el)
    } else {
      // 降级：直接加载
      el.src = src
    }
  },
  updated(el, binding) {
    let src: string
    if (typeof binding.value === 'string') {
      src = binding.value
    } else if (binding.value && typeof binding.value === 'object') {
      src = binding.value.src
    } else {
      return
    }
    if (src !== el.dataset.lazySrc) {
      el.dataset.lazySrc = src
      if (io) {
        io.observe(el)
      } else {
        el.src = src
      }
    }
  },
  beforeUnmount(el) {
    if (io) io.unobserve(el)
  },
}

export default lazy
