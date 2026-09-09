import { describe, expect, test } from 'vitest'
import { beadCount, isSpacer, loadStyles, solveStyles, wuxingOrder } from '../src/_atoms/solve_styles/index.ts'
import { SPACER_MAP } from '../src/_atoms/styles/index.ts'
import { beads } from '../src/_atoms/kb/beadCatalog.ts'

describe('bazidiy.solve_styles', () => {
  test('款式库与隔片直径映射', () => {
    expect(new Set(loadStyles().map(s => s.style_id))).toEqual(new Set(['B-01', 'B-02', 'B-03', 'B-10']))
    expect(SPACER_MAP['10']).toBe(5)
    expect(wuxingOrder()).toEqual(['木', '火', '土', '金', '水'])
  })

  test('腕围物理公式：17cm/6mm = 31 颗', () => {
    expect(beadCount(17, 6)).toBe(31)
    expect(beadCount(17, 8, 4)).toBeGreaterThan(0)
  })

  test('全量珠子求解产出方案', () => {
    const nonSpacer = beads.filter(b => !isSpacer({ ...b }))
    const { proposals, unavailable } = solveStyles(loadStyles(), nonSpacer, 17)
    expect(proposals.length).toBeGreaterThan(0)
    for (const p of proposals) expect(p.beads.includes(':')).toBe(true)
    expect(Array.isArray(unavailable)).toBe(true)
  })

  test('B-10 缺五行时给出不可用原因', () => {
    const woodOnly = beads.filter(b => b.wuxing === '木' && b.variant !== 'spacer')
    const { unavailable } = solveStyles(loadStyles(), woodOnly, 17)
    const b10 = unavailable.find(u => u.style === 'B-10')
    expect(b10?.reason).toContain('五行')
  })
})
