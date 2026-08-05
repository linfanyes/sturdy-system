import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url)).replace(/\\/g, '/')

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'))
}

// 1. Extract mini-program subPackage pages
const pagesJson = readJson(`${__dirname}/../mini-program/src/pages.json`)
const miniPages = new Set()

for (const sp of pagesJson.subPackages || []) {
  for (const p of sp.pages || []) {
    const fullPath = `${sp.root}/${p.path}`.replace(/^pages\//, '')
    miniPages.add(fullPath)
  }
}

// 2. Extract Web teacher routes only
const routerContent = readFileSync(`${__dirname}/../web-app/src/router/index.ts`, 'utf-8')

// Find the teacher route block: look for "// 教师" comment and extract until the closing ],
const teacherBlockMatch = routerContent.match(/\/\/ 教师[^\n]*\n([\s\S]*?)\n\s*\],\s*\},\s*\/\/ 家长/)
if (!teacherBlockMatch) {
  console.error('Could not find teacher route block')
  process.exit(1)
}

const teacherBlock = teacherBlockMatch[1]
const webRoutes = new Set()
const pathRegex = /path: '([^']+)'/g
let match

while ((match = pathRegex.exec(teacherBlock)) !== null) {
  const path = match[1]
  // Skip empty path (it's the dashboard)
  if (path === '') {
    webRoutes.add('dashboard')
  } else if (path.startsWith('teacher/')) {
    webRoutes.add(path.replace('teacher/', ''))
  } else if (!path.startsWith('/')) {
    // Direct child path like 'toolbox', 'games', etc.
    webRoutes.add(path)
  }
}

// 3. Normalize mini pages for comparison
const normalizedMini = new Set()
for (const p of miniPages) {
  normalizedMini.add(p)
  if (p.endsWith('/index')) normalizedMini.add(p.slice(0, -6))
}

// 4. Find functional gaps (with known alias handling)
const knownAliases = {
  // Web route -> mini page mapping (different names, same feature)
  'teacher-work-log': 'work-log',
  'teacher-lesson-obs': 'lesson-observation',
  'office-translate': 'office-tools/translate',
  'office-paper': 'writing/paper',
  'office-blackboard': 'office-tools/blackboard',
  'office-speech': 'office-tools/speech',
  'plan-template-lib': 'writing/plan-template-lib',
  'teacher-directory': 'community/teacher',
  'teacher-detail': 'community/teacher',  // teacher detail page
  'resource-library': 'community/resource-library',  // teacher resource library
  'textbook': 'community/textbook',
  'papers': 'writing/paper-queries',
  'paper-queries': 'writing/paper-queries',
  'lesson-plan-templates': 'writing/lesson-plan-templates',
  'ai-resources': 'community/resource-library',
  'ai-chat': 'ai/ai',
  'ai-image': 'community/image-creation',
  'teacher-lesson-plans': 'community/lesson-plans',
  'teacher-knowledges': 'writing/knowledges',
  'tools/writingMaterials': 'subject-tools/writingMaterials',
  'tools/poetry': 'subject-tools/poetry',
  'tools/wordCard': 'subject-tools/wordCard',
  'tools/dictation': 'subject-tools/dictation',
  'tools/idiom': 'subject-tools/idiom',
  'tools/reading': 'subject-tools/reading',
  'tools/essay': 'writing/essay',
  'tools/grammar': 'subject-tools/grammar',
  'tools/listening': 'subject-tools/listening',
  'tools/pinyin': 'subject-tools/pinyin',
  'tools/spell': 'subject-tools/spell',
  'tools/speaking': 'subject-tools/speaking',
  'tools/englishStory': 'writing/english-story',
  'tools/planTemplates': 'writing/plan-template-lib',
  'tools/thesis': 'writing/paper',
  'tools/lessonObservation': 'community/lesson-observation',
  'tools/comment': 'office-tools/comment',
  'tools/summary': 'office-tools/summary',
  'tools/flower': 'tools/flower',
  'tools/classDuty': 'teaching/class-duty',
  'tools/scheduleMaker': 'teaching/schedule-maker',
  'my-schedule': 'community/schedule',
  'student-info-review': 'community/student-info-review',
  'duty-roster': 'community/duty-roster',
  'class-finance': 'community/class-finance',
  'class-activities': 'community/class-activities',
  'gallery': 'community/gallery',
  'my-gallery': 'community/my-gallery',
  'exams': 'teaching/exams',
  'grades': 'teaching/grades',
  'exam-analysis': 'teaching/analysis',
  'data-dashboard': 'teaching/data-dashboard',
  'exam-detail': 'teaching/exam-detail',
  'student-grades': 'teaching/student-grades',
  'attendance': 'community/attendance',
  'homework': 'community/homework',
  'rewards': 'teaching/award-categories',
  'score-records': 'teaching/score-records',
  'group-scores': 'teaching/group-scores',
  'leaderboard': 'teaching/leaderboard',
  'growth': 'community/growth',
  'behavior': 'community/behavior-record',
  'reading-log': 'teaching/reading-log',
  'checkin': 'teaching/checkin',
  'awards': 'community/award-record',
  'award-categories': 'teaching/award-categories',
  'parent-contacts': 'community/parent-contact',
  'messages': 'community/messages',
  'notice-templates': 'writing/notice-templates',
  'lesson-plans': 'community/lesson-plans',
  'knowledges': 'writing/knowledges',
  'zhzx': 'community/zhxue',
  'grade-trend': 'teaching/grade-trend',
  'picker-history': 'community/picker-history',
  'notifications': 'community/notifications',
  'notes': 'community/notes',
  'todos': 'community/todos',
  'image-creation': 'community/image-creation',
  'work-log': 'community/work-log',
  'behavior-record': 'community/behavior-record',
  'award-record': 'community/award-record',
  'quicktool': 'quick/quicktool',
  'subject-list': 'quick/subject-list',
  'subject/:name': 'subject-tools/index',
}

// 5. Find gaps with alias resolution
const missingOnWeb = []
const missingOnMini = []

for (const wp of webRoutes) {
  if (normalizedMini.has(wp)) continue
  const alias = knownAliases[wp]
  if (alias && normalizedMini.has(alias)) continue
  missingOnWeb.push(wp)
}

for (const mp of miniPages) {
  // Try to find a web route that maps to this mini page
  let found = false
  for (const [web, mini] of Object.entries(knownAliases)) {
    if (mini === mp && webRoutes.has(web)) {
      found = true
      break
    }
  }
  if (found) continue
  if (webRoutes.has(mp)) continue
  if (webRoutes.has(mp.replace('/index', ''))) continue
  missingOnMini.push(mp)
}

console.log('\n=== Mini-program pages (subPackages only) ===')
console.log(`Total: ${miniPages.size}`)

console.log('\n=== Web teacher routes ===')
console.log(`Total: ${webRoutes.size}`)

console.log('\n=== Potentially missing on Web (no mini equivalent found) ===')
if (missingOnWeb.length === 0) {
  console.log('None')
} else {
  console.log(missingOnWeb.sort().join('\n'))
}

console.log('\n=== Potentially missing on Mini (no Web equivalent found) ===')
if (missingOnMini.length === 0) {
  console.log('None')
} else {
  console.log(missingOnMini.sort().join('\n'))
}

console.log('\n=== Summary ===')
console.log(`Mini subPackage pages: ${miniPages.size}`)
console.log(`Web teacher routes: ${webRoutes.size}`)
console.log(`Potentially missing on Web: ${missingOnWeb.length}`)
console.log(`Potentially missing on Mini: ${missingOnMini.length}`)
