import { describe, expect, test } from 'vitest'
import { Evidence, chain, derive } from '../src/_atoms/derive/index.ts'

describe('unified derive', () => {
  test('full pipeline returns designs plus evidence', () => {
    const r = derive({ birth_date: '1990-05-15', birth_hour: '午时', wrist_cm: 17 })
    expect(r.ok).toBe(true)
    expect(r.day_master).toBe('庚金')
    expect(r.day_master_element).toBe('金')
    expect(r.strength).toBe('weak')
    expect(r.favorable).toEqual(['土', '金'])
    expect(r.unfavorable).toEqual(['火', '水'])
    expect(r.designs.length).toBeGreaterThan(0)
    expect(r.reason).toBeUndefined()
    expect(r.evidence.length).toBeGreaterThan(0)
    expect(r.evidence[0]!.rule_id).toBe('R1')
  })

  test('style_ids filters the returned designs', () => {
    const r = derive({ birth_date: '1990-05-15', birth_hour: '午时', wrist_cm: 17, style_ids: ['B-02'] })
    expect(r.ok).toBe(true)
    expect(new Set(r.designs.map(d => d.style))).toEqual(new Set(['B-02']))
  })

  test('unknown style id is refused in closed world', () => {
    const r = derive({ birth_date: '1990-05-15', birth_hour: '午时', wrist_cm: 17, style_ids: ['B-99'] })
    expect(r.ok).toBe(false)
    expect(r.designs).toEqual([])
    expect(r.reason).toContain('R12')
  })

  test('bead_ids narrows the candidates', () => {
    const r = derive({ birth_date: '1990-05-15', birth_hour: '午时', wrist_cm: 17, bead_ids: ['taishan-yu_round'] })
    expect(r.designs.length).toBeGreaterThan(0)
    expect(r.designs.every(d => d.beads.includes('泰山玉'))).toBe(true)
  })

  test('证据链随结果返回（内置构建器）', () => {
    const ev = new Evidence()
    ev.add('R1', '四柱', '庚午 壬巳 庚辰 壬午')
    expect(ev.snapshot()).toEqual([{ rule_id: 'R1', input: '四柱', output: '庚午 壬巳 庚辰 壬午' }])
    expect(chain('R5', '候选', []).output).toBe('(无)')
    expect(chain('R5', '候选', ['南红:火']).output).toBe('南红:火')
    const snap = ev.snapshot()
    snap[0]!.output = 'mutated'
    expect(ev.snapshot()[0]!.output).toBe('庚午 壬巳 庚辰 壬午')
  })
})
