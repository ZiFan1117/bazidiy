/**
 * 浜旇瑙勫垯寮曟搸 鈥?鏃鸿“鍒ゅ畾 + 鍠滅敤绁?蹇岀鎺ㄥ锛堟暟鎹┍鍔紝鏃犵‖缂栫爜鍒ゅ畾锛夈€? * 瑙勫垯鏁版嵁鏉ヨ嚜 data/wuxing.ts锛涙湰妯″潡鍙В閲婅鍒欍€? * @module @bazidiy/ontology/wuxing
 */

import { wuxing as wuxingData } from './data/wuxing.ts'
import type { WuxingVerdict } from './types.ts'

/** 鐢熷厠鍏崇郴琛紙婧愯嚜 wuxing.json锛夈€?*/
export interface WuxingRelations {
  elements: readonly string[]
  generates: Record<string, string>
  restricts: Record<string, string>
}

/** 浠庢暟鎹瀯寤虹敓鍏嬪叧绯昏〃銆?*/
export function loadRelations(): WuxingRelations {
  return {
    elements: wuxingData.elements,
    generates: wuxingData.generates,
    restricts: wuxingData.restricts,
  }
}

/** 璋佺敓鎴戙€?*/
function generatedBy(rel: WuxingRelations, element: string): string | undefined {
  for (const [src, tgt] of Object.entries(rel.generates)) {
    if (tgt === element) return src
  }
  return undefined
}

/** 璋佸厠鎴戙€?*/
function restrictedBy(rel: WuxingRelations, element: string): string | undefined {
  for (const [src, tgt] of Object.entries(rel.restricts)) {
    if (tgt === element) return src
  }
  return undefined
}

type RelationName = 'self' | 'generates' | 'restricts' | 'generated_by' | 'restricted_by'

/** 娌垮叧绯诲彇鍚庣户鍏冪礌銆?*/
function follows(rel: WuxingRelations, name: RelationName, element: string): string | undefined {
  switch (name) {
    case 'self': return element
    case 'generates': return rel.generates[element]
    case 'restricts': return rel.restricts[element]
    case 'generated_by': return generatedBy(rel, element)
    case 'restricted_by': return restrictedBy(rel, element)
    /* v8 ignore next -- RelationName is a closed union enforced at call sites */
    default: return undefined
  }
}

interface StrengthRule {
  id: string
  name: string
  type: 'same_as' | 'generates'
  args: Record<string, string>
  strength: 'strong'
  reason: string
}

/** 鏀堕泦鍛戒腑瑙勫垯鐨勬椇琛般€?*/
function strengthHits(
  rules: readonly StrengthRule[],
  rel: WuxingRelations,
  dayMaster: string,
  monthBranch: string,
): string[] {
  const reasons: string[] = []
  for (const rule of rules) {
    let matched = false
    if (rule.type === 'same_as') {
      const a = rule.args.a === 'day_master' ? dayMaster : monthBranch
      const b = rule.args.b === 'day_master' ? dayMaster : monthBranch
      matched = a === b
    } else {
      const src = rule.args.from === 'day_master' ? dayMaster : monthBranch
      const tgt = rule.args.to === 'day_master' ? dayMaster : monthBranch
      matched = rel.generates[src] === tgt
    }
    if (matched) reasons.push(rule.reason)
  }
  return reasons
}

/** 鎸夋潵婧愬叧绯诲垪琛ㄦ敹闆嗕簲琛岋紙鍘婚噸銆佷繚搴忥級銆?*/
function deriveElements(rel: WuxingRelations, element: string, sources: readonly RelationName[]): string[] {
  const out: string[] = []
  for (const src of sources) {
    const v = follows(rel, src, element)
    if (v !== undefined && !out.includes(v)) out.push(v)
  }
  return out
}

/**
 * 鏃鸿“ 鈫?鍠滅敤绁?鈫?蹇岀 鍏ㄩ摼鎺ㄥ銆? * 鍛戒腑浠讳竴 strong 瑙勫垯 鈫?strong锛屽惁鍒?weak銆? */
export function inferWuxing(dayMaster: string, monthBranch: string): WuxingVerdict {
  const rel = loadRelations()

  const strengthReasons = strengthHits(wuxingData.strength_rules, rel, dayMaster, monthBranch)
  const strength: 'strong' | 'weak' = strengthReasons.length > 0 ? 'strong' : 'weak'
  const allStrengthReasons = strengthReasons.length > 0 ? strengthReasons : ['未命中任何旺规则，日主偏弱']

  let favorable: string[] = []
  let unfavorable: string[] = []
  const reasons: string[] = []

  for (const rule of wuxingData.favorable_rules) {
    if (rule.condition.strength !== strength) continue
    const vals = deriveElements(rel, dayMaster, rule.favorable_from)
    if (rule.include_self && !vals.includes(dayMaster)) vals.push(dayMaster)
    favorable = vals
    reasons.push(rule.reason)
  }

  for (const rule of wuxingData.unfavorable_rules) {
    if (rule.condition.strength !== strength) continue
    unfavorable = deriveElements(rel, dayMaster, rule.unfavorable_from)
    reasons.push(rule.reason)
  }

  return {
    day_master: dayMaster,
    month_branch: monthBranch,
    strength,
    strength_reasons: allStrengthReasons,
    favorable,
    unfavorable,
    reasons,
  }
}

/**
 * 鍏ㄧ粍鍚堟牎楠岋細鍠滅/蹇岀鏃犱氦闆嗐€傝繑鍥炲啿绐佹弿杩板垪琛紙绌?= 涓€鑷达級銆? */
export function validateConsistency(): string[] {
  const rel = loadRelations()
  const errors: string[] = []
  for (const dm of rel.elements) {
    for (const mb of rel.elements) {
      const v = inferWuxing(dm, mb)
      const overlap = v.favorable.filter(e => v.unfavorable.includes(e))
      if (overlap.length > 0) {
        errors.push(
          `${dm}@${mb}(${v.strength}) 喜忌重叠: favorable=${v.favorable.join('')} unfavorable=${v.unfavorable.join('')} 交集=${overlap.join('')}`,
        )
      }
    }
  }
  return errors
}
