/**
 * Assertions - 断言封装库
 * 提供统一的断言方法，提高测试代码的可读性和一致性
 */

import { expect, type Assertion } from 'vitest'
import type { VueWrapper, DOMWrapper } from '@vue/test-utils'

/**
 * 断言包装器
 */
export class AssertionWrapper<T> {
  constructor(
    private readonly actual: T,
    private readonly context?: string
  ) {}

  private getContext() {
    return this.context ? `[${this.context}] ` : ''
  }

  toBeTruthy(): this {
    expect(this.actual, `${this.getContext()}Expected to be truthy`).toBeTruthy()
    return this
  }

  toBeFalsy(): this {
    expect(this.actual, `${this.getContext()}Expected to be falsy`).toBeFalsy()
    return this
  }

  toBeDefined(): this {
    expect(this.actual, `${this.getContext()}Expected to be defined`).toBeDefined()
    return this
  }

  toBeUndefined(): this {
    expect(this.actual, `${this.getContext()}Expected to be undefined`).toBeUndefined()
    return this
  }

  toBeNull(): this {
    expect(this.actual, `${this.getContext()}Expected to be null`).toBeNull()
    return this
  }

  toEqual<T>(expected: T): this {
    expect(this.actual, `${this.getContext()}Expected to equal`).toEqual(expected)
    return this
  }

  toStrictEqual<T>(expected: T): this {
    expect(this.actual, `${this.getContext()}Expected to strictly equal`).toStrictEqual(expected)
    return this
  }

  toContain<T>(expected: T): this {
    expect(this.actual, `${this.getContext()}Expected to contain`).toContain(expected)
    return this
  }

  toContainEqual<T>(expected: T): this {
    expect(this.actual, `${this.getContext()}Expected to contain equal`).toContainEqual(expected)
    return this
  }

  toHaveLength(length: number): this {
    expect(this.actual, `${this.getContext()}Expected to have length ${length}`).toHaveLength(length)
    return this
  }

  toBeGreaterThan(expected: number): this {
    expect(this.actual, `${this.getContext()}Expected to be greater than ${expected}`).toBeGreaterThan(expected)
    return this
  }

  toBeGreaterThanOrEqual(expected: number): this {
    expect(this.actual, `${this.getContext()}Expected to be greater than or equal ${expected}`).toBeGreaterThanOrEqual(expected)
    return this
  }

  toBeLessThan(expected: number): this {
    expect(this.actual, `${this.getContext()}Expected to be less than ${expected}`).toBeLessThan(expected)
    return this
  }

  toBeLessThanOrEqual(expected: number): this {
    expect(this.actual, `${this.getContext()}Expected to be less than or equal ${expected}`).toBeLessThanOrEqual(expected)
    return this
  }

  toMatch(pattern: string | RegExp): this {
    expect(this.actual, `${this.getContext()}Expected to match ${pattern}`).toMatch(pattern)
    return this
  }

  toMatchObject<T>(expected: T): this {
    expect(this.actual, `${this.getContext()}Expected to match object`).toMatchObject(expected)
    return this
  }

  toHaveProperty(key: string, value?: any): this {
    expect(this.actual, `${this.getContext()}Expected to have property ${key}`).toHaveProperty(key, value)
    return this
  }

  toThrow(error?: string | RegExp | Error): this {
    expect(this.actual, `${this.getContext()}Expected to throw`).toThrow(error)
    return this
  }

  toResolve(): this {
    expect(this.actual, `${this.getContext()}Expected to resolve`).resolves.toBeDefined()
    return this
  }

  toReject(): this {
    expect(this.actual, `${this.getContext()}Expected to reject`).rejects.toBeDefined()
    return this
  }
}

/**
 * 创建断言包装器
 */
export function expectValue<T>(actual: T, context?: string): AssertionWrapper<T> {
  return new AssertionWrapper(actual, context)
}

/**
 * Vue Wrapper 断言扩展
 */
