import { describe, expect, test } from 'vitest'
import { loadBeads, propose } from '../src/_atoms/propose_designs/index.ts'

describe('bazidiy.propose_designs', () => {
  test('一链出方案（喜忌 + 方案）', () => {
    const r = propose([], 17, '木', '水')
    expect(r.type).toBe('design_proposal')
    expect(r.favorable.length).toBeGreaterThan(0)
    expect(r.unfavorable.length).toBeGreaterThan(0)
    expect(r.designs.length).toBeGreaterThan(0)
    expect(r.suitable.length).toBeGreaterThan(0)
  })

  test('珠子限定只影响候选', () => {
    const r = propose(['taishan-yu_round'], 17, '木', '水')
    expect(r.suitable.map(s => s.name)).toEqual(['泰山玉'])
  })

  test('域外日主返回空结果', () => {
    const r = propose([], 17, 'X', '水')
    expect(r.favorable).toEqual([])
    expect(r.designs).toEqual([])
  })

  test('loadBeads 与珠库一致', () => {
    expect(loadBeads().length).toBe(33)
  })
})
