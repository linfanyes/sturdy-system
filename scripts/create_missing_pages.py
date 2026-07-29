import os, json

WORK = r'D:\workspace\my-prj\tercher-work\work-system'
TD = os.path.join(WORK, 'web-app', 'src', 'views', 'tools')
OD = os.path.join(WORK, 'web-app', 'src', 'views', 'office')
ED = os.path.join(WORK, 'web-app', 'src', 'views', 'evaluation')
os.makedirs(TD, exist_ok=True)
os.makedirs(OD, exist_ok=True)
os.makedirs(ED, exist_ok=True)

def w(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'  OK {os.path.basename(path)}')

# 1. grade-trend
w(os.path.join(ED, 'GradeTrend.vue'), '''<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
const students = ref<any[]>([])
const selected = ref('')
const trend = ref<any[]>([])
async function loadStudents() {
  try { const d = await request.get('/api/students'); students.value = (d?.items || d || []).slice(0, 50) } catch (e) { console.error(e) }
}
async function loadTrend() {
  if (!selected.value) return
  try { const d = await request.get('/api/grades/trend', { params: { studentId: selected.value } }); trend.value = d?.items || d || [] } catch (e) { console.error(e) }
}
loadStudents()
</script>
<template>
  <div class="grade-trend"><h2>成绩趋势</h2>
    <div class="sel"><select v-model="selected" @change="loadTrend"><option value="">选择学生</option><option v-for="s in students" :key="s.id" :value="s.id">{{ s.name || s.studentId }}</option></select></div>
    <div v-if="trend.length" class="list"><div v-for="item in trend" :key="item.id" class="item"><div class="exam">{{ item.examName || item.name }}</div><div class="bar"><div class="fill" :style="{width:(item.totalScore||0)+'%'}"><span>{{ item.totalScore || 0 }}分</span></div></div><div class="date">{{ item.date }}</div></div></div>
    <div v-else class="empty">{{ students.length ? '请选择学生' : '暂无数据' }}</div>
  </div>
</template>
<style scoped>
.grade-trend{padding:20px} .grade-trend h2{margin:0 0 16px;font-size:18px}
.sel{margin-bottom:16px} .sel select{padding:8px 12px;border:1px solid #e0d5c4;border-radius:4px}
.list{display:flex;flex-direction:column;gap:8px}
.item{background:#fff;border:1px solid #e0d5c4;border-radius:6px;padding:10px 12px;display:flex;align-items:center;gap:10px}
.exam{min-width:80px;font-size:14px}.bar{flex:1;height:20px;background:#f0e6d3;border-radius:10px;overflow:hidden}
.fill{height:100%;background:linear-gradient(90deg,#e6a23c,#07c160);border-radius:10px;display:flex;align-items:center}
.fill span{color:#fff;font-size:11px;margin-left:8px}.date{font-size:12px;color:#999}
.empty{text-align:center;padding:40px;color:#999}
</style>''')

# 2. picker-history
w(os.path.join(ED, 'PickerHistory.vue'), '''<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
const history = ref<any[]>([])
async function load() {
  try { const d = await request.get('/api/picker/history'); history.value = d?.items || d || [] } catch (e) { console.error(e) }
}
load()
</script>
<template>
  <div class="picker-history"><h2>点名历史</h2>
    <div class="list"><div v-for="h in history" :key="h.id" class="item"><div class="student">{{ h.studentName || h.name }}</div><div class="time">{{ h.time || h.createdAt }}</div></div>
    <div v-if="!history.length" class="empty">暂无点名记录</div></div>
  </div>
</template>
<style scoped>
.picker-history{padding:20px} .picker-history h2{margin:0 0 16px;font-size:18px}
.list{display:flex;flex-direction:column;gap:8px}
.item{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #e0d5c4;border-radius:6px;padding:10px 14px}
.student{font-weight:500}.time{font-size:12px;color:#999}
.empty{text-align:center;padding:40px;color:#999}
</style>''')

