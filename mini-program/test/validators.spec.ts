/**
 * 小程序端：本地校验器单元测试
 * 测试 mini-program/src/common/validators.js 导出的校验器
 * - 共享校验器：引用 @gardener/shared/validators，不重复测试核心逻辑（由 shared-validators.spec.ts 覆盖）
 * - 本地扩展：isEmail、inRange、isInt 等小程序专用校验器
 */
import {
  // 共享校验器（重新导出）
  isPhone,
  isValidPhone,
  isScore,
  isNonEmpty,
  isStudentNo,
  isAmount,
  isUrl,
  isDateStr,
  clip,
  MAX_LEN,
  // 本地扩展校验器
  isEmail,
  inRange,
  isInt,
} from '../src/common/validators'

describe('validators (mini-program local)', () => {
  describe('isEmail (local extension)', () => {
    it('正确邮箱', () => {
      expect(isEmail('a@b.com')).toBe(true)
      expect(isEmail('test.user+tag@example.co.uk')).toBe(true)
    })
    it('错误邮箱', () => {
      expect(isEmail('a@')).toBe(false)
      expect(isEmail('a.b')).toBe(false)
      expect(isEmail('a@b')).toBe(false) // 无顶级域名
      expect(isEmail('@b.com')).toBe(false) // 无本地部分
    })
    it('空值', () => {
      expect(isEmail('')).toBe(false)
      expect(isEmail(null)).toBe(false)
    })
  })

  describe('inRange (local extension)', () => {
    it('闭区间判断', () => {
      expect(inRange(5, 1, 10)).toBe(true)
      expect(inRange(1, 1, 10)).toBe(true) // 含下界
      expect(inRange(10, 1, 10)).toBe(true) // 含上界
      expect(inRange(0, 1, 10)).toBe(false)
      expect(inRange(11, 1, 10)).toBe(false)
    })
    it('min/max 为 null 时忽略该侧', () => {
      expect(inRange(5, null, 10)).toBe(true)
      expect(inRange(5, 1, null)).toBe(true)
    })
    it('非数字', () => {
      expect(inRange('abc', 1, 10)).toBe(false)
    })
  })

  describe('isInt (local extension)', () => {
    it('整数（含负数）', () => {
      expect(isInt(5, 0, 10)).toBe(true)
      expect(isInt(-3, -10, 10)).toBe(true)
    })
    it('非整数', () => {
      expect(isInt(5.5, 0, 10)).toBe(false)
    })
  })

  // 共享校验器的冒烟测试：验证重新导出正常工作
  // 核心逻辑测试在 shared-validators.spec.ts 中完整覆盖
  describe('shared validators re-export smoke test', () => {
    describe('isPhone', () => {
      it('should work via re-export', () => {
        expect(isPhone('13812345678')).toBe(true)
        expect(isPhone('12345678901')).toBe(false)
        expect(isPhone('')).toBe(false)
      })
    })

    describe('isValidPhone', () => {
      it('should work via re-export', () => {
        expect(isValidPhone('13812345678')).toBe(true)
        expect(isValidPhone('')).toBe(true)
        expect(isValidPhone(null)).toBe(true)
      })
    })

    describe('isScore', () => {
      it('should work via re-export', () => {
        expect(isScore(0)).toBe(true)
        expect(isScore(100)).toBe(true)
        expect(isScore(101)).toBe(false)
        expect(isScore(150, 150)).toBe(true)
      })
    })

    describe('isNonEmpty', () => {
      it('should work via re-export', () => {
        expect(isNonEmpty('hello')).toBe(true)
        expect(isNonEmpty('')).toBe(false)
        expect(isNonEmpty('   ')).toBe(false)
        expect(isNonEmpty(null)).toBe(false)
      })
    })

    describe('isStudentNo', () => {
      it('should work via re-export', () => {
        expect(isStudentNo('A12345')).toBe(true)
        expect(isStudentNo('AB')).toBe(true)
        expect(isStudentNo('A')).toBe(false)
        expect(isStudentNo('')).toBe(true)
      })
    })

    describe('isAmount', () => {
      it('should work via re-export', () => {
        expect(isAmount(10)).toBe(true)
        expect(isAmount(10.55)).toBe(true)
        expect(isAmount(0)).toBe(false)
        expect(isAmount(10.555)).toBe(false)
      })
    })

    describe('isUrl', () => {
      it('should work via re-export', () => {
        expect(isUrl('http://example.com')).toBe(true)
        expect(isUrl('https://example.com/path')).toBe(true)
        expect(isUrl('')).toBe(true)
        expect(isUrl('ftp://example.com')).toBe(false)
      })
    })

    describe('isDateStr', () => {
      it('should work via re-export', () => {
        expect(isDateStr('2024-01-15')).toBe(true)
        expect(isDateStr('2024-1-5')).toBe(false)
        expect(isDateStr('')).toBe(true)
      })
    })

    describe('clip', () => {
      it('should work via re-export', () => {
        expect(clip('hello world', 5)).toBe('hello')
        expect(clip('abc', 5)).toBe('abc')
        expect(clip(null, 5)).toBe('')
      })
    })

    describe('MAX_LEN', () => {
      it('should work via re-export', () => {
        expect(MAX_LEN.NAME).toBe(50)
        expect(MAX_LEN.PHONE).toBe(11)
        expect(MAX_LEN.STUDENT_NO).toBe(32)
        expect(MAX_LEN.EMAIL).toBe(100)
      })
    })
  })
})