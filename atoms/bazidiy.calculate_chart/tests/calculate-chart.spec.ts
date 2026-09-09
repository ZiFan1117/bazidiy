import { describe, expect, test } from 'vitest'
import { calculateBazi } from '../src/_atoms/calculate_chart/index.ts'

describe('bazidiy.calculate_chart', () => {
  test('1990-05-15 午时 → 四柱与日主', () => {
    const r = calculateBazi('1990-05-15', '午时', '男')
    expect(r.type).toBe('bazi_result')
    expect(r.four_pillars).toBe('庚午 壬巳 庚辰 壬午')
    expect(r.day_master).toBe('庚金')
    expect(r.day_master_element).toBe('金')
    expect(r.month_branch_wuxing).toBe('火')
  })

  test('五行统计覆盖八个字', () => {
    const r = calculateBazi('1990-05-15', '午时', '男')
    expect(r.wuxing_details).toHaveLength(4)
    expect(Object.values(r.wuxing_count).reduce((a, b) => a + b, 0)).toBe(8)
  })

  test('数字时辰按两小时区间映射（12 点 = 午时）', () => {
    expect(calculateBazi('1990-05-15', '12', '女').four_pillars).toBe('庚午 壬巳 庚辰 壬午')
    expect(calculateBazi('1990-05-15', '0', '女').four_pillars).toBe(calculateBazi('1990-05-15', '子时', '女').four_pillars)
    expect(calculateBazi('1990-05-15', '23', '女').four_pillars).toBe(calculateBazi('1990-05-15', '子时', '女').four_pillars)
  })

  test('性别暂不影响排盘', () => {
    expect(calculateBazi('1990-05-15', '午时', '男').four_pillars)
      .toBe(calculateBazi('1990-05-15', '午时', '女').four_pillars)
  })
})
