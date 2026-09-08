/**
 * 旺衰判据原子（bazidiy.rules.strength）。
 * 数据驱动：strength_rules（月令同日主/月令生日主 → strong）。
 * @module @bazidiy/ontology/atoms/rules/strength
 */
import { wuxing as wuxingData } from '../../data/wuxing.ts'
import { loadRelations } from './relations.ts'

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

/** 命中 strong 规则的理由集合（未命中则给弱默认说明）。 */
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
