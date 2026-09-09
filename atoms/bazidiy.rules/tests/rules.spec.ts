import { describe, expect, test } from 'vitest'
import {
  RULES,
  SHAPE_VARIANTS,
  WUXING_ELEMENTS,
  assertSingleWuxing,
  checkConsistency,
  chooseVerdict,
  deriveElements,
  follows,
  isCatalogMember,
  isShapeVariant,
  isWuxingElement,
  judgeStrength,
  listRules,
  loadRelations,
  ruleById,
  validateWuxingData,
} from '../src/_atoms/rules/index.ts'

describe('bazidiy.rules · 关系访问层', () => {
  test('加载生克关系表', () => {
    const rel = loadRelations()
    expect(rel.elements).toEqual(['木', '火', '土', '金', '水'])
    expect(rel.generates['木']).toBe('火')
    expect(rel.restricts['金']).toBe('木')
  })

  test('沿关系取后继（含反向）', () => {
    const rel = loadRelations()
    expect(follows(rel, 'generates', '金')).toBe('水')
    expect(follows(rel, 'restricts', '金')).toBe('木')
    expect(follows(rel, 'generated_by', '金')).toBe('土')
    expect(follows(rel, 'restricted_by', '金')).toBe('火')
    expect(follows(rel, 'self', '金')).toBe('金')
  })

  test('deriveElements 去重保序', () => {
    const rel = loadRelations()
    expect(deriveElements(rel, '金', ['restricts', 'generates'])).toEqual(['木', '水'])
    expect(deriveElements(rel, '金', ['self', 'generated_by'])).toEqual(['金', '土'])
  })
})

describe('bazidiy.rules · 旺衰', () => {
  test('月令同日主/生日主 → strong', () => {
    expect(judgeStrength('金', '金').strength).toBe('strong')
    expect(judgeStrength('金', '土').strength).toBe('strong')
  })

  test('未命中旺规则 → weak', () => {
    const v = judgeStrength('金', '水')
    expect(v.strength).toBe('weak')
    expect(v.strengthReasons[0]).toContain('偏弱')
  })
})

describe('bazidiy.rules · 喜忌与自检', () => {
  test('身旺喜克泄耗、身弱喜生扶', () => {
    expect(chooseVerdict('strong', '金').favorable).toEqual(['木', '水'])
    expect(chooseVerdict('weak', '金').favorable).toEqual(['土', '金'])
    expect(chooseVerdict('weak', '金').unfavorable).toEqual(['火', '水'])
  })

  test('5×5 全组合喜忌无交集', () => {
    expect(checkConsistency()).toEqual([])
  })
})

describe('bazidiy.rules · 清单与守卫', () => {
  test('R1–R14 清单', () => {
    expect(RULES).toHaveLength(14)
    expect(listRules()[0]!.id).toBe('R1')
    expect(ruleById('R12')?.name).toBe('域外拒绝')
    expect(ruleById('R99')).toBeUndefined()
  })

  test('封闭世界守卫', () => {
    expect(WUXING_ELEMENTS).toEqual(['木', '火', '土', '金', '水'])
    expect(isWuxingElement('金')).toBe(true)
    expect(isWuxingElement('X')).toBe(false)
    expect(SHAPE_VARIANTS).toContain('spacer')
    expect(isShapeVariant('hexagon')).toBe(false)
    expect(isCatalogMember('南红')).toBe(true)
    expect(isCatalogMember('玛瑙')).toBe(false)
    expect(assertSingleWuxing()).toEqual([])
    expect(validateWuxingData()).toEqual([])
  })
})
