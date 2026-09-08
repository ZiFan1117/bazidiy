/**
 * 旺衰/喜忌推理（bazidiy.infer_verdict 引擎层）。
 * 判据逻辑已下沉到规则原子：atoms/rules/{strength,verdictChoice,consistency}；本模块只做组合与类型对齐。
 * @module @bazidiy/ontology/wuxing
 */

import { judgeStrength } from './atoms/rules/strength.ts'
import { chooseVerdict } from './atoms/rules/verdictChoice.ts'
import { checkConsistency } from './atoms/rules/consistency.ts'
import { loadRelations } from './atoms/rules.relations/index.ts'
import type { WuxingVerdict } from './types.ts'

export { loadRelations } from './atoms/rules.relations/index.ts'
export { checkConsistency }
/** 一致性自检（兼容导出名）。 */
export const validateConsistency = checkConsistency

/**
 * 判旺衰并推喜忌。
 * @param dayMaster 日主五行（单字）
 * @param monthBranch 月支五行（单字）
 */
export function inferWuxing(dayMaster: string, monthBranch: string): WuxingVerdict {
  const { strength, strengthReasons } = judgeStrength(dayMaster, monthBranch)
  const verdict = chooseVerdict(strength, dayMaster)
  return {
    day_master: dayMaster,
    month_branch: monthBranch,
    strength,
    strength_reasons: strengthReasons,
    favorable: verdict.favorable,
    unfavorable: verdict.unfavorable,
    reasons: verdict.reasons,
  }
}