# 3. reward (tools/)
w(os.path.join(TD, 'Reward.vue'), '''<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
const students = ref<any[]>([])
const selected = ref('')
const points = ref('5')
const reason = ref('')
async function loadStudents() {
  try { const d = await request.get('/api/students'); students.value = (d?.items || d || []).slice(0, 50) } catch (e) { console.error(e) }
}
async function award() {
  if (!selected.value) return
  try { await request.post('/api/rewards', { studentId: selected.value, points: parseInt(points.value) || 1, reason: reason.value }); selected.value=''; reason.value=''; alert('已奖励！') } catch (e) { console.error(e) }
}
loadStudents()
</script>
<template>
  <div class="reward"><h2>奖赏</h2>
    <div class="form"><select v-model="selected"><option value="">选择学生</option><option v-for="s in students" :key="s.id" :value="s.id">{{ s.name || s.studentId }}</option></select>
    <input v-model="points" type="number" placeholder="积分" /><input v-model="reason" placeholder="理由" />
    <button class="btn-primary" @click="award">奖励</button></div>
  </div>
</template>
<style scoped>
.reward{padding:20px} .reward h2{margin:0 0 16px;font-size:18px}
.form{display:flex;gap:8px;flex-wrap:wrap}
.form select,.form input{padding:8px 10px;border:1px solid #e0d5c4;border-radius:4px;font-size:14px}
</style>''')

# 4. subject-tools/index
w(os.path.join(WORK, 'web-app', 'src', 'views', 'tools', 'SubjectTools.vue'), '''<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const subjects = [
  { name: '语文', path: 'chinese', icon: 'chinese' },
  { name: '数学', path: 'math', icon: 'math' },
  { name: '英语', path: 'english', icon: 'english' },
]
</script>
<template>
  <div class="subject-tools"><h2>学科工具</h2>
    <div class="grid"><div v-for="s in subjects" :key="s.path" class="card" @click="router.push(s.path)"><div class="name">{{ s.name }}</div></div></div>
  </div>
</template>
<style scoped>
.subject-tools{padding:20px} .subject-tools h2{margin:0 0 16px;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}
.card{background:#fff;border:1px solid #e0d5c4;border-radius:8px;padding:20px;text-align:center;cursor:pointer;transition:border-color .2s}
.card:hover{border-color:#e6a23c} .card .name{font-size:16px;font-weight:500}
</style>''')

# 5. office-tools/index
w(os.path.join(OD, 'OfficeTools.vue'), '''<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const tools = [
  { name: '评语生成', route: '/teacher/tools/comment', icon: 'comment' },
  { name: '期末总结', route: '/teacher/tools/summary', icon: 'summary' },
  { name: '教案模板', route: '/teacher/tools/planTemplates', icon: 'plan' },
  { name: '教育论文', route: '/teacher/tools/thesis', icon: 'thesis' },
  { name: '翻译助手', route: '/teacher/office-tools/translate', icon: 'translate' },
  { name: '黑板报', route: '/teacher/office-tools/blackboard', icon: 'blackboard' },
  { name: '演讲稿', route: '/teacher/office-tools/speech', icon: 'speech' },
]
</script>
<template>
  <div class="office-tools"><h2>办公工具</h2>
    <div class="grid"><div v-for="t in tools" :key="t.route" class="card" @click="router.push(t.route)"><div class="name">{{ t.name }}</div></div></div>
  </div>
</template>
<style scoped>
.office-tools{padding:20px} .office-tools h2{margin:0 0 16px;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.card{background:#fff;border:1px solid #e0d5c4;border-radius:8px;padding:20px;text-align:center;cursor:pointer;transition:border-color .2s}
.card:hover{border-color:#e6a23c} .card .name{font-size:15px;font-weight:500}
</style>''')

