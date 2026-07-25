// 供 @vue/vue3-jest 在编译 .vue 的 <script setup lang="ts"> 时剥离 TS 类型
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
}