export function expectWrapper<T extends VueWrapper<any> | DOMWrapper<any>>(wrapper: T, context?: string) {
  const ctx = context ? `[${context}] ` : ''

  return {
    toExist(): T {
      expect(wrapper.exists(), `${ctx}Expected wrapper to exist`).toBe(true)
      return wrapper
    },

    toBeVisible(): T {
      expect(wrapper.isVisible(), `${ctx}Expected wrapper to be visible`).toBe(true)
      return wrapper
    },

    toBeHidden(): T {
      expect(wrapper.isVisible(), `${ctx}Expected wrapper to be hidden`).toBe(false)
      return wrapper
    },

    toHaveClass(className: string): T {
      expect(wrapper.classes(), `${ctx}Expected to have class ${className}`).toContain(className)
      return wrapper
    },

    toHaveAttribute(name: string, value?: string): T {
      if (value !== undefined) {
        expect(wrapper.attributes(name), `${ctx}Expected attribute ${name} to be "${value}"`).toBe(value)
      } else {
        expect(wrapper.attributes(), `${ctx}Expected to have attribute ${name}`).toHaveProperty(name)
      }
      return wrapper
    },

    toHaveText(text: string | RegExp): T {
      const actualText = wrapper.text()
      if (typeof text === 'string') {
        expect(actualText, `${ctx}Expected to have text "${text}", got "${actualText}"`).toContain(text)
      } else {
        expect(actualText, `${ctx}Expected text to match ${text}`).toMatch(text)
      }
      return wrapper
    },

    toHaveExactText(text: string): T {
      expect(wrapper.text().trim(), `${ctx}Expected exact text "${text}"`).toBe(text.trim())
      return wrapper
    },

    toHaveValue(value: string): T {
      if ('element' in wrapper && wrapper.element instanceof HTMLInputElement) {
        expect(wrapper.element.value, `${ctx}Expected value "${value}"`).toBe(value)
      } else if ('element' in wrapper && wrapper.element instanceof HTMLSelectElement) {
        expect(wrapper.element.value, `${ctx}Expected value "${value}"`).toBe(value)
      } else if ('element' in wrapper && wrapper.element instanceof HTMLTextAreaElement) {
        expect(wrapper.element.value, `${ctx}Expected value "${value}"`).toBe(value)
      } else {
        // Vue Wrapper
        const input = wrapper.find('input, select, textarea')
        if (input.exists()) {
          expect(input.element.value, `${ctx}Expected value "${value}"`).toBe(value)
        } else {
          throw new Error(`${ctx}No input element found`)
        }
      }
      return wrapper
    },

    toHaveProp(name: string, value?: any): T {
      const props = 'props' in wrapper ? wrapper.props() : {}
      if (value !== undefined) {
        expect(props[name], `${ctx}Expected prop ${name} to be ${value}`).toBe(value)
      } else {
        expect(props, `${ctx}Expected to have prop ${name}`).toHaveProperty(name)
      }
      return wrapper
    },

    toEmit(eventName: string, payload?: any): T {
      const events = wrapper.emitted(eventName)
      expect(events, `${ctx}Expected to emit ${eventName}`).toBeTruthy()
      if (payload !== undefined) {
        const lastEvent = events[events.length - 1]
        expect(lastEvent, `${ctx}Expected last ${eventName} payload to match`).toEqual(payload)
      }
      return wrapper
    },

    toHaveEmittedTimes(eventName: string, times: number): T {
      const events = wrapper.emitted(eventName)
      expect(events?.length ?? 0, `${ctx}Expected to emit ${eventName} ${times} times`).toBe(times)
      return wrapper
    },

    toFindComponent(selector: string): T {
      const component = wrapper.findComponent(selector)
      expect(component.exists(), `${ctx}Expected to find component ${selector}`).toBe(true)
      return wrapper
    },

    toFindAllComponents(selector: string, count?: number): T {
      const components = wrapper.findAllComponents(selector)
      if (count !== undefined) {
        expect(components.length, `${ctx}Expected to find ${count} components ${selector}`).toBe(count)
      } else {
        expect(components.length, `${ctx}Expected to find at least one component ${selector}`).toBeGreaterThan(0)
      }
      return wrapper
    },

    toFindElement(selector: string): T {
      const element = wrapper.find(selector)
      expect(element.exists(), `${ctx}Expected to find element ${selector}`).toBe(true)
      return wrapper
    },

    toFindAllElements(selector: string, count?: number): T {
      const elements = wrapper.findAll(selector)
      if (count !== undefined) {
        expect(elements.length, `${ctx}Expected to find ${count} elements ${selector}`).toBe(count)
      } else {
        expect(elements.length, `${ctx}Expected to find at least one element ${selector}`).toBeGreaterThan(0)
      }
      return wrapper
    },
  }
}

/**
 * 异步断言助手
 */
export async function expectAsync<T>(
  promise: Promise<T>,
  context?: string
): Promise<AssertionWrapper<T>> {
  const actual = await promise
  return expectValue(actual, context)
}

/**
 * 断言元素存在且可见
 */
export function expectElementVisible(wrapper: VueWrapper<any> | DOMWrapper<any>, selector: string, context?: string) {
  const ctx = context ? `[${context}] ` : ''
  const element = wrapper.find(selector)
  expect(element.exists(), `${ctx}Element ${selector} should exist`).toBe(true)
  expect(element.isVisible(), `${ctx}Element ${selector} should be visible`).toBe(true)
  return element
}

