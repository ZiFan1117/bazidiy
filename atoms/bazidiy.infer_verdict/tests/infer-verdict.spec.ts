import { describe, expect, test } from 'vitest'
import { inferWuxing, loadRelations, validateConsistency } from '../src/_atoms/infer_verdict/index.ts'

describe('bazidiy.infer_verdict', () => {
  test('月令同日主 → 身旺', () => {
    const v = inferWuxing('金', '金')
    expect(v.strength).toBe('strong')
    expect(v.favorable).toEqual(['木', '水'])
    expect(v.unfavorable).toEqual(['金', '土'])
  })

  test('月令克日主 → 身弱', () => {
    const v = inferWuxing('木', '金')
    expect(v.strength).toBe('weak')
    expect(v.favorable).toEqual(['水', '木'])
    expect(v.unfavorable).toEqual(['金', '火'])
  })

  test('理由与自检随结果返回', () => {
    const v = inferWuxing('木', '水')
    expect(v.strength_reasons.length).toBeGreaterThan(0)
    expect(v.reasons.length).toBeGreaterThan(0)
    expect(validateConsistency()).toEqual([])
  })

  test('re-export loadRelations 供上层使用', () => {
    expect(loadRelations().generates['木']).toBe('火')
  })
})
