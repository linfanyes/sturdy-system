/**
 * 共享常量导出验证测试
 * 验证 @gardener/shared/constants 导出完整且类型正确
 */
import {
  SUBJECT_OPTIONS,
  SUBJECT_VALUES,
  PHONE_REGEX,
  PHONE_HINT,
  CLASS_NAMING_RULE,
  GRADE_OPTIONS,
  ROLE_OPTIONS,
  ROLE_VALUES,
  FEATURE_FLAGS,
  FEATURE_FLAGS_SET,
} from '@gardener/shared/constants'

describe('shared constants export', () => {
  describe('SUBJECT_OPTIONS', () => {
    it('should export 15 subjects', () => {
      expect(SUBJECT_OPTIONS).toHaveLength(15)
    })

    it('each subject should have label, value, icon, color, description', () => {
      for (const subject of SUBJECT_OPTIONS) {
        expect(subject).toHaveProperty('label')
        expect(subject).toHaveProperty('value')
        expect(subject).toHaveProperty('icon')
        expect(subject).toHaveProperty('color')
        expect(subject).toHaveProperty('description')
        expect(typeof subject.label).toBe('string')
        expect(typeof subject.value).toBe('string')
        expect(subject.label.length).toBeGreaterThan(0)
        expect(subject.value.length).toBeGreaterThan(0)
      }
    })

    it('should contain all 15 standard subjects', () => {
      const expectedSubjects = [
        '语文', '数学', '英语', '科学', '物理', '化学', '生物',
        '政治', '历史', '地理', '音乐', '体育', '美术',
        '信息技术', '综合实践',
      ]
      const values = SUBJECT_OPTIONS.map((s) => s.value)
      for (const expected of expectedSubjects) {
        expect(values).toContain(expected)
      }
    })
  })

  describe('SUBJECT_VALUES', () => {
    it('should be array of subject values', () => {
      expect(Array.isArray(SUBJECT_VALUES)).toBe(true)
      expect(SUBJECT_VALUES.length).toBe(15)
      expect(SUBJECT_VALUES).toEqual(SUBJECT_OPTIONS.map((s) => s.value))
    })
  })

  describe('PHONE_REGEX', () => {
    it('should be RegExp matching Chinese mobile', () => {
      expect(PHONE_REGEX).toBeInstanceOf(RegExp)
      expect(PHONE_REGEX.test('13812345678')).toBe(true)
      expect(PHONE_REGEX.test('19999999999')).toBe(true)
      expect(PHONE_REGEX.test('12812345678')).toBe(false)
      expect(PHONE_REGEX.test('1381234567')).toBe(false)
      expect(PHONE_REGEX.test('138123456789')).toBe(false)
    })
  })

  describe('PHONE_HINT', () => {
    it('should be non-empty string', () => {
      expect(typeof PHONE_HINT).toBe('string')
      expect(PHONE_HINT.length).toBeGreaterThan(0)
    })
  })

  describe('CLASS_NAMING_RULE', () => {
    it('should have pattern, example, description', () => {
      expect(CLASS_NAMING_RULE).toHaveProperty('pattern')
      expect(CLASS_NAMING_RULE).toHaveProperty('example')
      expect(CLASS_NAMING_RULE).toHaveProperty('description')
      expect(CLASS_NAMING_RULE.pattern).toBeInstanceOf(RegExp)
    })

    it('pattern should match valid class names', () => {
      expect(CLASS_NAMING_RULE.pattern.test('五年级1班')).toBe(true)
      expect(CLASS_NAMING_RULE.pattern.test('初二3班')).toBe(true)
      expect(CLASS_NAMING_RULE.pattern.test('高一5班')).toBe(true)
      expect(CLASS_NAMING_RULE.pattern.test('一年级1班')).toBe(true)
      expect(CLASS_NAMING_RULE.pattern.test('六年级12班')).toBe(true)
    })

    it('pattern should reject invalid class names', () => {
      expect(CLASS_NAMING_RULE.pattern.test('5年级1班')).toBe(false)
      expect(CLASS_NAMING_RULE.pattern.test('五年级一班')).toBe(false)
      expect(CLASS_NAMING_RULE.pattern.test('五年级')).toBe(false)
      expect(CLASS_NAMING_RULE.pattern.test('五年级0班')).toBe(false)
    })
  })

  describe('GRADE_OPTIONS', () => {
    it('should contain 12 grades', () => {
      expect(GRADE_OPTIONS).toHaveLength(12)
    })

    it('should contain primary, junior, senior grades', () => {
      expect(GRADE_OPTIONS).toContain('一年级')
      expect(GRADE_OPTIONS).toContain('六年级')
      expect(GRADE_OPTIONS).toContain('初一')
      expect(GRADE_OPTIONS).toContain('初三')
      expect(GRADE_OPTIONS).toContain('高一')
      expect(GRADE_OPTIONS).toContain('高三')
    })
  })

  describe('ROLE_OPTIONS', () => {
    it('should have 4 roles', () => {
      expect(ROLE_OPTIONS).toHaveLength(4)
    })

    it('should have correct role values', () => {
      const values = ROLE_OPTIONS.map((r) => r.value)
      expect(values).toContain('super_admin')
      expect(values).toContain('school_admin')
      expect(values).toContain('teacher')
      expect(values).toContain('parent')
    })
  })

  describe('ROLE_VALUES', () => {
    it('should be array of role values', () => {
      expect(ROLE_VALUES).toEqual(ROLE_OPTIONS.map((r) => r.value))
    })
  })

  describe('FEATURE_FLAGS', () => {
    it('should contain key features', () => {
      expect(FEATURE_FLAGS).toContain('exams')
      expect(FEATURE_FLAGS).toContain('grades')
      expect(FEATURE_FLAGS).toContain('homework')
      expect(FEATURE_FLAGS).toContain('classes')
      expect(FEATURE_FLAGS).toContain('students')
    })
  })

  describe('FEATURE_FLAGS_SET', () => {
    it('should be Set for O(1) lookup', () => {
      expect(FEATURE_FLAGS_SET).toBeInstanceOf(Set)
      expect(FEATURE_FLAGS_SET.has('exams')).toBe(true)
      expect(FEATURE_FLAGS_SET.has('unknown')).toBe(false)
    })
  })
})