# 6. office-tools/translate
w(os.path.join(OD, 'Translate.vue'), '''<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
const input = ref('')
const result = ref('')
const lang = ref('en')
async function doTranslate() {
  if (!input.value.trim()) return
  try { const d = await request.post('/api/ai/translate', { text: input.value, targetLang: lang.value }); result.value = d?.result || d?.text || '' } catch (e) { console.error(e) }
}
</script>
<template>
  <div class="translate"><h2>翻译助手</h2>
    <div class="form"><textarea v-model="input" placeholder="输入要翻译的内容..." rows="4"></textarea>
    <div class="row"><select v-model="lang"><option value="en">中→英</option><option value="ja">中→日</option><option value="ko">中→韩</option><option value="zh">英→中</option></select>
    <button class="btn-primary" @click="doTranslate">翻译</button></div></div>
    <div v-if="result" class="result">{{ result }}</div>
  </div>
</template>
<style scoped>
.translate{padding:20px} .translate h2{margin:0 0 16px;font-size:18px}
.form{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.form textarea{padding:10px;border:1px solid #e0d5c4;border-radius:4px;font-size:14px;resize:vertical}
.row{display:flex;gap:8px} .row select,.row input{padding:8px 10px;border:1px solid #e0d5c4;border-radius:4px}
.result{background:#f8f4ec;border:1px solid #e0d5c4;border-radius:6px;padding:14px;font-size:14px;line-height:1.6;white-space:pre-wrap}
</style>''')

# 7. office-tools/blackboard
w(os.path.join(OD, 'Blackboard.vue'), '''<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
const topic = ref('')
const content = ref('')
const result = ref('')
async function generate() {
  if (!topic.value.trim()) return
  try { const d = await request.post('/api/ai/blackboard', { topic: topic.value }); result.value = d?.content || d?.result || '' } catch (e) { console.error(e) }
}
</script>
<template>
  <div class="blackboard"><h2>黑板报生成</h2>
    <div class="form"><input v-model="topic" placeholder="输入主题（如：国庆节、运动会）" />
    <button class="btn-primary" @click="generate">生成</button></div>
    <div v-if="result" class="result"><pre>{{ result }}</pre></div>
  </div>
</template>
<style scoped>
.blackboard{padding:20px} .blackboard h2{margin:0 0 16px;font-size:18px}
.form{display:flex;gap:8px;margin-bottom:16px}
.form input{flex:1;padding:10px;border:1px solid #e0d5c4;border-radius:4px;font-size:14px}
.result{background:#f8f4ec;border:1px solid #e0d5c4;border-radius:6px;padding:14px}
.result pre{margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;font-family:inherit}
</style>''')

# 8. office-tools/speech
w(os.path.join(OD, 'Speech.vue'), '''<script setup lang="ts">
import { ref } from 'vue'
import request from '@/api/request'
const topic = ref('')
const role = ref('')
const result = ref('')
async function generate() {
  if (!topic.value.trim()) return
  try { const d = await request.post('/api/ai/speech', { topic: topic.value, role: role.value }); result.value = d?.content || d?.result || '' } catch (e) { console.error(e) }
}
</script>
<template>
  <div class="speech"><h2>演讲稿生成</h2>
    <div class="form"><input v-model="topic" placeholder="演讲主题" /><input v-model="role" placeholder="角色（如：班主任）" />
    <button class="btn-primary" @click="generate">生成</button></div>
    <div v-if="result" class="result"><pre>{{ result }}</pre></div>
  </div>
</template>
<style scoped>
.speech{padding:20px} .speech h2{margin:0 0 16px;font-size:18px}
.form{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.form input{flex:1;min-width:140px;padding:10px;border:1px solid #e0d5c4;border-radius:4px;font-size:14px}
.result{background:#f8f4ec;border:1px solid #e0d5c4;border-radius:6px;padding:14px}
.result pre{margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;font-family:inherit}
</style>''')