/**
 * 断言表单验证错误
 */
export function expectValidationError(wrapper: VueWrapper<any>, fieldName: string, expectedMessage?: string, context?: string) {
  const ctx = context ? `[${context}] ` : ''
  // 常见的错误信息选择器
  const errorSelectors = [
    `.${fieldName}-error`,
    `[data-error-for="${fieldName}"]`,
    `.error-message.${fieldName}`,
    `.form-error:has(+ #${fieldName})`,
    `.el-form-item__error`, // Element Plus
    `.v-messages__message`, // Vuetify
  ]

  let found = false
  for (const selector of errorSelectors) {
    const errorEl = wrapper.find(selector)
    if (errorEl.exists()) {
      found = true
      if (expectedMessage) {
        expect(errorEl.text(), `${ctx}Field ${fieldName} should show error "${expectedMessage}"`).toContain(expectedMessage)
      }
      break
    }
  }

  if (!found && expectedMessage) {
    // 兜底：检查整个表单区域
    expect(wrapper.text(), `${ctx}Expected validation error for ${fieldName}: "${expectedMessage}"`).toContain(expectedMessage)
  }

  expect(found, `${ctx}Expected validation error element for field ${fieldName}`).toBe(true)
}

/**
 * 断言加载状态
 */
export function expectLoadingState(wrapper: VueWrapper<any>, isLoading: boolean, context?: string) {
  const ctx = context ? `[${context}] ` : ''
  const loadingIndicators = [
    '.loading',
    '.el-loading-mask',
    '.v-loading',
    '[data-loading="true"]',
    '.spinner',
    '.loading-spinner',
  ]

  if (isLoading) {
    let found = false
    for (const selector of loadingIndicators) {
      if (wrapper.find(selector).exists()) {
        found = true
        break
      }
    }
    expect(found, `${ctx}Expected loading indicator to be visible`).toBe(true)
  } else {
    for (const selector of loadingIndicators) {
      expect(wrapper.find(selector).exists(), `${ctx}Expected loading indicator to be hidden`).toBe(false)
    }
  }
}

/**
 * 断言模态框打开/关闭
 */
export function expectModal(wrapper: VueWrapper<any>, shouldBeOpen: boolean, context?: string) {
  const ctx = context ? `[${context}] ` : ''
  const modalSelectors = [
    '.modal',
    '.el-dialog',
    '.v-dialog',
    '[role="dialog"]',
    '.ant-modal',
  ]

  if (shouldBeOpen) {
    let found = false
    for (const selector of modalSelectors) {
      if (wrapper.find(selector).exists()) {
        found = true
        break
      }
    }
    expect(found, `${ctx}Expected modal to be open`).toBe(true)
  } else {
    for (const selector of modalSelectors) {
      expect(wrapper.find(selector).exists(), `${ctx}Expected modal to be closed`).toBe(false)
    }
  }
}

/**
 * 断言表格数据
 */
export function expectTableData(
  wrapper: VueWrapper<any>,
  expectedRows: number,
  expectedColumns?: string[],
  context?: string
) {
  const ctx = context ? `[${context}] ` : ''
  const rows = wrapper.findAll('tbody tr, .el-table__row, .v-data-table__row')
  expect(rows.length, `${ctx}Expected ${expectedRows} table rows`).toBe(expectedRows)

  if (expectedColumns && rows.length > 0) {
    const headers = wrapper.findAll('th, .el-table__header th, .v-data-table__header th')
    const headerTexts = headers.map(h => h.text().trim())
    expectedColumns.forEach(col => {
      expect(headerTexts, `${ctx}Expected column "${col}" in table headers`).toContain(col)
    })
  }
}

/**
 * 断言分页组件
 */
export function expectPagination(
  wrapper: VueWrapper<any>,
  currentPage: number,
  totalPages: number,
  context?: string
) {
  const ctx = context ? `[${context}] ` : ''
  const pagination = wrapper.find('.pagination, .el-pagination, .v-pagination, .ant-pagination')
  expect(pagination.exists(), `${ctx}Expected pagination component`).toBe(true)

  // 当前页
  const currentPageEl = pagination.find('.active, .el-pager li.active, .v-pagination__item--active, .ant-pagination-item-active')
  if (currentPageEl.exists()) {
    expect(parseInt(currentPageEl.text()), `${ctx}Expected current page ${currentPage}`).toBe(currentPage)
  }
}

/**
 * 断言 Toast/Message 提示
 */
