import { readFileSync, writeFileSync } from 'node:fs'
import { globSync } from 'node:fs'

const root = 'D:/workspace/my-prj/tercher-work/work-system/mini-program'
const raw = readFileSync(root + '/src/pages.json', 'utf8')
const json = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, ''))

function titleOf(p) {
  const t = p.style && (p.style.navigationBarTitleText || (p.style.navigationBar && p.style.navigationBar.titleText))
  return t || ''
}

const pages = []
for (const p of json.pages || []) pages.push({ pkg: 'main', path: p.path, title: titleOf(p) })
for (const sp of json.subPackages || []) {
  for (const p of sp.pages || []) pages.push({ pkg: sp.root, path: sp.root + '/' + p.path, title: titleOf(p) })
}

// 静态分析 .vue 页面里的按钮/事件与导航/接口调用
import { execSync } from 'node:child_process'
const vueFiles = execSync(`find ${root}/src/pages -name "*.vue"`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
const clickRe = /@(click|tap)\s*=|bind(click|tap)\s*=/g
const navRe = /(uni\.navigateTo|wx\.navigateTo|uni\.redirectTo|uni\.switchTab|uni\.reLaunch|uni\.navigateBack)\s*\(/g
const apiRe = /\b(api|request|http)\s*\.\s*(get|post|put|patch|delete|head)\s*\(/gi
let totalBtns = 0, totalNav = 0, totalApi = 0
const perPage = {}
for (const f of vueFiles) {
  const src = readFileSync(f, 'utf8')
  const rel = f.replace(root + '/src/pages/', '').replace(/\.vue$/, '')
  const clicks = (src.match(clickRe) || []).length
  const navs = (src.match(navRe) || []).length
  const apis = (src.match(apiRe) || []).length
  totalBtns += clicks; totalNav += navs; totalApi += apis
  perPage[rel] = { clicks, navs, apis }
}

const out = {
  generatedAt: new Date().toISOString(),
  totalPages: pages.length,
  byPackage: pages.reduce((a, p) => { a[p.pkg] = (a[p.pkg] || 0) + 1; return a }, {}),
  pages,
  staticAnalysis: { vueFiles: vueFiles.length, totalClickTap: totalBtns, totalNav: totalNav, totalApiCall: totalApi, perPage },
}
writeFileSync('D:/workspace/my-prj/tercher-work/work-system/scripts/mini-pages.json', JSON.stringify(out, null, 2))
console.log('TOTAL_PAGES=' + pages.length)
console.log('BY_PACKAGE=' + JSON.stringify(out.byPackage))
console.log('VUE_FILES=' + vueFiles.length + ' clickTap=' + totalBtns + ' nav=' + totalNav + ' api=' + totalApi)
