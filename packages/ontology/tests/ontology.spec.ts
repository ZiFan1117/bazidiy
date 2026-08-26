import { describe, expect, test } from 'vitest'
import { inferWuxing, validateConsistency, loadRelations } from '../src/wuxing.ts'
import { beadCount, loadStyles, wuxingOrder } from '../src/solver.ts'
import { propose } from '../src/propose.ts'
import { calculateBazi } from '../src/bazi.ts'

describe('wuxing rules', () => {
  test('generates cycle', () => {
    const rel = loadRelations()
    expect(rel.generates['木']).toBe('火')
    expect(rel.generates['水']).toBe('木')
    expect(rel.restricts['木']).toBe('土')
    expect(rel.restricts['金']).toBe('木')
  })

  test('same branch → strong', () => {
    expect(inferWuxing('木', '木').strength).toBe('strong')
  })

  test('nurture → strong', () => {
    expect(inferWuxing('木', '水').strength).toBe('strong')
  })

  test('branch restricts → weak', () => {
    expect(inferWuxing('木', '金').strength).toBe('weak')
  })

  test('favorable when strong', () => {
    const v = inferWuxing('木', '木')
    expect(v.favorable).toEqual(['土', '火'])
    expect(v.unfavorable).toEqual(['木', '水'])
  })

  test('favorable when weak', () => {
    const v = inferWuxing('木', '金')
    expect(v.favorable).toEqual(['水', '木'])
    expect(v.unfavorable).toEqual(['金', '火'])
  })

  test('reasons present', () => {
    const v = inferWuxing('木', '水')
    expect(v.strength_reasons.length).toBeGreaterThan(0)
    expect(v.reasons.length).toBeGreaterThan(0)
  })

  test('no fav/unfav overlap', () => {
    expect(validateConsistency()).toEqual([])
  })
})

describe('style rules', () => {
  test('styles load', () => {
    const ids = new Set(loadStyles().map(s => s.style_id))
    expect(ids).toEqual(new Set(['B-01', 'B-02', 'B-03', 'B-10']))
  })

  test('b01 has single main position, no constraints', () => {
    const s = loadStyles().find(s => s.style_id === 'B-01')!
    expect(s.positions[0]!.role).toBe('main')
    expect(s.constraints).toEqual([])
  })

  test('b02 constraints exclude hardness', () => {
    const s = loadStyles().find(s => s.style_id === 'B-02')!
    const names = new Set(s.constraints.map(c => c.type))
    expect(names).toEqual(new Set(['diameter', 'spacer_map']))
  })

  test('b10 uses data order', () => {
    expect(wuxingOrder()).toEqual([...loadRelations().elements])
  })
})

describe('solver', () => {
  test('bead count', () => {
    expect(beadCount(17, 6)).toBe(31)
    expect(beadCount(17, 10, 4)).toBeGreaterThan(0)
  })
})

describe('bazi', () => {
  test('calculates pillars', () => {
    const b = calculateBazi('1990-05-15', '午时', '男')
    expect(b.type).toBe('bazi_result')
    expect(b.four_pillars.split(' ')).toHaveLength(4)
    expect(b.day_master_element.length).toBe(1)
    expect(b.month_branch_wuxing.length).toBe(1)
    expect(Object.values(b.wuxing_count).reduce((a, x) => a + x, 0)).toBe(8)
  })
})

describe('propose', () => {
  test('propose shape', () => {
    const r = propose([], 17, '木', '水')
    expect(r.type).toBe('design_proposal')
    expect(r.favorable.length).toBeGreaterThan(0)
    expect(r.unfavorable.length).toBeGreaterThan(0)
    expect(r.designs.length).toBeGreaterThan(0)
    for (const d of r.designs) {
      expect(typeof d.style).toBe('string')
      expect(typeof d.beads).toBe('string')
      expect(typeof d.count).toBe('number')
    }
  })

  test('propose bead filter', () => {
    const r = propose(['taishan-yu_round'], 17, '木', '水')
    expect(r.suitable.map(s => s.name)).toEqual(['泰山玉'])
    expect(r.designs.length).toBeGreaterThan(0)
  })

  test('unknown day master → empty', () => {
    const r = propose([], 17, 'X', '水')
    expect(r.favorable).toEqual([])
    expect(r.designs).toEqual([])
  })
})
