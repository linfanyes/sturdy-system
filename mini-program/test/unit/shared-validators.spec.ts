/**
 * 小程序端：共享校验器功能测试
 * 与 Web 端 shared-validators.spec.ts 保持用例语义一致
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
import { SUBJECT_OPTIONS, GRADE_OPTIONS, ROLE_OPTIONS, FEATURE_FLAGS } from '@gardener/shared/constants'

describe('shared validators - 手机号校验', () => {
  describe('isPhone (严格模式：不允许空)', () => {
    it('should return true for valid Chinese mobile numbers', () => {
      expect(isPhone('13812345678')).toBe(true)
      expect(isPhone('13900000000')).toBe(true)
      expect(isPhone('19912345678')).toBe(true)
      expect(isPhone('15500001111')).toBe(true)
    })

    it('should return false for invalid phone numbers', () => {
      expect(isPhone('12345678901')).toBe(false) // 第二位不在 3-9
      expect(isPhone('1381234567')).toBe(false) // 10 位
      expect(isPhone('138123456789')).toBe(false) // 12 位
      expect(isPhone('abc')).toBe(false)
      expect(isPhone('')).toBe(false)
      expect(isPhone(' ')).toBe(false)
    })

    it('should handle null/undefined', () => {
      expect(isPhone(null as any)).toBe(false)
      expect(isPhone(undefined as any)).toBe(false)
    })
  })

  describe('isValidPhone (宽松模式：允许空)', () => {
    it('should return true for valid phone numbers', () => {
      expect(isValidPhone('13812345678')).toBe(true)
      expect(isValidPhone('19900001111')).toBe(true)
    })

    it('should return true for empty/null/undefined', () => {
      expect(isValidPhone('')).toBe(true)
      expect(isValidPhone(null)).toBe(true)
      expect(isValidPhone(undefined)).toBe(true)
      expect(isValidPhone('   ')).toBe(true) // 纯空白视为空
    })

    it('should return false for invalid format', () => {
      expect(isValidPhone('12345678901')).toBe(false)
      expect(isValidPhone('abc')).toBe(false)
      expect(isValidPhone('1381234567')).toBe(false)
    })

    it('should trim whitespace before validation', () => {
      expect(isValidPhone(' 13812345678 ')).toBe(true)
      expect(isValidPhone('138-1234-5678')).toBe(false) // 包含横线不匹配严格正则
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
})

describe('shared validators - 班级命名校验', () => {
  describe('validateClassName', () => {
    it('should validate standard class names correctly for primary grades', () => {
      const result1 = validateClassName('一年级1班')
      expect(result1.valid).toBe(true)
      expect(result1.classNo).toBe(1)

      const result2 = validateClassName('五年级3班')
      expect(result2.valid).toBe(true)
      expect(result2.classNo).toBe(3)

      const result3 = validateClassName('六年级99班')
      expect(result3.valid).toBe(true)
      expect(result3.classNo).toBe(99)
    })

    it('should validate standard class names for junior/senior grades (no 年级 suffix)', () => {
      // Primary grades require "年级" suffix, but junior/senior grades do NOT
      const result1 = validateClassName('初一1班')
      expect(result1.valid).toBe(true)
      expect(result1.classNo).toBe(1)

      const result2 = validateClassName('初二5班')
      expect(result2.valid).toBe(true)
      expect(result2.classNo).toBe(5)

      const result3 = validateClassName('高一10班')
      expect(result3.valid).toBe(true)
      expect(result3.classNo).toBe(10)

      const result4 = validateClassName('高三99班')
      expect(result4.valid).toBe(true)
      expect(result4.classNo).toBe(99)
    })

    it('should reject invalid format', () => {
      expect(validateClassName('一年级一班').valid).toBe(false) // 中文序号
      expect(validateClassName('1班').valid).toBe(false) // 缺少年级
      expect(validateClassName('一年级').valid).toBe(false) // 缺少班
      expect(validateClassName('幼儿园1班').valid).toBe(false) // 非法年级
      expect(validateClassName('').valid).toBe(false)
      expect(validateClassName('   ').valid).toBe(false)
    })

    it('should enforce grade consistency when grade provided (primary grades)', () => {
      expect(validateClassName('五年级1班', '五年级').valid).toBe(true)
      expect(validateClassName('五年级1班', '六年级').valid).toBe(false)
    })

    it('should enforce grade consistency when grade provided for junior/senior (no 年级 suffix)', () => {
      expect(validateClassName('初二3班', '初二').valid).toBe(true)
      expect(validateClassName('初二3班', '初一').valid).toBe(false)
      expect(validateClassName('高一5班', '高一').valid).toBe(true)
      expect(validateClassName('高一5班', '高二').valid).toBe(false)
    })

    it('should enforce classNo range 1-99', () => {
      expect(validateClassName('一年级0班').valid).toBe(false)
      expect(validateClassName('一年级100班').valid).toBe(false)
      expect(validateClassName('一年级99班').valid).toBe(true)
    })

    it('should return error message on failure', () => {
      const result = validateClassName('一年级一班')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('格式错误')
    })
  })

  describe('generateClassName', () => {
    it('should generate standard class name from grade and classNo for primary grades', () => {
      expect(generateClassName('一年级', 1)).toBe('一年级1班')
      expect(generateClassName('五年级', 3)).toBe('五年级3班')
      expect(generateClassName('六年级', 10)).toBe('六年级10班')
    })

    it('should generate standard class name for junior/senior grades (no 年级 suffix)', () => {
      expect(generateClassName('初二', 5)).toBe('初二5班')
      expect(generateClassName('高三', 10)).toBe('高三10班')
    })

    it('should throw for invalid grade', () => {
      expect(() => generateClassName('幼儿园', 1)).toThrow('非法年级')
      expect(() => generateClassName('', 1)).toThrow()
    })

    it('should throw for invalid classNo', () => {
      expect(() => generateClassName('一年级', 0)).toThrow('班级序号必须是 1-99')
      expect(() => generateClassName('一年级', 100)).toThrow()
      expect(() => generateClassName('一年级', -1)).toThrow()
      expect(() => generateClassName('一年级', 1.5)).toThrow()
    })
  })

  describe('parseClassName', () => {
    it('should parse standard class name correctly for primary grades', () => {
      expect(parseClassName('一年级1班')).toEqual({ grade: '一年级', classNo: 1 })
      expect(parseClassName('五年级3班')).toEqual({ grade: '五年级', classNo: 3 })
      expect(parseClassName('六年级99班')).toEqual({ grade: '六年级', classNo: 99 })
    })

    it('should parse standard class name correctly for junior/senior grades (no 年级 suffix)', () => {
      expect(parseClassName('初一1班')).toEqual({ grade: '初一', classNo: 1 })
      expect(parseClassName('初三5班')).toEqual({ grade: '初三', classNo: 5 })
      expect(parseClassName('高一10班')).toEqual({ grade: '高一', classNo: 10 })
      expect(parseClassName('高三99班')).toEqual({ grade: '高三', classNo: 99 })
    })

    it('should return null for invalid format', () => {
      expect(parseClassName('一年级一班')).toBeNull()
      expect(parseClassName('1班')).toBeNull()
      expect(parseClassName('一年级')).toBeNull()
      expect(parseClassName('幼儿园1班')).toBeNull()
      expect(parseClassName('')).toBeNull()
      expect(parseClassName(null as any)).toBeNull()
    })

    it('should validate grade and classNo range', () => {
      expect(parseClassName('一年级0班')).toBeNull()
      expect(parseClassName('一年级100班')).toBeNull()
      expect(parseClassName('幼儿园1班')).toBeNull()
    })
  })
})

describe('shared validators - 学科校验', () => {
  describe('isSubject', () => {
    it('should return true for all 15 standard subjects', () => {
      SUBJECT_OPTIONS.forEach((subject) => {
        expect(isSubject(subject.value)).toBe(true)
      })
    })

    it('should return false for invalid subjects', () => {
      expect(isSubject('编程')).toBe(false)
      expect(isSubject('人工智能')).toBe(false)
      expect(isSubject('')).toBe(false)
      expect(isSubject('   ')).toBe(false)
    })

    it('should trim whitespace before validation', () => {
      expect(isSubject(' 语文 ')).toBe(true)
      expect(isSubject(' 数学 ')).toBe(true)
    })
  })

  describe('getSubjectByValue', () => {
    it('should return SubjectOption for valid subject value', () => {
      const chinese = getSubjectByValue('语文')
      expect(chinese).toBeDefined()
      expect(chinese?.label).toBe('语文')
      expect(chinese?.value).toBe('语文')
      expect(chinese?.icon).toBeDefined()
    })

    it('should return undefined for invalid/empty value', () => {
      expect(getSubjectByValue('')).toBeUndefined()
      expect(getSubjectByValue('编程')).toBeUndefined()
      expect(getSubjectByValue(null as any)).toBeUndefined()
    })

    it('should trim whitespace', () => {
      expect(getSubjectByValue(' 语文 ')).toBeDefined()
    })
  })
})

describe('shared validators - 角色与权限校验', () => {
  describe('isRole', () => {
    it('should return true for valid roles', () => {
      expect(isRole('super_admin')).toBe(true)
      expect(isRole('school_admin')).toBe(true)
      expect(isRole('teacher')).toBe(true)
      expect(isRole('parent')).toBe(true)
    })

    it('should return false for invalid roles', () => {
      expect(isRole('admin')).toBe(false)
      expect(isRole('student')).toBe(false)
      expect(isRole('')).toBe(false)
      expect(isRole('   ')).toBe(false)
    })
  })

  describe('hasFeature', () => {
    it('should return true for empty features array (allow all)', () => {
      expect(hasFeature([], 'exams')).toBe(true)
      expect(hasFeature([], 'anything')).toBe(true)
    })

    it('should return true when feature is present', () => {
      expect(hasFeature(['exams', 'grades'], 'exams')).toBe(true)
      expect(hasFeature(['exams', 'grades', 'homework'], 'grades')).toBe(true)
    })

    it('should return false when feature is missing', () => {
      expect(hasFeature(['exams'], 'grades')).toBe(false)
      expect(hasFeature(['homework'], 'exams')).toBe(false)
    })

    it('should handle non-array input', () => {
      expect(hasFeature(null as any, 'exams')).toBe(true) // null 视为空数组 = 全放行
      expect(hasFeature(undefined as any, 'exams')).toBe(true)
    })
  })
})

describe('shared validators - 年级、其他通用校验器', () => {
  describe('isGrade', () => {
    it('should return true for valid grades', () => {
      expect(isGrade('一年级')).toBe(true)
      expect(isGrade('六年级')).toBe(true)
      expect(isGrade('初一')).toBe(true)
      expect(isGrade('初三')).toBe(true)
      expect(isGrade('高一')).toBe(true)
      expect(isGrade('高三')).toBe(true)
    })

    it('should return false for invalid grades', () => {
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