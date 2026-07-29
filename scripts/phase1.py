import os

WORK = r"D:\workspace\my-prj\tercher-work\work-system"
errors = []

# ====== Phase 1: 小程序 store.js 改为 shared 导入 ======
store_path = os.path.join(WORK, "mini-program", "src", "common", "store.js")
with open(store_path, "r", encoding="utf-8") as f:
    store_content = f.read()

old_import = "import { reactive } from 'vue'\nimport { DEMO_MODE_ENABLED } from './config'"
new_import = "import { reactive } from 'vue'\nimport { DEMO_MODE_ENABLED } from './config'\nimport { SCHEMES, FONT_SIZES } from '@gardener/shared/constants'"

if old_import in store_content:
    store_content = store_content.replace(old_import, new_import)
    store_content = store_content.replace(
        "export const FONT_SIZES = [\n    { value: 'sm', label: '小', scale: 0.9 },\n    { value: 'md', label: '标准', scale: 1 },\n    { value: 'lg', label: '大', scale: 1.15 },\n  ]",
        "export { FONT_SIZES }"
    )
    store_content = store_content.replace(
        "export const SCHEMES = [\n    { value: 'butter', label: '奶黄', color: '#e6a23c' },\n    { value: 'mint', label: '薄荷', color: '#07c160' },\n    { value: 'sakura', label: '樱花', color: '#e06c75' },\n    { value: 'sky', label: '天蓝', color: '#409eff' },\n  ]",
        "export { SCHEMES }"
    )
    with open(store_path, "w", encoding="utf-8") as f:
        f.write(store_content)
    print("Phase 1 done: mini-program store.js updated")
else:
    print("WARN: store.js import pattern not found")
    errors.append("store.js replace failed")
