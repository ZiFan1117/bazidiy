import { describe, expect, test } from 'vitest'
import { generateDesign } from '../src/_atoms/generate_design/index.ts'

describe('bazidiy.generate_design', () => {
  test('合法珠序定稿为槽位', () => {
    const r = generateDesign({ style_name: 'B-02', beads: '南红:8,碎银子:4,南红:8', summary: 'x', rationale: 'r' })
    expect(r.type).toBe('design_result')
    expect(r.slots).toHaveLength(3)
    expect(r.note).toBeUndefined()
  })

  test('非法珠名返回 note 而不抛错', () => {
    const r = generateDesign({ style_name: 'B-02', beads: '白玉:8', summary: 'x', rationale: 'r' })
    expect(r.slots).toEqual([])
    expect(r.note).toContain('全称')
  })

  test('空珠序得到空槽位', () => {
    const r = generateDesign({ style_name: 'B-01', beads: '', summary: 'x', rationale: 'r' })
    expect(r.slots).toEqual([])
    expect(r.note).toBeUndefined()
  })
})
