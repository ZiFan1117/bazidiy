/**
 * bazidiy.rules —— 五行判据、规则清单与封闭世界守卫。
 * 合并自 rules.relations / strength / verdict_choice / consistency / catalog / guards：
 * 判据数据来自 bazidiy.kb 的 wuxing/beadCatalog，本原子只做确定性求值与校验。
 * @module @bazidiy/ontology/atoms/rules
 */

import { wuxing as wuxingData } from '../kb/wuxing.ts'
import { beads as beadsData } from '../kb/beadCatalog.ts'

// ── 关系访问层 ────────────────────────────────────────────────────────────

/** 五行关系表。 */
export interface WuxingRelations {
  elements: readonly string[]
  generates: Record<string, string>
  restricts: Record<string, string>
}

/**
 * 从 kb 数据构建生克关系表。
 * @returns 元素顺序与生克关系。
 */
export function loadRelations(): WuxingRelations {
  return {
    elements: wuxingData.elements,
    generates: wuxingData.generates,
    restricts: wuxingData.restricts,
  }
}

/** 关系名（self/generates/restricts/generated_by/restricted_by）。 */
export type RelationName = 'self' | 'generates' | 'restricts' | 'generated_by' | 'restricted_by'

function generatedBy(rel: WuxingRelations, element: string): string | undefined {
  for (const [src, tgt] of Object.entries(rel.generates)) {
    if (tgt === element) return src
  }
  return undefined
}

function restrictedBy(rel: WuxingRelations, element: string): string | undefined {
  for (const [src, tgt] of Object.entries(rel.restricts)) {
    if (tgt === element) return src
  }
  return undefined
}

/**
 * 沿关系取后继元素。
 * @param rel - 生克关系表。
 * @param name - 关系名。
 * @param element - 起点元素。
 * @returns 后继元素，或 undefined。
 */
export function follows(rel: WuxingRelations, name: RelationName, element: string): string | undefined {
  switch (name) {
    case 'self': return element
    case 'generates': return rel.generates[element]
    case 'restricts': return rel.restricts[element]
    case 'generated_by': return generatedBy(rel, element)
    case 'restricted_by': return restrictedBy(rel, element)
    /* v8 ignore next -- closed union */
    default: return undefined
  }
}

/**
 * 按来源关系列收集五行（去重、保序）。
 * @param rel - 生克关系表。
 * @param element - 起点元素。
 * @param sources - 关系名列表。
 * @returns 去重后的后继元素序列。
 */
export function deriveElements(rel: WuxingRelations, element: string, sources: readonly RelationName[]): string[] {
  const out: string[] = []
  for (const src of sources) {
    const v = follows(rel, src, element)
    if (v !== undefined && !out.includes(v)) out.push(v)
  }
  return out
}

// ── 旺衰判据 ──────────────────────────────────────────────────────────────

/** 旺衰判定结果。 */
export interface StrengthVerdict {
  strength: 'strong' | 'weak'
  strengthReasons: string[]
}

interface StrengthRule {
  id: string
  type: 'same_as' | 'generates'
  args: Record<string, string>
  reason: string
}

/**
 * 依据月令与日主关系判定日主旺衰（得令/得生 → strong）。
 * @param dayMaster - 日主五行（单字）。
 * @param monthBranch - 月支五行（单字）。
 * @returns 旺衰与命中理由。
 */
export function judgeStrength(dayMaster: string, monthBranch: string): StrengthVerdict {
  const rel = loadRelations()
  const rules = wuxingData.strength_rules as unknown as StrengthRule[]
  const reasons: string[] = []
  for (const rule of rules) {
    let matched = false
    if (rule.type === 'same_as') {
      const a = rule.args.a === 'day_master' ? dayMaster : monthBranch
      const b = rule.args.b === 'day_master' ? dayMaster : monthBranch
      matched = a === b
    } else {
      const from = rule.args.from === 'day_master' ? dayMaster : monthBranch
      const to = rule.args.to === 'day_master' ? dayMaster : monthBranch
      matched = rel.generates[from] === to
    }
    if (matched) reasons.push(rule.reason)
  }
  const strength: 'strong' | 'weak' = reasons.length > 0 ? 'strong' : 'weak'
  const strengthReasons = reasons.length > 0 ? reasons : ['未命中任何旺规则，日主偏弱']
  return { strength, strengthReasons }
}

