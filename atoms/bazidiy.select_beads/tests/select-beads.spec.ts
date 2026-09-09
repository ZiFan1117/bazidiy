import { describe, expect, test } from 'vitest'
import { isSpacerBead, selectBeads } from '../src/_atoms/select_beads/index.ts'
import { beads } from '../src/_atoms/kb/beadCatalog.ts'

describe('bazidiy.select_beads', () => {
  test('忌神五行进 unsuitable，其余进 suitable', () => {
    const { suitable, unsuitable } = selectBeads(beads, new Set(['火', '木']))
    expect(unsuitable.some(b => b.id === 'nanhong_round')).toBe(true)
    expect(unsuitable.find(b => b.id === 'nanhong_round')?.reason).toContain('忌神')
    expect(suitable.some(b => b.id === 'baiyin_round')).toBe(true)
  })

  test('隔片豁免五行过滤', () => {
    const spacer = beads.find(b => b.variant === 'spacer')!
    expect(isSpacerBead(spacer)).toBe(true)
    const { suitable } = selectBeads([spacer], new Set(['火', '木', '土', '金', '水']))
    expect(suitable).toHaveLength(1)
  })

  test('限定 id/bead_id/name 子集', () => {
    const { suitable } = selectBeads(beads, new Set(), new Set(['泰山玉']))
    expect(suitable.map(b => b.name)).toEqual(['泰山玉'])
  })
})