# 9. quicktool
w(os.path.join(OD, 'QuickTool.vue'), '''<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const shortcuts = [
  { name: '随机点名', route: '/teacher/tools/picker' },
  { name: '倒计时', route: '/teacher/tools/timer' },
  { name: '课堂计算器', route: '/teacher/tools/calc' },
  { name: '座位表', route: '/teacher/tools/seatMap' },
  { name: '加减分', route: '/teacher/tools/scorePanel' },
  { name: '随机分组', route: '/teacher/tools/grouper' },
  { name: '口算生成', route: '/teacher/tools/math' },
  { name: '汉字笔顺', route: '/teacher/tools/strokeOrder' },
  { name: '乘法口诀', route: '/teacher/tools/multiplicationTable' },
  { name: '单位换算', route: '/teacher/tools/unitConversion' },
]
</script>
<template>
  <div class="quicktool"><h2>快捷工具</h2>
    <div class="grid"><div v-for="s in shortcuts" :key="s.route" class="card" @click="router.push(s.route)"><div class="name">{{ s.name }}</div></div></div>
  </div>
</template>
<style scoped>
.quicktool{padding:20px} .quicktool h2{margin:0 0 16px;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}
.card{background:#fff;border:1px solid #e0d5c4;border-radius:6px;padding:16px;text-align:center;cursor:pointer;transition:border-color .2s}
.card:hover{border-color:#e6a23c} .card .name{font-size:14px;font-weight:500}
</style>''')

# 10. subject-list
w(os.path.join(WORK, 'web-app', 'src', 'views', 'tools', 'SubjectList.vue'), '''<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
const subjects = [
  { name: '语文', path: '/teacher/subject-tools/chinese' },
  { name: '数学', path: '/teacher/subject-tools/math' },
  { name: '英语', path: '/teacher/subject-tools/english' },
  { name: '科学', path: '/teacher/subject-tools/science' },
]
</script>
<template>
  <div class="subject-list"><h2>学科列表</h2>
    <div class="list"><div v-for="s in subjects" :key="s.path" class="item" @click="router.push(s.path)"><span>{{ s.name }}</span><span class="arrow">&rsaquo;</span></div></div>
  </div>
</template>
<style scoped>
.subject-list{padding:20px} .subject-list h2{margin:0 0 16px;font-size:18px}
.list{display:flex;flex-direction:column;gap:6px}
.item{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #e0d5c4;border-radius:6px;padding:12px 14px;cursor:pointer;transition:border-color .2s}
.item:hover{border-color:#e6a23c} .arrow{font-size:18px;color:#999}
</style>''')

# 11. subject detail
w(os.path.join(WORK, 'web-app', 'src', 'views', 'tools', 'SubjectDetail.vue'), '''<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()
const name = (route.params.name as string) || ''
const tools = [
  { name: '古诗词助手', route: '/teacher/tools/poetry' },
  { name: '汉字笔顺', route: '/teacher/tools/strokeOrder' },
  { name: '成语词典', route: '/teacher/tools/idiom' },
  { name: '口算生成', route: '/teacher/tools/math' },
  { name: '乘法口诀', route: '/teacher/tools/multiplicationTable' },
  { name: '单位换算', route: '/teacher/tools/unitConversion' },
]
</script>
<template>
  <div class="subject-detail"><h2>{{ name || '学科' }}工具</h2>
    <div class="grid"><div v-for="t in tools" :key="t.route" class="card" @click="router.push(t.route)"><div class="name">{{ t.name }}</div></div></div>
  </div>
</template>
<style scoped>
.subject-detail{padding:20px} .subject-detail h2{margin:0 0 16px;font-size:18px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.card{background:#fff;border:1px solid #e0d5c4;border-radius:8px;padding:18px;text-align:center;cursor:pointer;transition:border-color .2s}
.card:hover{border-color:#e6a23c} .card .name{font-size:14px;font-weight:500}
</style>''')