// ── 喜忌选择 ──────────────────────────────────────────────────────────────

/** 喜忌选择结果。 */
export interface VerdictChoice {
  favorable: string[]
  unfavorable: string[]
  reasons: string[]
}

interface FavRule { condition: { strength: string }; favorable_from: RelationName[]; include_self: boolean; reason: string }
interface UnfavRule { condition: { strength: string }; unfavorable_from: RelationName[]; reason: string }

/**
 * 依据旺衰给出喜用神与忌神。
 * @param strength - 旺衰判定。
 * @param dayMaster - 日主五行（单字）。
 * @returns 喜神、忌神与命中理由。
 */
export function chooseVerdict(strength: 'strong' | 'weak', dayMaster: string): VerdictChoice {
  const rel = loadRelations()
  let favorable: string[] = []
  let unfavorable: string[] = []
  const reasons: string[] = []

  for (const rule of wuxingData.favorable_rules as unknown as FavRule[]) {
    if (rule.condition.strength !== strength) continue
    const vals = deriveElements(rel, dayMaster, rule.favorable_from)
    if (rule.include_self && !vals.includes(dayMaster)) vals.push(dayMaster)
    favorable = vals
    reasons.push(rule.reason)
  }

  for (const rule of wuxingData.unfavorable_rules as unknown as UnfavRule[]) {
    if (rule.condition.strength !== strength) continue
    unfavorable = deriveElements(rel, dayMaster, rule.unfavorable_from)
    reasons.push(rule.reason)
  }

  return { favorable, unfavorable, reasons }
}

// ── 规则自检 ──────────────────────────────────────────────────────────────

/**
 * 全组合自检：遍历 5×5 日主×月支，断言喜忌无交集。
 * @returns 冲突描述列表；空表示一致。
 */
export function checkConsistency(): string[] {
  const rel = loadRelations()
  const errors: string[] = []
  for (const dm of rel.elements) {
    for (const mb of rel.elements) {
      const { strength } = judgeStrength(dm, mb)
      const v = chooseVerdict(strength, dm)
      const overlap = v.favorable.filter((e) => v.unfavorable.includes(e))
      if (overlap.length > 0) {
        errors.push(
          `${dm}@${mb}(${strength}) 喜忌重叠: favorable=${v.favorable.join('')} unfavorable=${v.unfavorable.join('')} 交集=${overlap.join('')}`,
        )
      }
    }
  }
  return errors
}

// ── 规则清单 R1–R14 ───────────────────────────────────────────────────────

/** 规则清单条目。 */
export interface RuleInfo {
  /** 规则编号（R1–R14）。 */
  id: string
  /** 规则名。 */
  name: string
  /** 一句话判据。 */
  text: string
  /** 实现归属（原子真源路径）。 */
  source: string
}

