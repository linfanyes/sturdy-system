import api from '../common/request'

const endpoints = [
  { key: 'schedules', label: '课程表', path: '/schedules' },
  { key: 'notes', label: '笔记', path: '/notes' },
  { key: 'todos', label: '待办', path: '/todos' },
  { key: 'notices', label: '公告', path: '/notices' },
  { key: 'messages', label: '留言', path: '/messages' },
  { key: 'students', label: '学生', path: '/students' },
  { key: 'classes', label: '班级', path: '/classes' },
]

export function getEndpoints() {
  return endpoints
}

export function getEndpointByKey(key) {
  return endpoints.find(e => e.key === key) || null
}

export async function fetchEndpoint(path, opts = {}) {
  return api.get(path + '?take=10000', opts)
}

export async function importEndpoint(path, rest) {
  return api.post(path, rest)
}

/** 备份列表 */
export function listBackups(opts = {}) {
  return api.get('/backups', opts)
}

/** 创建备份 */
export function createBackup(payload) {
  return api.post('/backups', payload)
}

/** 获取备份详情 */
export function getBackup(id) {
  return api.get('/backups/' + id)
}

/** 删除备份 */
export function removeBackup(id) {
  return api.del('/backups/' + id)
}
