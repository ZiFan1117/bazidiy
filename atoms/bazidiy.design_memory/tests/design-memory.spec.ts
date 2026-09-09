import { describe, expect, test } from 'vitest'
import { designsDomain, savedDesignSchema, savedSlotSchema } from '../src/_atoms/design_memory/index.ts'

describe('bazidiy.design_memory', () => {
  test('槽位契约接受合法值', () => {
    const slot = { name: '南红', diameter: 8, slot: 0, image: 'nanhong_round', ratio: 1 }
    expect(savedSlotSchema.safeParse(slot).success).toBe(true)
  })

  test('槽位契约拒绝错误类型', () => {
    expect(savedSlotSchema.safeParse({ name: '南红', diameter: '8', slot: 0, image: 'x', ratio: 1 }).success).toBe(false)
  })

  test('设计契约要求完整字段', () => {
    const ok = {
      style_name: 'B-01',
      slots: [{ name: '南红', diameter: 8, slot: 0, image: 'nanhong_round', ratio: 1 }],
      wrist_size: '17',
      summary: 's',
      rationale: 'r',
    }
    expect(savedDesignSchema.safeParse(ok).success).toBe(true)
    expect(savedDesignSchema.safeParse({ style_name: 'B-01' }).success).toBe(false)
  })

  test('域名为 bazidiy_designs 且含 saved 表', () => {
    expect(designsDomain.name).toBe('bazidiy_designs')
    expect('saved' in designsDomain.tables).toBe(true)
  })
})