/** R1–R14：排盘 → 旺衰 → 喜忌 → 匹配 → 款式/逐槽 → 域外拒绝。 */
export const RULES: readonly RuleInfo[] = [
  { id: 'R1', name: '干支五行', text: '十天干/十二地支映射到五行（纯日历/查表）。', source: 'atoms/bazidiy.calculate_chart/impl/index.ts' },
  { id: 'R2', name: '日主旺衰', text: '月令与日主五行关系 + 五行数量判定 strong/weak。', source: 'atoms/bazidiy.kb/impl/wuxing.ts strength_rules' },
  { id: 'R3', name: '喜用/忌神', text: '身旺喜克泄耗、忌比劫印；身弱喜生扶、忌官杀食伤（数据驱动）。', source: 'atoms/bazidiy.kb/impl/wuxing.ts favorable/unfavorable_rules' },
  { id: 'R4', name: '材质五行归属', text: '目录中每材质有且仅有一个五行（FunctionalProperty）。', source: 'atoms/bazidiy.kb/impl/beadCatalog.ts' },
  { id: 'R5', name: '候选主珠匹配', text: '候选 = 材质五行 ∈ 喜用 且 ∉ 忌神（隔片除外）。', source: 'atoms/bazidiy.propose_designs/impl/index.ts' },
  { id: 'R6', name: '隔片五行', text: '隔片(spacer)不参与忌神过滤，但限目录已有规格。', source: 'atoms/bazidiy.propose_designs/impl/index.ts' },
  { id: 'R7', name: '隔片直径查表', text: '主珠径→隔片径：6/8→4, 10→5, 12→6。', source: 'atoms/bazidiy.styles/impl/index.ts spacer_diameter_map' },
  { id: 'R8', name: '款式珠数', text: '腕围+珠径物理公式计算珠数；按款式约束取整。', source: 'atoms/bazidiy.solve_styles/impl/index.ts beadCount' },
  { id: 'R9', name: 'B-01/B-02 同质性', text: 'B-01 全同材质同径；B-02 主珠≥10mm+体珠6/8+两侧隔片。', source: 'atoms/bazidiy.styles/impl/index.ts' },
  { id: 'R10', name: 'B-03 周期', text: 'B-03 以 3 为周期：main/main/spacer 循环。', source: 'atoms/bazidiy.solve_styles/impl/index.ts b03Proposals' },
  { id: 'R11', name: 'B-10 五行段序', text: 'B-10 按 木→火→土→金→水 分五段、每段一种材质、同径。', source: 'atoms/bazidiy.solve_styles/impl/index.ts b10Proposals' },
  { id: 'R12', name: '域外拒绝', text: '元素/珠名/直径/款式不在封闭集合内 → 明确拒绝，不给“可能”。', source: 'atoms/bazidiy.derive/impl/index.ts' },
  { id: 'R13', name: '珠数选择', text: '从腕围物理公式推导颗数，落合法数量集。', source: 'atoms/bazidiy.solve_styles/impl/index.ts beadCount' },
  { id: 'R14', name: '逐槽生成', text: '把合规材质序列化为 slot 顺序的完整方案(beads 串)。', source: 'atoms/bazidiy.solve_styles/impl/index.ts solveStyles' },
]

/**
 * 返回规则清单（只读，内容不变）。
 * @returns R1–R14 规则条目。
 */
export function listRules(): readonly RuleInfo[] {
  return RULES
}

/**
 * 按编号取单条规则。
 * @param id - 规则编号（如 `R5`）。
 * @returns 命中的规则，或 undefined。
 */
export function ruleById(id: string): RuleInfo | undefined {
  return RULES.find(r => r.id === id)
}

// ── 封闭世界守卫 ──────────────────────────────────────────────────────────

/** 合法五行元素（取自 kb 元素顺序，闭合枚举）。 */
export const WUXING_ELEMENTS: readonly string[] = wuxingData.elements

/** 合法珠形变体（取自珠库实际出现的 variant，闭合枚举）。 */
export const SHAPE_VARIANTS: readonly string[] = [...new Set(beadsData.map(b => b.variant))]

/**
 * 是否为合法五行元素。
 * @param value - 待判定值。
 * @returns 是否在五元素闭合集合内。
 */
export function isWuxingElement(value: string): boolean {
  return WUXING_ELEMENTS.includes(value)
}

/**
 * 是否为合法珠形变体。
 * @param value - 待判定值。
 * @returns 是否在珠库变体闭合集合内。
 */
export function isShapeVariant(value: string): boolean {
  return SHAPE_VARIANTS.includes(value)
}

/**
 * 五行归属是否单值（FunctionalProperty：任何 bead_id 至多一个五行）。
 * @returns 冲突描述列表；空表示全部单值。
 */
export function assertSingleWuxing(): string[] {
  const conflicts: string[] = []
  const byBead = new Map<string, string>()
  for (const b of beadsData) {
    const prev = byBead.get(b.bead_id)
    if (prev !== undefined && prev !== b.wuxing) {
      conflicts.push(`${b.bead_id}: ${prev} vs ${b.wuxing}`)
    }
    byBead.set(b.bead_id, b.wuxing)
  }
  return conflicts
}

/**
 * 目录封闭性：给定 id/bead_id/name 是否在珠库内。
 * @param key - 待判定键。
 * @returns 是否命中珠库任一主键。
 */
export function isCatalogMember(key: string): boolean {
  return beadsData.some(b => b.id === key || b.bead_id === key || b.name === key)
}

/**
 * 规则数据自洽：elements 中每个元素在生克表里都有出边。
 * @returns 缺失描述列表；空表示闭合。
 */
export function validateWuxingData(): string[] {
  const errors: string[] = []
  for (const element of wuxingData.elements) {
    if (!(element in wuxingData.generates)) errors.push(`generates 缺 ${element}`)
    if (!(element in wuxingData.restricts)) errors.push(`restricts 缺 ${element}`)
  }
  return errors
}
