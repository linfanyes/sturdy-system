import {
  isPhone,
  isEmail,
  inRange,
  isInt,
  isScore,
  isNonEmpty,
  isStudentNo,
  isAmount,
  isUrl,
  isDateStr,
  clip,
  MAX_LEN,
} from '../src/common/validators'

describe('validators', () => {
  describe('isPhone', () => {
    it('正确手机号', () => {
      expect(isPhone('13812345678')).toBe(true)
      expect(isPhone('19900001111')).toBe(true)
    })
    it('兼容中间空格/横线', () => {
      expect(isPhone('138-1234-5678')).toBe(true)
      expect(isPhone('138 1234 5678')).toBe(true)
    })
    it('错误手机号', () => {
      expect(isPhone('12345678901')).toBe(false) // 第二位 2，不在 3-9
      expect(isPhone('1381234567')).toBe(false) // 10 位
      expect(isPhone('138123456789')).toBe(false) // 12 位
      expect(isPhone('abc')).toBe(false)
    })
    it('空值', () => {
      expect(isPhone(null)).toBe(false)
      expect(isPhone(undefined)).toBe(false)
      expect(isPhone('')).toBe(false)
    })
  })

  describe('isStudentNo', () => {
    it('正确学号', () => {
      expect(isStudentNo('A12345')).toBe(true)
      expect(isStudentNo('2024001')).toBe(true)
      expect(isStudentNo('AB')).toBe(true) // 最短 2 位
    })
    it('错误学号', () => {
      expect(isStudentNo('A')).toBe(false) // 少于 2 位
      expect(isStudentNo('A-1')).toBe(false) // 含非法字符
      expect(isStudentNo('学号001')).toBe(false) // 含中文
    })
    it('空值视为合法（学号可选）', () => {
      expect(isStudentNo('')).toBe(true)
      expect(isStudentNo(null)).toBe(true)
    })
  })

  describe('isEmail', () => {
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

  describe('isScore', () => {
    it('正确分数', () => {
      expect(isScore(0)).toBe(true)
      expect(isScore(100)).toBe(true)
      expect(isScore(85.5)).toBe(true)
    })
    it('超范围', () => {
      expect(isScore(101)).toBe(false) // 默认满分 100
      expect(isScore(-1)).toBe(false)
      expect(isScore(150)).toBe(false)
      expect(isScore(150, 150)).toBe(true) // 150 分制
      expect(isScore(151, 150)).toBe(false)
    })
    it('非数字', () => {
      expect(isScore('abc')).toBe(false)
      expect(isScore(NaN)).toBe(false)
    })
  })

  describe('inRange', () => {
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

  describe('isInt', () => {
    it('整数（含负数）', () => {
      expect(isInt(5, 0, 10)).toBe(true)
      expect(isInt(-3, -10, 10)).toBe(true)
    })
    it('非整数', () => {
      expect(isInt(5.5, 0, 10)).toBe(false)
    })
  })

  describe('isNonEmpty', () => {
    it('非空字符串', () => {
      expect(isNonEmpty('hello')).toBe(true)
      expect(isNonEmpty(' x ')).toBe(true)
    })
    it('空/纯空白/null', () => {
      expect(isNonEmpty('')).toBe(false)
      expect(isNonEmpty('   ')).toBe(false)
      expect(isNonEmpty(null)).toBe(false)
    })
  })

  describe('isAmount', () => {
    it('正确金额', () => {
      expect(isAmount(10)).toBe(true)
      expect(isAmount(10.5)).toBe(true)
      expect(isAmount(10.55)).toBe(true)
      expect(isAmount('99.9')).toBe(true)
    })
    it('0 或负数不允许', () => {
      expect(isAmount(0)).toBe(false)
      expect(isAmount(-5)).toBe(false)
    })
    it('超过两位小数', () => {
      expect(isAmount(10.555)).toBe(false)
    })
    it('非数字', () => {
      expect(isAmount('abc')).toBe(false)
    })
  })

  describe('isUrl', () => {
    it('http/https 合法', () => {
      expect(isUrl('http://example.com')).toBe(true)
      expect(isUrl('https://example.com/path?q=1')).toBe(true)
    })
    it('非 http 协议非法', () => {
      expect(isUrl('ftp://example.com')).toBe(false)
    })
    it('非法字符串', () => {
      expect(isUrl('not a url')).toBe(false)
    })
    it('空值合法（可选字段）', () => {
      expect(isUrl('')).toBe(true)
      expect(isUrl(null)).toBe(true)
    })
  })

  describe('isDateStr', () => {
    it('YYYY-MM-DD 格式', () => {
      expect(isDateStr('2024-01-15')).toBe(true)
      expect(isDateStr('2024-1-5')).toBe(false) // 需两位补零
      expect(isDateStr('2024/01/15')).toBe(false)
    })
    it('空值合法', () => {
      expect(isDateStr('')).toBe(true)
      expect(isDateStr(null)).toBe(true)
    })
  })

  describe('clip', () => {
    it('超长则截断', () => {
      expect(clip('hello world', 5)).toBe('hello')
    })
    it('不超长原样返回', () => {
      expect(clip('abc', 5)).toBe('abc')
    })
    it('null 返回空串', () => {
      expect(clip(null, 5)).toBe('')
    })
  })

  describe('MAX_LEN', () => {
    it('常量存在且含预期字段', () => {
      expect(MAX_LEN.NAME).toBe(50)
      expect(MAX_LEN.PHONE).toBe(11)
      expect(MAX_LEN.STUDENT_NO).toBe(32)
      expect(MAX_LEN.EMAIL).toBe(100)
    })
  })
})