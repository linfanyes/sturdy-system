import { clampTake, stripUnsafe } from './base.controller'

describe('base.controller 安全辅助函数', () => {
  describe('clampTake（分页上限）', () => {
    it('未传 take 时默认 500', () => {
      expect(clampTake(undefined)).toBe(500)
    })
    it('空字符串回退默认 500', () => {
      expect(clampTake('')).toBe(500)
    })
    it('超大 take 被截断为 500', () => {
      expect(clampTake('99999')).toBe(500)
    })
    it('正常 take 原样返回', () => {
      expect(clampTake('20')).toBe(20)
    })
    it('0 被当作 falsy 回退默认（取默认 500）', () => {
      expect(clampTake('0')).toBe(500)
    })
  })

  describe('stripUnsafe（防 mass-assignment）', () => {
    it('剔除租户键/主键/角色/时间戳', () => {
      const out = stripUnsafe({ teacherId: 'x', id: 'y', role: 'super', createdAt: 't', updatedAt: 't', isDeleted: 0, name: '张三', score: 90 })
      expect(out).toEqual({ name: '张三', score: 90 })
    })
    it('保留业务字段', () => {
      const out = stripUnsafe({ title: '作业', content: '内容', classId: 'c1' })
      expect(out).toEqual({ title: '作业', content: '内容', classId: 'c1' })
    })
    it('空对象返回空对象', () => {
      expect(stripUnsafe({})).toEqual({})
    })
    it('非对象（null/undefined/原始值）原样返回', () => {
      expect(stripUnsafe(null)).toBeNull()
      expect(stripUnsafe(undefined)).toBeUndefined()
      expect(stripUnsafe('str')).toBe('str')
    })
    it('嵌套对象不展开（保持原值）', () => {
      const nested = { a: { teacherId: 'x' } }
      expect(stripUnsafe(nested)).toEqual({ a: { teacherId: 'x' } })
    })
  })
})
