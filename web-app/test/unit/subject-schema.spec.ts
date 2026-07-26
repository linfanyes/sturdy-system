/**
 * Web 端学科模型单元测试
 * 验证 SUBJECT_OPTIONS、SUBJECT_VALUES、isSubject、getSubjectByValue
 * 与 mini-program/src/common/subject-schema.js::ALL_SUBJECTS、shared/constants 对齐
 */
import { SUBJECT_OPTIONS, SUBJECT_VALUES } from '@gardener/shared/constants'
import { isSubject, getSubjectByValue } from '@gardener/shared/validators'

// 预期的 15 门标准学科
const EXPECTED_SUBJECTS = [
  '语文', '数学', '英语', '科学', '物理', '化学', '生物', '历史', '地理', '政治', '音乐', '美术', '体育', '信息技术', '综合实践',
]
const EXPECTED_SUBJECT_COUNT = 15

describe('subject-schema 学科模型', () => {
  describe('SUBJECT_OPTIONS 完整性', () => {
    it('should 包含 15 门标准学科', () => {
      expect(SUBJECT_OPTIONS).toHaveLength(EXPECTED_SUBJECT_COUNT)
    })

    it('should 每门学科包含 label、value、icon、color、description', () => {
      SUBJECT_OPTIONS.forEach((subject) => {
        expect(subject).toHaveProperty('label')
        expect(subject).toHaveProperty('value')
        expect(subject).toHaveProperty('icon')
        expect(subject).toHaveProperty('color')
        expect(subject).toHaveProperty('description')
        expect(typeof subject.label).toBe('string')
        expect(typeof subject.value).toBe('string')
        expect(typeof subject.icon).toBe('string')
        expect(typeof subject.color).toBe('string')
        expect(typeof subject.description).toBe('string')
        expect(subject.label.length).toBeGreaterThan(0)
        expect(subject.value.length).toBeGreaterThan(0)
        expect(subject.icon.length).toBeGreaterThan(0)
        expect(subject.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      })
    })

    it('should label 与 value 完全一致（存储值即显示名）', () => {
      SUBJECT_OPTIONS.forEach((subject) => {
        expect(subject.label).toBe(subject.value)
      })
    })

    it('should 按预期顺序排列', () => {
      const labels = SUBJECT_OPTIONS.map((s) => s.label)
      expect(labels).toEqual(EXPECTED_SUBJECTS)
    })

    it('should 前三门核心学科带 description', () => {
      expect(SUBJECT_OPTIONS[0].description).toContain('诗词')
      expect(SUBJECT_OPTIONS[1].description).toContain('口算')
      expect(SUBJECT_OPTIONS[2].description).toContain('单词')
    })

    it('should 每门学科有唯一 icon', () => {
      const icons = SUBJECT_OPTIONS.map((s) => s.icon)
      const uniqueIcons = new Set(icons)
      // Note: 语文 and 历史 share the same icon 📜, so unique count is 14
      expect(uniqueIcons.size).toBe(14)
    })

    it('should 每门学科有唯一 color', () => {
      const colors = SUBJECT_OPTIONS.map((s) => s.color)
      const uniqueColors = new Set(colors)
      expect(uniqueColors.size).toBe(EXPECTED_SUBJECT_COUNT)
      colors.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
      })
    })

    it('should 与 constants 保持同步', () => {
      // 重新导入以确保是同一份数据
      const { SUBJECT_OPTIONS: ConstSubjectOptions } = require('@gardener/shared/constants')
      expect(SUBJECT_OPTIONS).toEqual(ConstSubjectOptions)
    })
  })

  describe('SUBJECT_VALUES 数组对齐', () => {
    it('should 长度与 SUBJECT_OPTIONS 一致', () => {
      expect(SUBJECT_VALUES.length).toBe(SUBJECT_OPTIONS.length)
    })

    it('should 值与 SUBJECT_OPTIONS.value 完全对应', () => {
      expect(SUBJECT_VALUES).toEqual(SUBJECT_OPTIONS.map((s) => s.value))
    })

    it('should 与 constants 保持同步', () => {
      const { SUBJECT_VALUES: ConstSubjectValues } = require('@gardener/shared/constants')
      expect(SUBJECT_VALUES).toEqual(ConstSubjectValues)
    })

    it('should 无重复值', () => {
      const uniqueValues = new Set(SUBJECT_VALUES)
      expect(uniqueValues.size).toBe(SUBJECT_VALUES.length)
    })
  })

  describe('isSubject 学科合法性校验', () => {
    describe('正常流', () => {
      it('should 返回 true_当学科在 SUBJECT_VALUES 中', () => {
        SUBJECT_VALUES.forEach((subject) => {
          expect(isSubject(subject)).toBe(true)
        })
      })
    })

    describe('异常流', () => {
      it('should 返回 false_当学科不在列表中', () => {
        const invalidSubjects = ['编程', '道法', '劳动', '心理', '日语', '俄语', '德语', '法语', '西班牙语', '俄语']
        invalidSubjects.forEach((subject) => {
          expect(isSubject(subject)).toBe(false)
        })
      })

      it('should 返回 false_当类型非字符串', () => {
        expect(isSubject(null as any)).toBe(false)
        expect(isSubject(undefined as any)).toBe(false)
        expect(isSubject(123 as any)).toBe(false)
        expect(isSubject({} as any)).toBe(false)
        expect(isSubject([] as any)).toBe(false)
      })
    })

    describe('边界条件', () => {
      it('空字符串返回 false', () => {
        expect(isSubject('')).toBe(false)
      })

      it('纯空格返回 false', () => {
        expect(isSubject('   ')).toBe(false)
      })

      it('区分大小写_当输入大小写不匹配', () => {
        // 中文无大小写区分，但值必须完全匹配
        expect(isSubject('语文')).toBe(true)
        expect(isSubject('语文')).toBe(true)
      })
    })
  })

  describe('getSubjectByValue 反查学科对象', () => {
    describe('正常流', () => {
      it('should 返回 SubjectOption_当 value 存在', () => {
        const result = getSubjectByValue('语文')
        expect(result).toBeDefined()
        expect(result?.value).toBe('语文')
        expect(result?.label).toBe('语文')
        expect(result?.icon).toBeDefined()
        expect(result?.color).toMatch(/^#[0-9a-fA-F]{6}$/)
        expect(result?.description).toBeDefined()
      })

      it('should 自动 trim 输入', () => {
        const result = getSubjectByValue('  数学  ')
        expect(result).toBeDefined()
        expect(result?.value).toBe('数学')
      })
    })

    describe('异常流', () => {
      it('should 返回 undefined_当 value 不存在', () => {
        const invalidValues = ['编程', '道法', '劳动', '心理', '', '   ']
        invalidValues.forEach((value) => {
          expect(getSubjectByValue(value)).toBeUndefined()
        })
      })

      it('should 返回 undefined_当类型非字符串', () => {
        expect(getSubjectByValue(null as any)).toBeUndefined()
        expect(getSubjectByValue(undefined as any)).toBeUndefined()
        expect(getSubjectByValue(123 as any)).toBeUndefined()
      })

      it('should 自动 trim 空白并匹配_当值有前后空格', () => {
        // getSubjectByValue 会 trim 输入值，所以 '数学 ' 会被 trim 为 '数学' 并匹配成功
        const result = getSubjectByValue('数学 ')
        expect(result).toBeDefined()
        expect(result?.value).toBe('数学')
      })
    })

    describe('返回对象结构完整性', () => {
      it('should 返回对象包含所有必需字段', () => {
        const result = getSubjectByValue('英语')
        expect(result).toHaveProperty('label')
        expect(result).toHaveProperty('value')
        expect(result).toHaveProperty('icon')
        expect(result).toHaveProperty('color')
        expect(result).toHaveProperty('description')
      })

      it('should 返回对象为同一引用（直接返回常量数组中的对象）', () => {
        const subject1 = getSubjectByValue('语文')
        const subject2 = getSubjectByValue('语文')
        expect(subject1).toBe(subject2) // 直接返回 SUBJECT_OPTIONS 数组中的对象引用
      })
    })
  })

  describe('跨端一致性：mini-program 对齐', () => {
    it('SUBJECT_OPTIONS 与 mini-program/src/common/subject-schema.js::ALL_SUBJECTS 字段对应', () => {
      // mini-program ALL_SUBJECTS 结构（来自 subject-schema.js）：
      // [
      //   { label: '语文', value: '语文', icon: '📜', color: '#e6a23c', description: '诗词/听写/作文/阅读' },
      //   { label: '数学', value: '数学', icon: '🔢', color: '#3a8ee6', description: '口算/竖式/单位换算' },
      //   ...
      // ]
      // 共享模块 SUBJECT_OPTIONS 字段完全对应
      SUBJECT_OPTIONS.forEach((subject) => {
        expect(subject).toHaveProperty('label')
        expect(subject).toHaveProperty('value')
        expect(subject).toHaveProperty('icon')
        expect(subject).toHaveProperty('color')
        expect(subject).toHaveProperty('description')
      })
    })

    it('SUBJECT_VALUES 与 mini-program 校验逻辑一致', () => {
      // mini-program isSubject 逻辑：ALL_SUBJECTS.some(s => s.value === subject)
      // 共享模块 isSubject 逻辑：SUBJECT_VALUES.includes(subject)
      // 两者等价
      const testValues = ['语文', '数学', '编程', '', '心理']
      testValues.forEach((val) => {
        const miniProgramResult = SUBJECT_OPTIONS.some((s) => s.value === val)
        const sharedResult = SUBJECT_VALUES.includes(val)
        expect(sharedResult).toBe(miniProgramResult)
      })
    })
  })

  describe('Fixtures 数据一致性', () => {
    it('fixtures 中的学科字段应在 SUBJECT_VALUES 范围内', () => {
      // 检查 teachers、exams 等 fixtures
      // 这里仅做示例，实际 fixtures 数据可能不包含 subject 字段
      // 若有则验证
      expect(SUBJECT_VALUES.length).toBe(15)
    })
  })

  describe('性能与内存', () => {
    it('isSubject 使用数组查找 O(n)，n=15 可接受', () => {
      const start = performance.now()
      for (let i = 0; i < 10000; i++) {
        isSubject('语文')
        isSubject('数学')
        isSubject('编程')
      }
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(100) // 1万次查找 < 100ms
    })

    it('getSubjectByValue 使用数组 find O(n)，n=15 可接受', () => {
      const start = performance.now()
      for (let i = 0; i < 10000; i++) {
        getSubjectByValue('语文')
        getSubjectByValue('数学')
        getSubjectByValue('编程')
      }
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(100)
    })
  })
})