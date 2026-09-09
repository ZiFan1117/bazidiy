import { describe, expect, test } from 'vitest'
import { SPACER_MAP, candidatesFor, checkConstraint, loadStyles } from '../src/_atoms/styles/index.ts'
import { beads } from '../src/_atoms/kb/beadCatalog.ts'

describe('bazidiy.styles', () => {
  test('款式库还原为四款式', () => {
    const styles = loadStyles()
    expect(new Set(styles.map(s => s.style_id))).toEqual(new Set(['B-01', 'B-02', 'B-03', 'B-10']))
    const b02 = styles.find(s => s.style_id === 'B-02')!
    expect(b02.positions).toHaveLength(4)
    expect(b02.constraints.map(c => c.type)).toEqual(['diameter', 'spacer_map'])
  })

  test('隔片直径映射来自 kb', () => {
    expect(SPACER_MAP['6']).toBe(4)
    expect(SPACER_MAP['10']).toBe(5)
    expect(SPACER_MAP['12']).toBe(6)
  })

  test('candidatesFor 按变体与直径过滤', () => {
    const nanhong = beads.find(b => b.id === 'nanhong_round')!
    expect(candidatesFor(nanhong, { slot: 0, role: 'main', variant_filter: ['round'] })).toBe(true)
    expect(candidatesFor(nanhong, { slot: 0, role: 'main', variant_filter: ['spacer'] })).toBe(false)
    expect(candidatesFor(nanhong, { slot: 0, role: 'main', min_dia: 20 })).toBe(false)
  })

  test('三类约束校验', () => {
    const main = beads.find(b => b.id === 'nanhong_round')!
    const body = beads.find(b => b.id === 'xiaoye-zitan_round')!
    expect(checkConstraint('diameter', [main, body], { main_min: 8, body: [6, 8, 10, 12] })).toBe(true)
    expect(checkConstraint('diameter', [main, body], { main_min: 99 })).toBe(false)
    expect(checkConstraint('spacer_map', [main, body], {})).toBe(true)
    expect(checkConstraint('same_bead', [main, main], {})).toBe(true)
    expect(checkConstraint('same_bead', [main, body], {})).toBe(false)
    expect(() => checkConstraint('unknown', [main], {})).toThrow(/unknown constraint type/)
  })
})