print('=== 11 pages created ===')

# ===== UPDATE ROUTER =====
router_path = os.path.join(WORK, 'web-app', 'src', 'router', 'index.ts')
with open(router_path, 'r', encoding='utf-8') as f:
    rc = f.read()

new_routes = '''
      // 补齐与小程序对齐的功能模块
      { path: 'office-tools', name: 'teacher-office-tools', component: () => import('@/views/office/OfficeTools.vue'), meta: { title: '办公工具', feature: 'tools' } },
      { path: 'office-tools/translate', name: 'teacher-translate', component: () => import('@/views/office/Translate.vue'), meta: { title: '翻译助手', feature: 'tools' } },
      { path: 'office-tools/blackboard', name: 'teacher-blackboard', component: () => import('@/views/office/Blackboard.vue'), meta: { title: '黑板报', feature: 'tools' } },
      { path: 'office-tools/speech', name: 'teacher-speech', component: () => import('@/views/office/Speech.vue'), meta: { title: '演讲稿', feature: 'tools' } },
      { path: 'subject-tools', name: 'teacher-subject-tools', component: () => import('@/views/tools/SubjectTools.vue'), meta: { title: '学科工具', feature: 'tools' } },
      { path: 'subject-list', name: 'teacher-subject-list', component: () => import('@/views/tools/SubjectList.vue'), meta: { title: '学科列表', feature: 'tools' } },
      { path: 'subject/:name', name: 'teacher-subject-detail', component: () => import('@/views/tools/SubjectDetail.vue'), meta: { title: '学科工具', feature: 'tools' } },
      { path: 'quicktool', name: 'teacher-quicktool', component: () => import('@/views/office/QuickTool.vue'), meta: { title: '快捷工具', feature: 'tools' } },
      { path: 'grade-trend', name: 'teacher-grade-trend', component: () => import('@/views/evaluation/GradeTrend.vue'), meta: { title: '成绩趋势', feature: 'grades' } },
      { path: 'picker-history', name: 'teacher-picker-history', component: () => import('@/views/evaluation/PickerHistory.vue'), meta: { title: '点名历史', feature: 'tools' } },
      { path: 'tools/reward', name: 'teacher-reward', component: () => import('@/views/tools/Reward.vue'), meta: { title: '奖赏', feature: 'rewards' } },
'''

anchor = "teacher-office-tools"
if anchor not in rc:
    # find last tools route to insert after
    last_tool = rc.rfind("name: 'toolLessonObservation'")
    if last_tool > -1:
        comma = rc.find(',', last_tool + len("name: 'toolLessonObservation'"))
        if comma > -1:
            rc = rc[:comma + 1] + new_routes + rc[comma + 1:]
            with open(router_path, 'w', encoding='utf-8') as f:
                f.write(rc)
            print('Router updated')
    else:
        print('WARN: anchor not found')
else:
    print('Router already has new routes')

# ===== UPDATE FEATURES =====
feat_path = os.path.join(WORK, 'web-app', 'src', 'constants', 'features.ts')
with open(feat_path, 'r', encoding='utf-8') as f:
    fc = f.read()

extras = [
    ("'demo'", "'demo',\n  { key: 'office_tools', label: '办公工具' },\n  { key: 'subject_tools', label: '学科工具' },\n  { key: 'quicktool', label: '快捷工具' },\n  { key: 'grade_trend', label: '成绩趋势' },\n  { key: 'picker_history', label: '点名历史' },\n  { key: 'reward', label: '奖赏' },\n  { key: 'translate', label: '翻译' },\n  { key: 'blackboard', label: '黑板报' },\n  { key: 'speech', label: '演讲稿' }"),
]
for old, new in extras:
    if old in fc and old in fc:
        fc = fc.replace(old, new)

with open(feat_path, 'w', encoding='utf-8') as f:
    f.write(fc)
print('Features updated')

print('ALL DONE')
