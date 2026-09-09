import { describe, expect, test } from 'vitest'
import { parseSlots } from '../src/_atoms/parse_slots/index.ts'

describe('bazidiy.parse_slots', () => {
  test('解析 珠名:直径 序列为槽位', () => {
    const slots = parseSlots('南红:8,碎银子:4,南红:8')
    expect(slots).not.toBeNull()
    expect(slots!.map(s => s.name)).toEqual(['南红', '碎银子', '南红'])
    expect(slots!.map(s => s.slot)).toEqual([0, 1, 2])
    expect(slots![0]!.diameter).toBe(8)
    expect(slots![0]!.image.length).toBeGreaterThan(0)
    expect(slots![0]!.ratio).toBeGreaterThan(0)
  })

  test('非全称珠名整体拒绝', () => {
    expect(parseSlots('玛瑙:8')).toBeNull()
    expect(parseSlots('白玉:8')).toBeNull()
  })

  test('空串返回空槽位', () => {
    expect(parseSlots('')).toEqual([])
  })

  test('跳过没有直径的片段', () => {
    expect(parseSlots('南红,南红:8')!.length).toBe(1)
  })
})
