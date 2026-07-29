/**
 * 共享校验器功能测试
 * 验证 @gardener/shared/validators 导出的所有纯函数校验器行为正确
 */
import {
  isPhone,
  isValidPhone,
  normalizePhone,
  validateClassName,
  generateClassName,
  parseClassName,
  isSubject,
  getSubjectByValue,
  isRole,
  hasFeature,
  isGrade,
  isScore,
  isNonEmpty,
  isStudentNo,
  isAmount,
  isUrl,
  isDateStr,
  clip,
  MAX_LEN,
  PHONE_REGEX,
  PHONE_HINT,
  CLASS_NAMING_RULE,
} from '@gardener/shared/validators'

describe('shared validators', () => {
  describe('isPhone', () => {
    it('should return true for valid Chinese mobile numbers', () => {
      expect(isPhone('13812345678')).toBe(true)
      expect(isPhone('19999999999')).toBe(true)
      expect(isPhone('13000000000')).toBe(true)
      expect(isPhone('15012345678')).toBe(true)
    })

    it('should return false for invalid numbers', () => {
      expect(isPhone('12812345678')).toBe(false) // second digit 2
      expect(isPhone('1381234567')).toBe(false) // 10 digits
      expect(isPhone('138123456789')).toBe(false) // 12 digits
      expect(isPhone('03812345678')).toBe(false) // starts with 0
      expect(isPhone('')).toBe(false)
      expect(isPhone(null as any)).toBe(false)
      expect(isPhone(undefined as any)).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('should return true for valid numbers', () => {
      expect(isValidPhone('13812345678')).toBe(true)
      expect(isValidPhone(' 13812345678 ')).toBe(true)
    })

    it('should return true for null/undefined/empty', () => {
      expect(isValidPhone(null as any)).toBe(true)
      expect(isValidPhone(undefined as any)).toBe(true)
      expect(isValidPhone('')).toBe(true)
    })

    it('should return false for invalid non-empty', () => {
      expect(isValidPhone('12812345678')).toBe(false)
      expect(isValidPhone('1381234567')).toBe(false)
    })
  })

  describe('normalizePhone', () => {
    it('should remove spaces and dashes', () => {
      expect(normalizePhone('138 1234 5678')).toBe('13812345678')
      expect(normalizePhone('138-1234-5678')).toBe('13812345678')
      expect(normalizePhone(' 138-1234-5678 ')).toBe('13812345678')
    })

    it('should return empty string for null/undefined', () => {
      expect(normalizePhone(null as any)).toBe('')
      expect(normalizePhone(undefined as any)).toBe('')
    })
  })

  describe('validateClassName', () => {
    it('should validate correct class names', () => {
      expect(validateClassName('五年级1班')).toEqual({ valid: true, classNo: 1 })
      expect(validateClassName('初二3班')).toEqual({ valid: true, classNo: 3 })
      expect(validateClassName('高一5班')).toEqual({ valid: true, classNo: 5 })
      expect(validateClassName('一年级1班')).toEqual({ valid: true, classNo: 1 })
      expect(validateClassName('六年级12班')).toEqual({ valid: true, classNo: 12 })
    })

    it('should reject invalid formats', () => {
      expect(validateClassName('5年级1班').valid).toBe(false)
      expect(validateClassName('五年级一班').valid).toBe(false)
      expect(validateClassName('五年级').valid).toBe(false)
      expect(validateClassName('').valid).toBe(false)
      expect(validateClassName(null as any).valid).toBe(false)
    })

    it('should reject classNo out of range', () => {
      expect(validateClassName('五年级0班').valid).toBe(false)
      expect(validateClassName('五年级100班').valid).toBe(false)
    })

    it('should validate grade consistency when grade provided', () => {
      expect(validateClassName('五年级1班', '五年级')).toEqual({ valid: true, classNo: 1 })
      expect(validateClassName('五年级1班', '六年级').valid).toBe(false)
    })
  })

  describe('generateClassName', () => {
    it('should generate standard class name', () => {
      expect(generateClassName('五年级', 1)).toBe('五年级1班')
      expect(generateClassName('初二', 3)).toBe('初二3班')
      expect(generateClassName('高一', 5)).toBe('高一5班')
    })

    it('should throw for invalid grade', () => {
      expect(() => generateClassName('七年级', 1)).toThrow()
      expect(() => generateClassName('', 1)).toThrow()
    })

    it('should throw for invalid classNo', () => {
      expect(() => generateClassName('五年级', 0)).toThrow()
      expect(() => generateClassName('五年级', 100)).toThrow()
      expect(() => generateClassName('五年级', 1.5)).toThrow()
    })
  })

  describe('parseClassName', () => {
    it('should parse standard class name', () => {
      expect(parseClassName('五年级1班')).toEqual({ grade: '五年级', classNo: 1 })
      expect(parseClassName('初二3班')).toEqual({ grade: '初二', classNo: 3 })
      expect(parseClassName('高一5班')).toEqual({ grade: '高一', classNo: 5 })
    })

    it('should return null for invalid', () => {
      expect(parseClassName('5年级1班')).toBeNull()
      expect(parseClassName('五年级')).toBeNull()
      expect(parseClassName('')).toBeNull()
      expect(parseClassName(null as any)).toBeNull()
    })
  })

  describe('isSubject', () => {
    it('should return true for valid subjects', () => {
      expect(isSubject('语文')).toBe(true)
      expect(isSubject('数学')).toBe(true)
      expect(isSubject('英语')).toBe(true)
      expect(isSubject('体育')).toBe(true)
      expect(isSubject('综合实践')).toBe(true)
    })

    it('should return false for invalid', () => {
      expect(isSubject('编程')).toBe(false)
      expect(isSubject('')).toBe(false)
      expect(isSubject(null as any)).toBe(false)
    })
  })

  describe('getSubjectByValue', () => {
    it('should return SubjectOption for valid value', () => {
      const subject = getSubjectByValue('语文')
      expect(subject).toBeDefined()
      expect(subject?.label).toBe('语文')
      expect(subject?.value).toBe('语文')
      expect(subject?.icon).toBe('📜')
    })

    it('should return undefined for invalid', () => {
      expect(getSubjectByValue('编程')).toBeUndefined()
      expect(getSubjectByValue('')).toBeUndefined()
    })
  })

  describe('isRole', () => {
    it('should return true for valid roles', () => {
      expect(isRole('super')).toBe(true)
      expect(isRole('school_admin')).toBe(true)
      expect(isRole('teacher')).toBe(true)
      expect(isRole('parent')).toBe(true)
    })

    it('should return false for invalid', () => {
      expect(isRole('admin')).toBe(false)
      expect(isRole('student')).toBe(false)
      expect(isRole('')).toBe(false)
      expect(isRole(null as any)).toBe(false)
    })
  })

  describe('hasFeature', () => {
    it('should return true for empty features (all allowed)', () => {
      expect(hasFeature([], 'exams')).toBe(true)
      expect(hasFeature(null as any, 'exams')).toBe(true)
      expect(hasFeature(undefined as any, 'exams')).toBe(true)
    })

    it('should check feature in array', () => {
      expect(hasFeature(['exams', 'grades'], 'exams')).toBe(true)
      expect(hasFeature(['exams', 'grades'], 'homework')).toBe(false)
    })
  })

  describe('isGrade', () => {
    it('should return true for valid grades', () => {
      expect(isGrade('一年级')).toBe(true)
      expect(isGrade('六年级')).toBe(true)
      expect(isGrade('初一')).toBe(true)
      expect(isGrade('初三')).toBe(true)
      expect(isGrade('高一')).toBe(true)
      expect(isGrade('高三')).toBe(true)
    })

    it('should return false for invalid', () => {
      expect(isGrade('七年级')).toBe(false)
      expect(isGrade('')).toBe(false)
      expect(isGrade(null as any)).toBe(false)
    })
  })

  describe('isScore', () => {
    it('should validate 0-100 by default', () => {
      expect(isScore(0)).toBe(true)
      expect(isScore(100)).toBe(true)
      expect(isScore(50)).toBe(true)
      expect(isScore(-1)).toBe(false)
      expect(isScore(101)).toBe(false)
      expect(isScore('80')).toBe(true)
      expect(isScore('abc')).toBe(false)
    })

    it('should validate custom max', () => {
      expect(isScore(150, 150)).toBe(true)
      expect(isScore(151, 150)).toBe(false)
    })
  })

  describe('isNonEmpty', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmpty('hello')).toBe(true)
      expect(isNonEmpty('  hello  ')).toBe(true)
    })

    it('should return false for empty/whitespace/null/undefined', () => {
      expect(isNonEmpty('')).toBe(false)
      expect(isNonEmpty('   ')).toBe(false)
      expect(isNonEmpty(null as any)).toBe(false)
      expect(isNonEmpty(undefined as any)).toBe(false)
    })
  })

  describe('isStudentNo', () => {
    it('should return true for valid student numbers', () => {
      expect(isStudentNo('A123')).toBe(true)
      expect(isStudentNo('20230001')).toBe(true)
      expect(isStudentNo('STU001')).toBe(true)
    })

    it('should return true for empty (optional)', () => {
      expect(isStudentNo('')).toBe(true)
      expect(isStudentNo(null as any)).toBe(true)
      expect(isStudentNo(undefined as any)).toBe(true)
    })

    it('should return false for invalid', () => {
      expect(isStudentNo('A')).toBe(false) // too short
      expect(isStudentNo('A'.repeat(33))).toBe(false) // too long
      expect(isStudentNo('A@123')).toBe(false) // special char
    })
  })

  describe('isAmount', () => {
    it('should return true for valid amounts', () => {
      expect(isAmount(100)).toBe(true)
      expect(isAmount('100.50')).toBe(true)
      expect(isAmount(0.01)).toBe(true)
      expect(isAmount('999999.99')).toBe(true)
    })

    it('should return false for invalid', () => {
      expect(isAmount(0)).toBe(false)
      expect(isAmount(-10)).toBe(false)
      expect(isAmount('100.001')).toBe(false) // more than 2 decimals
      expect(isAmount('abc')).toBe(false)
      expect(isAmount('')).toBe(false)
    })
  })

  describe('isUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isUrl('http://example.com')).toBe(true)
      expect(isUrl('https://example.com/path')).toBe(true)
      expect(isUrl('http://localhost:3000')).toBe(true)
    })

    it('should return true for empty (optional)', () => {
      expect(isUrl('')).toBe(true)
      expect(isUrl(null as any)).toBe(true)
      expect(isUrl(undefined as any)).toBe(true)
    })

    it('should return false for invalid', () => {
      expect(isUrl('ftp://example.com')).toBe(false)
      expect(isUrl('not-a-url')).toBe(false)
    })
  })

  describe('isDateStr', () => {
    it('should return true for YYYY-MM-DD', () => {
      expect(isDateStr('2024-01-15')).toBe(true)
      expect(isDateStr('2024-12-31')).toBe(true)
    })

    it('should return true for empty', () => {
      expect(isDateStr('')).toBe(true)
      expect(isDateStr(null as any)).toBe(true)
    })

    it('should return false for invalid', () => {
      expect(isDateStr('2024/01/15')).toBe(false)
      expect(isDateStr('15-01-2024')).toBe(false)
      expect(isDateStr('2024-13-01')).toBe(true) // format only, not logical
    })
  })

  describe('clip', () => {
    it('should truncate long strings', () => {
      expect(clip('hello world', 5)).toBe('hello')
      expect(clip('abc', 10)).toBe('abc')
    })

    it('should handle null/undefined', () => {
      expect(clip(null as any, 5)).toBe('')
      expect(clip(undefined as any, 5)).toBe('')
    })
  })

  describe('MAX_LEN', () => {
    it('should have expected constants', () => {
      expect(MAX_LEN.NAME).toBe(50)
      expect(MAX_LEN.TITLE).toBe(100)
      expect(MAX_LEN.PHONE).toBe(11)
      expect(MAX_LEN.STUDENT_NO).toBe(32)
      expect(MAX_LEN.EMAIL).toBe(100)
      expect(MAX_LEN.PASSWORD).toBe(64)
    })
  })

  describe('re-exported constants', () => {
    it('should re-export PHONE_REGEX', () => {
      expect(PHONE_REGEX).toBeInstanceOf(RegExp)
      expect(PHONE_REGEX.test('13812345678')).toBe(true)
    })

    it('should re-export PHONE_HINT', () => {
      expect(typeof PHONE_HINT).toBe('string')
      expect(PHONE_HINT.length).toBeGreaterThan(0)
    })

    it('should re-export CLASS_NAMING_RULE', () => {
      expect(CLASS_NAMING_RULE).toHaveProperty('pattern')
      expect(CLASS_NAMING_RULE).toHaveProperty('example')
      expect(CLASS_NAMING_RULE).toHaveProperty('description')
    })
  })
})