export function expectToast(message: string, type?: 'success' | 'error' | 'warning' | 'info', context?: string) {
  const ctx = context ? `[${context}] ` : ''
  const toastSelectors = [
    `.el-message--${type || ''}`,
    `.v-snack--${type || ''}`,
    `.ant-message-${type || ''}`,
    '.toast',
    '.notification',
    '[role="alert"]',
  ]

  let found = false
  for (const selector of toastSelectors) {
    const toast = document.querySelector(selector)
    if (toast && toast.textContent?.includes(message)) {
      found = true
      break
    }
  }

  expect(found, `${ctx}Expected toast message "${message}"${type ? ` (${type})` : ''}`).toBe(true)
}

/**
 * 断言路由跳转
 */
export function expectRoute(router: any, expectedPath: string, context?: string) {
  const ctx = context ? `[${context}] ` : ''
  expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ path: expectedPath }))
}

/**
 * 断言 localStorage
 */
export function expectLocalStorage(key: string, expectedValue?: string, context?: string) {
  const ctx = context ? `[${context}] ` : ''
  const value = localStorage.getItem(key)
  if (expectedValue !== undefined) {
    expect(value, `${ctx}Expected localStorage.${key} = "${expectedValue}"`).toBe(expectedValue)
  } else {
    expect(value, `${ctx}Expected localStorage.${key} to exist`).not.toBeNull()
  }
}

/**
 * 断言 API 调用
 */
export function expectApiCall(
  mockFn: any,
  expectedUrl: string | RegExp,
  expectedMethod?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  expectedPayload?: any,
  context?: string
) {
  const ctx = context ? `[${context}] ` : ''
  const calls = mockFn.mock.calls

  const matchedCall = calls.find((call: any[]) => {
    const url = call[0]
    const options = call[1] || {}
    const method = (options.method || 'GET').toUpperCase()

    const urlMatch = typeof expectedUrl === 'string' ? url.includes(expectedUrl) : expectedUrl.test(url)
    const methodMatch = !expectedMethod || method === expectedMethod

    return urlMatch && methodMatch
  })

  expect(matchedCall, `${ctx}Expected API call to ${expectedMethod || 'ANY'} ${expectedUrl}`).toBeDefined()

  if (expectedPayload && matchedCall) {
    const payload = matchedCall[1]?.data || matchedCall[1]?.body
    expect(payload, `${ctx}Expected API payload to match`).toEqual(expectedPayload)
  }
}

/**
 * 断言数组包含对象（部分匹配）
 */
export function expectArrayContainObject<T extends Record<string, any>>(
  array: T[],
  partialObject: Partial<T>,
  context?: string
) {
  const ctx = context ? `[${context}] ` : ''
  const found = array.some(item => {
    return Object.entries(partialObject).every(([key, value]) => item[key] === value)
  })
  expect(found, `${ctx}Expected array to contain object matching ${JSON.stringify(partialObject)}`).toBe(true)
}

/**
 * 断言对象包含键值对
 */
export function expectObjectContain(
  obj: Record<string, any>,
  expected: Record<string, any>,
  context?: string
) {
  const ctx = context ? `[${context}] ` : ''
  Object.entries(expected).forEach(([key, value]) => {
    expect(obj[key], `${ctx}Expected object to have ${key} = ${value}`).toEqual(value)
  })
}

/**
 * 软断言 - 收集所有断言失败但不抛出异常
 */
export class SoftAssert {
  private errors: Error[] = []

  private wrap(fn: () => void, context?: string) {
    try {
      fn()
    } catch (e) {
      this.errors.push(e instanceof Error ? e : new Error(String(e)))
    }
  }

  expect(actual: any, context?: string) {
    const wrapper = expectValue(actual, context)
    const methods = [
      'toBeTruthy', 'toBeFalsy', 'toBeDefined', 'toBeUndefined', 'toBeNull',
      'toEqual', 'toStrictEqual', 'toContain', 'toContainEqual', 'toHaveLength',
      'toBeGreaterThan', 'toBeGreaterThanOrEqual', 'toBeLessThan', 'toBeLessThanOrEqual',
      'toMatch', 'toMatchObject', 'toHaveProperty', 'toThrow', 'toResolve', 'toReject'
    ]

    const softWrapper: any = {}
    methods.forEach(method => {
      softWrapper[method] = (...args: any[]) => {
        this.wrap(() => wrapper[method](...args), context)
        return softWrapper
      }
    })

    return softWrapper
  }

  assertAll(context?: string) {
    if (this.errors.length > 0) {
      const ctx = context ? `[${context}] ` : ''
      throw new Error(`${ctx}Soft assertions failed:\n${this.errors.map((e, i) => `${i + 1}. ${e.message}`).join('\n')}`)
    }
  }
}

export function createSoftAssert(context?: string) {
  return new SoftAssert()
}