/**
 * 喜忌选择原子（bazidiy.rules.verdict_choice）。
 * 数据驱动：favorable_rules / unfavorable_rules，按旺衰选规则并沿关系取后继。
 * @module @bazidiy/ontology/atoms/rules/verdictChoice
 */
import { wuxing as wuxingData } from '../../data/wuxing.ts'
import { loadRelations, deriveElements, type RelationName } from './relations.ts'

export interface VerdictChoice {
  favorable: string[]
  unfavorable: string[]
  reasons: string[]
}

interface FavRule { condition: { strength: string }; favorable_from: RelationName[]; include_self: boolean; reason: string }
interface UnfavRule { condition: { strength: string }; unfavorable_from: RelationName[]; reason: string }

/** 依据旺衰给喜/忌（含 rule.reason）。 */
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
