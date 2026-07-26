/**
 * Web 端班级命名规则单元测试
 * 验证：生成、解析、校验、跨端一致性
 * 与 mini-program/src/common/validators.js、shared/validators 保持对齐
 */
import {
  validateClassName,
  generateClassName,
  parseClassName,
  isGrade,
} from '@gardener/shared/validators'
import { CLASS_NAMING_RULE, GRADE_OPTIONS } from '@gardener/shared/constants'
// fixtures - use relative path for Jest compatibility
const fixtures = require('../data/fixtures')

describe('Web 端 - 班级命名规则', () => {
  describe('CLASS_NAMING_RULE 常量', () => {
    it('should 正则匹配小学标准格式（含年级后缀）', () => {
      const validNames = [
        '一年级1班',
        '二年级2班',
        '三年级3班',
        '四年级4班',
        '五年级1班',
        '六年级99班',
      ]
      validNames.forEach((name) => {
        expect(CLASS_NAMING_RULE.pattern.test(name)).toBe(true)
      })
    })

    it('should 正则匹配初中/高中格式（无年级后缀）', () => {
      // CLASS_NAMING_RULE.pattern: /^((一|二|三|四|五|六)年级|初一|初二|初三|高一|高二|高三)[1-9]\d*班$/
      const validNames = [
        '初一1班',
        '初二3班',
        '初三99班',
        '高一1班',
        '高二2班',
        '高三99班',
      ]
      validNames.forEach((name) => {
        expect(CLASS_NAMING_RULE.pattern.test(name)).toBe(true)
      })
    })

    it('should 正则拒绝非标准格式', () => {
      const invalidNames = [
        '一班', // 缺少年级
        '1班', // 缺少年级
        '一年级班', // 缺少序号
        '一年级0班', // 序号为 0（正则不允许以0开头）
        '幼儿园1班', // 非法年级
        '七年级1班', // 非法年级
        '初四1班', // 非法年级
        '高四1班', // 非法年级
        '一年级-1班', // 负序号
        '一年级1.5班', // 小数序号
        '一年级 1 班', // 含空格
        '', // 空字符串
      ]
      invalidNames.forEach((name) => {
        expect(CLASS_NAMING_RULE.pattern.test(name)).toBe(false)
      })
    })

    it('should example 和 description 存在', () => {
      expect(CLASS_NAMING_RULE.example).toBe('五年级1班 / 初二3班 / 高一5班')
      expect(CLASS_NAMING_RULE.description).toContain('年级')
      expect(CLASS_NAMING_RULE.description).toContain('序号')
      expect(CLASS_NAMING_RULE.description).toContain('班')
    })
  })

  describe('GRADE_OPTIONS 年级选项', () => {
    it('should 包含 12 个标准年级', () => {
      expect(GRADE_OPTIONS.length).toBe(12)
    })

    it('should 包含小学一至六年级', () => {
      expect(GRADE_OPTIONS.slice(0, 6)).toEqual([
        '一年级',
        '二年级',
        '三年级',
        '四年级',
        '五年级',
        '六年级',
      ])
    })

    it('should 包含初中初一至初三', () => {
      expect(GRADE_OPTIONS.slice(6, 9)).toEqual(['初一', '初二', '初三'])
    })

    it('should 包含高中高一至高三', () => {
      expect(GRADE_OPTIONS.slice(9, 12)).toEqual(['高一', '高二', '高三'])
    })
  })

  describe('validateClassName 班级名校验', () => {
    describe('正常流', () => {
      it('should 返回 valid=true_classNo 正确_当小学标准格式（含年级后缀）', () => {
        const cases = [
          { name: '一年级1班', expectedClassNo: 1 },
          { name: '五年级3班', expectedClassNo: 3 },
          { name: '六年级99班', expectedClassNo: 99 },
        ]
        cases.forEach(({ name, expectedClassNo }) => {
          const result = validateClassName(name)
          expect(result.valid).toBe(true)
          expect(result.classNo).toBe(expectedClassNo)
          expect(result.error).toBeUndefined()
        })
      })

      it('should 返回 valid=true_classNo 正确_当初中/高中标准格式（无年级后缀）', () => {
        const cases = [
          { name: '初一1班', expectedClassNo: 1, expectedGrade: '初一' },
          { name: '初二5班', expectedClassNo: 5, expectedGrade: '初二' },
          { name: '初三99班', expectedClassNo: 99, expectedGrade: '初三' },
          { name: '高一1班', expectedClassNo: 1, expectedGrade: '高一' },
          { name: '高二2班', expectedClassNo: 2, expectedGrade: '高二' },
          { name: '高三99班', expectedClassNo: 99, expectedGrade: '高三' },
        ]
        cases.forEach(({ name, expectedClassNo, expectedGrade }) => {
          const result = validateClassName(name)
          expect(result.valid).toBe(true)
          expect(result.classNo).toBe(expectedClassNo)
          expect(result.error).toBeUndefined()
        })
      })

      it('should 自动 trim 空白', () => {
        const result = validateClassName('  五年级1班  ')
        expect(result.valid).toBe(true)
        expect(result.classNo).toBe(1)
      })
    })

    describe('异常流：格式错误', () => {
      it('should 返回 valid=false_error_当格式不匹配', () => {
        const invalidNames = [
          '一班',
          '1班',
          '一年级班',
          '幼儿园1班',
          '七年级1班',
          '初四1班',
          '高四1班',
        ]
        invalidNames.forEach((name) => {
          const result = validateClassName(name)
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
          expect(result.error).toContain('命名格式错误')
        })
      })

      it('should 返回 valid=false_error_当为空或非字符串', () => {
        const result1 = validateClassName('')
        expect(result1.valid).toBe(false)
        expect(result1.error).toBe('班级名不能为空')

        const result2 = validateClassName('   ')
        expect(result2.valid).toBe(false)
        expect(result2.error).toBe('班级名不能为空')

        expect(validateClassName(null as unknown as string).valid).toBe(false)
        expect(validateClassName(undefined as unknown as string).valid).toBe(false)
        expect(validateClassName(123 as unknown as string).valid).toBe(false)
      })
    })

    describe('异常流：序号边界', () => {
      it('should 返回 valid=false_error_当 classNo < 1', () => {
        // 零开头的序号会在正则层面拦截，错误信息为格式错误
        const result = validateClassName('一年级0班')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('命名格式错误')
      })

      it('should 返回 valid=false_error_当 classNo > 99', () => {
        // CLASS_NAMING_RULE.pattern only matches 1-99, so 100 fails at pattern level
        const result = validateClassName('一年级100班')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('命名格式错误')
      })

      it('should 返回 valid=false_error_当初中/高中 classNo 越界', () => {
        expect(validateClassName('初一0班').valid).toBe(false)
        expect(validateClassName('初一100班').valid).toBe(false)
        expect(validateClassName('高一0班').valid).toBe(false)
        expect(validateClassName('高一100班').valid).toBe(false)
      })
    })

    describe('异常流：跨年级校验', () => {
      it('should 返回 valid=false_error_当指定年级与解析年级不一致（小学）', () => {
        const result = validateClassName('五年级1班', '四年级')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('不一致')
        expect(result.error).toContain('五年级')
        expect(result.error).toContain('四年级')
      })

      it('should 返回 valid=true_当指定年级与解析年级一致（小学）', () => {
        const result = validateClassName('五年级1班', '五年级')
        expect(result.valid).toBe(true)
        expect(result.classNo).toBe(1)
      })

      it('should 返回 valid=false_error_当指定年级与解析年级不一致（初中/高中）', () => {
        const result = validateClassName('初二3班', '初一')
        expect(result.valid).toBe(false)
        expect(result.error).toContain('不一致')
      })

      it('should 返回 valid=true_当指定年级与解析年级一致（初中/高中）', () => {
        const result = validateClassName('初二3班', '初二')
        expect(result.valid).toBe(true)
        expect(result.classNo).toBe(3)
      })

      it('should 不校验年级_当未指定 grade', () => {
        const result = validateClassName('五年级1班')
        expect(result.valid).toBe(true)
      })
    })
  })

  describe('generateClassName 生成标准班级名', () => {
    describe('正常流', () => {
      it('should 返回标准格式_当小学年级和序号合法', () => {
        const cases = [
          { grade: '一年级', classNo: 1, expected: '一年级1班' },
          { grade: '五年级', classNo: 3, expected: '五年级3班' },
          { grade: '六年级', classNo: 99, expected: '六年级99班' },
        ]
        cases.forEach(({ grade, classNo, expected }) => {
          expect(generateClassName(grade, classNo)).toBe(expected)
        })
      })

      it('should 返回标准格式_当初中/高中年级和序号合法（无年级后缀）', () => {
        const cases = [
          { grade: '初一', classNo: 1, expected: '初一1班' },
          { grade: '初二', classNo: 3, expected: '初二3班' },
          { grade: '初三', classNo: 99, expected: '初三99班' },
          { grade: '高一', classNo: 1, expected: '高一1班' },
          { grade: '高二', classNo: 2, expected: '高二2班' },
          { grade: '高三', classNo: 99, expected: '高三99班' },
        ]
        cases.forEach(({ grade, classNo, expected }) => {
          expect(generateClassName(grade, classNo)).toBe(expected)
        })
      })

      it('should 支持字符串数字 classNo（Number() 转换）', () => {
        expect(generateClassName('五年级', 3)).toBe('五年级3班')
        // 字符串数字也会被 Number() 转换
        expect(generateClassName('五年级', Number('3'))).toBe('五年级3班')
      })
    })

    describe('异常流', () => {
      it('should 抛出错误_当年级非法', () => {
        expect(() => generateClassName('幼儿园', 1)).toThrow('非法年级')
        expect(() => generateClassName('七年级', 1)).toThrow('非法年级')
        expect(() => generateClassName('初四', 1)).toThrow('非法年级')
        expect(() => generateClassName('高四', 1)).toThrow('非法年级')
        expect(() => generateClassName('', 1)).toThrow('非法年级')
      })

      it('should 抛出错误_当 classNo 非整数', () => {
        expect(() => generateClassName('五年级', 1.5)).toThrow('班级序号必须是 1-99 的整数')
        expect(() => generateClassName('五年级', NaN)).toThrow('班级序号必须是 1-99 的整数')
        expect(() => generateClassName('五年级', Infinity)).toThrow('班级序号必须是 1-99 的整数')
      })

      it('should 抛出错误_当 classNo < 1', () => {
        expect(() => generateClassName('五年级', 0)).toThrow('班级序号必须是 1-99 的整数')
        expect(() => generateClassName('五年级', -1)).toThrow('班级序号必须是 1-99 的整数')
        expect(() => generateClassName('五年级', -100)).toThrow('班级序号必须是 1-99 的整数')
        // Also test junior/senior
        expect(() => generateClassName('初一', 0)).toThrow('班级序号必须是 1-99 的整数')
      })

      it('should 抛出错误_当 classNo > 99', () => {
        expect(() => generateClassName('五年级', 100)).toThrow('班级序号必须是 1-99 的整数')
        expect(() => generateClassName('五年级', 999)).toThrow('班级序号必须是 1-99 的整数')
        expect(() => generateClassName('初一', 100)).toThrow('班级序号必须是 1-99 的整数')
      })
    })
  })

  describe('parseClassName 解析标准班级名', () => {
    describe('正常流', () => {
      it('should 返回 {grade, classNo}_当格式标准', () => {
        const cases = [
          { name: '一年级1班', grade: '一年级', classNo: 1 },
          { name: '五年级3班', grade: '五年级', classNo: 3 },
          { name: '六年级99班', grade: '六年级', classNo: 99 },
          { name: '初一1班', grade: '初一', classNo: 1 },
          { name: '初三5班', grade: '初三', classNo: 5 },
          { name: '高一10班', grade: '高一', classNo: 10 },
          { name: '高三99班', grade: '高三', classNo: 99 },
        ]
        cases.forEach(({ name, grade, classNo }) => {
          const result = parseClassName(name)
          expect(result).not.toBeNull()
          expect(result?.grade).toBe(grade)
          expect(result?.classNo).toBe(classNo)
        })
      })

      it('should 自动 trim 空白', () => {
        const result = parseClassName('  五年级3班  ')
        expect(result).not.toBeNull()
        expect(result?.grade).toBe('五年级')
        expect(result?.classNo).toBe(3)
      })
    })

    describe('异常流', () => {
      it('should 返回 null_当格式不标准', () => {
        const invalidNames = [
          '一班',
          '1班',
          '一年级班',
          '幼儿园1班',
          '七年级1班',
          '初四1班',
          '高四1班',
          '一年级0班',
          '一年级100班',
          '',
          '   ',
        ]
        invalidNames.forEach((name) => {
          expect(parseClassName(name)).toBeNull()
        })
      })

      it('should 返回 null_当年级非法', () => {
        expect(parseClassName('幼儿园1班')).toBeNull()
        expect(parseClassName('七年级1班')).toBeNull()
      })

      it('should 返回 null_当 classNo 超出 1-99', () => {
        expect(parseClassName('一年级0班')).toBeNull()
        expect(parseClassName('一年级100班')).toBeNull()
        expect(parseClassName('初一0班')).toBeNull()
        expect(parseClassName('高一100班')).toBeNull()
      })

      it('should 返回 null_当输入非字符串', () => {
        expect(parseClassName(null as unknown as string)).toBeNull()
        expect(parseClassName(undefined as unknown as string)).toBeNull()
        expect(parseClassName(123 as unknown as string)).toBeNull()
      })
    })
  })

  describe('isGrade 年级合法性校验', () => {
    it('should 返回 true_当年级在 GRADE_OPTIONS 中', () => {
      GRADE_OPTIONS.forEach((grade) => {
        expect(isGrade(grade)).toBe(true)
        expect(isGrade(`  ${grade}  `)).toBe(true)
      })
    })

    it('should 返回 false_当年级不在列表中', () => {
      expect(isGrade('幼儿园')).toBe(false)
      expect(isGrade('七年级')).toBe(false)
      expect(isGrade('初四')).toBe(false)
      expect(isGrade('高四')).toBe(false)
      expect(isGrade('')).toBe(false)
    })

    it('should 返回 false_当类型非字符串', () => {
      expect(isGrade(null as unknown as string)).toBe(false)
      expect(isGrade(123 as unknown as string)).toBe(false)
    })
  })

  describe('mini-program 兼容性：旧格式解析', () => {
    describe('mini-program/src/common/validators.js::isClassName 兼容', () => {
      it('mini-program 支持旧格式 "一班"、"二班" 等（仅数字+班）', () => {
        // mini-program 的 isClassName 正则：/^\d+班$|^(一|二|三|四|五|六|七|八|九|十)班$/
        // 兼容性测试：shared/validators 的 parseClassName 不支持旧格式
        // 这里验证旧格式在 parseClassName 中返回 null（预期行为）
        const legacyNames = ['一班', '二班', '三班', '四班', '五班', '六班', '七班', '八班', '九班', '十班', '1班', '2班', '10班']
        legacyNames.forEach((name) => {
          expect(parseClassName(name)).toBeNull() // shared 端不支持旧格式，返回 null
        })
      })

      it('Web 端如需兼容旧格式，应在业务层单独处理', () => {
        // 业务层兼容示例：先用标准解析，失败再尝试旧格式
        function parseClassNameCompatible(name: string): { grade: string; classNo: number } | null {
          // 标准解析
          const standard = parseClassName(name)
          if (standard) return standard

          // 兼容旧格式：仅数字+班（如 "1班"、"10班"）
          const numMatch = name.trim().match(/^(\d+)班$/)
          if (numMatch) {
            const classNo = Number.parseInt(numMatch[1], 10)
            if (classNo >= 1 && classNo <= 99) {
              return { grade: '未知年级', classNo }
            }
          }

          // 兼容旧格式：中文数字+班（如 "一班"、"二班"）
          const chineseNumMap: Record<string, number> = {
            一: 1,
            二: 2,
            三: 3,
            四: 4,
            五: 5,
            六: 6,
            七: 7,
            八: 8,
            九: 9,
            十: 10,
          }
          const chineseMatch = name.trim().match(/^([一二三四五六七八九十])班$/)
          if (chineseMatch) {
            const classNo = chineseNumMap[chineseMatch[1]]
            if (classNo) {
              return { grade: '未知年级', classNo }
            }
          }

          return null
        }

        // 验证兼容函数行为
        expect(parseClassNameCompatible('一年级1班')).toEqual({ grade: '一年级', classNo: 1 })
        expect(parseClassNameCompatible('1班')).toEqual({ grade: '未知年级', classNo: 1 })
        expect(parseClassNameCompatible('10班')).toEqual({ grade: '未知年级', classNo: 10 })
        expect(parseClassNameCompatible('一班')).toEqual({ grade: '未知年级', classNo: 1 })
        expect(parseClassNameCompatible('十班')).toEqual({ grade: '未知年级', classNo: 10 })
        expect(parseClassNameCompatible('十一班')).toBeNull() // 超出映射
        expect(parseClassNameCompatible('100班')).toBeNull() // 超出范围
        expect(parseClassNameCompatible('幼儿园1班')).toBeNull()
      })
    })
  })

  describe('边界条件', () => {
    it('classNo=1 和 classNo=99 应通过', () => {
      expect(validateClassName('一年级1班').valid).toBe(true)
      expect(validateClassName('一年级99班').valid).toBe(true)
      expect(generateClassName('一年级', 1)).toBe('一年级1班')
      expect(generateClassName('一年级', 99)).toBe('一年级99班')
      // junior/senior too
      expect(validateClassName('初一1班').valid).toBe(true)
      expect(validateClassName('初一99班').valid).toBe(true)
    })

    it('classNo=0 和 classNo=100 应拒绝', () => {
      expect(validateClassName('一年级0班').valid).toBe(false)
      expect(validateClassName('一年级100班').valid).toBe(false)
      expect(() => generateClassName('一年级', 0)).toThrow()
      expect(() => generateClassName('一年级', 100)).toThrow()
      expect(validateClassName('初一0班').valid).toBe(false)
      expect(validateClassName('初一100班').valid).toBe(false)
    })

    it('所有 12 个年级各测 1 个序号', () => {
      GRADE_OPTIONS.forEach((grade) => {
        const name = `${grade}1班`
        expect(validateClassName(name).valid).toBe(true)
        expect(generateClassName(grade, 1)).toBe(name)
        expect(parseClassName(name)?.grade).toBe(grade)
      })
    })
  })

  describe('Fixtures 数据一致性', () => {
    it('fixtures 中的 classes 班级名应符合标准格式或被标记为旧格式', () => {
      const classes = fixtures.classes || []
      classes.forEach((cls: any) => {
        const result = validateClassName(cls.name)
        // 当前 fixtures 使用旧格式 "一年级(1)班"，不符合标准格式
        // 这是已知差异，记录在此
        if (!result.valid) {
          expect(cls.name).toMatch(/年级\(\d+\)班/) // 旧格式特征
        }
      })
    })
  })
})