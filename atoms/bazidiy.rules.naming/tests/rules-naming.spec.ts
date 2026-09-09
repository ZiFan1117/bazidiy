import { describe, expect, test } from 'vitest'
import { VALID_NAMES, isCanonicalName, resolveVariant } from '../src/_atoms/rules.naming/index.ts'

describe('bazidiy.rules.naming', () => {
  test('全称集合来自珠库', () => {
    expect(VALID_NAMES.has('南红')).toBe(true)
    expect(isCanonicalName('南红')).toBe(true)
    expect(isCanonicalName('玛瑙')).toBe(false)
    expect(isCanonicalName('小叶紫檀')).toBe(true)
  })

  test('同名变体按直径消歧', () => {
    expect(resolveVariant('白银', 10)?.variant).toBe('round')
    expect(resolveVariant('白银', 4)?.variant).toBe('spacer')
    expect(resolveVariant('小叶紫檀', 15)?.variant).toBe('buddha')
    expect(resolveVariant('不存在', 8)).toBeUndefined()
  })
})
