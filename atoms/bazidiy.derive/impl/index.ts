/**
 * bazidiy.derive —— 统一确定性推导入口。
 * 串联 R1–R14：八字排盘 → 旺衰/喜忌 → 材质匹配 → 款式求解（逐槽）。
 * 语义：封闭世界 —— 输入域外即 ok:false + reason（R12），结果有限且带证据链。
 * @module @bazidiy/ontology/atoms/derive
 */

import { calculateBazi } from '../calculate_chart/index.ts'
import { inferWuxing } from '../infer_verdict/index.ts'
import { propose } from '../propose_designs/index.ts'
import { Evidence, type EvidenceEntry } from './evidence.ts'
import { isWuxingElement } from '../rules/index.ts'
import type { DesignOption } from '../kb/contracts.ts'

export { Evidence, chain, type EvidenceEntry } from './evidence.ts'

/** 统一推导请求。 */
export interface DeriveRequest {
  /** 公历生日 YYYY-MM-DD。 */
  birth_date: string
  /** 时辰名，如 午时。 */
  birth_hour: string
  /** 性别（暂不影响排盘）。 */
  gender?: string
  /** 腕围 cm（珠数计算用）。 */
  wrist_cm: number
  /** 限定候选珠（id/bead_id/name 之一）；空数组 = 全部。 */
  bead_ids?: string[]
  /** 只对指定款式求解（B-01..B-10）；缺省 = 全部款式。 */
  style_ids?: string[]
}

/** 统一推导结果；ok=false 时 designs 为空且 reason 给出域外原因。 */
export interface DeriveResult {
  ok: boolean
  day_master: string
  day_master_element: string
  strength: 'strong' | 'weak'
  favorable: string[]
  unfavorable: string[]
  designs: DesignOption[]
  unavailable_styles: Array<{ style: string; reason: string }>
  /** 证据链：逐条可回放 rule_id（R1–R14）。 */
  evidence: EvidenceEntry[]
  /** ok=false 时的原因（域外拒绝，R12）。 */
  reason?: string
}

/**
 * 统一推导：生日+时辰 → 八字/旺衰/喜忌 → 候选材质 → 各款式逐槽方案。
 * @param req - 推导请求。
 * @returns 带证据链的推导结果；域外输入返回 ok:false + reason。
 */
export function derive(req: DeriveRequest): DeriveResult {
  const evidence = new Evidence()
  const bazi = calculateBazi(req.birth_date, req.birth_hour, req.gender ?? '男')
  const dayElement = bazi.day_master_element
  const monthElement = bazi.month_branch_wuxing

  evidence.add('R1', '四柱', bazi.four_pillars)
  evidence.add('R1', '日主', bazi.day_master)

  if (!isWuxingElement(dayElement) || !isWuxingElement(monthElement)) {
    return {
      ok: false,
      day_master: bazi.day_master,
      day_master_element: dayElement,
      strength: 'weak',
      favorable: [],
      unfavorable: [],
      designs: [],
      unavailable_styles: [],
      evidence: evidence.snapshot(),
      reason: `R12 输入五行不在受支持框架内（日主=${dayElement}，月支=${monthElement}）`,
    }
  }

  const verdict = inferWuxing(dayElement, monthElement)
  for (const reason of verdict.strength_reasons) evidence.add('R2', '旺衰', reason)
  for (const reason of verdict.reasons) evidence.add('R3', '喜忌', reason)

  const proposal = propose(req.bead_ids ?? [], req.wrist_cm, dayElement, monthElement)
  const unavailable = proposal.unavailable_styles

  if (req.style_ids !== undefined && req.style_ids.length > 0) {
    const wanted = new Set(req.style_ids)
    const kept = proposal.designs.filter(d => wanted.has(d.style))
    const styleEvidence: EvidenceEntry[] = kept.map(d => ({
      rule_id: 'R14',
      input: `${d.style}@${d.beads}`,
      output: `逐槽方案 count=${d.count}`,
    }))
    return {
      ok: kept.length > 0,
      day_master: bazi.day_master,
      day_master_element: dayElement,
      strength: verdict.strength,
      favorable: verdict.favorable,
      unfavorable: verdict.unfavorable,
      designs: kept,
      unavailable_styles: unavailable,
      evidence: [...evidence.snapshot(), ...styleEvidence],
      ...kept.length > 0 ? {} : { reason: `R12 指定款式无可行方案（${[...wanted].join('、')}）` },
    }
  }

  evidence.add('R5', '候选(喜用∖忌)', proposal.suitable.map(b => `${b.name}:${b.wuxing}`))
  for (const u of unavailable) evidence.add('R12', `${u.style} 不可用`, u.reason)

  return {
    ok: true,
    day_master: bazi.day_master,
    day_master_element: dayElement,
    strength: verdict.strength,
    favorable: verdict.favorable,
    unfavorable: verdict.unfavorable,
    designs: proposal.designs,
    unavailable_styles: unavailable,
    evidence: [...evidence.snapshot(), ...proposal.designs.map(d => ({
      rule_id: 'R14',
      input: `${d.style} @ ${d.diameter ?? d.main_dia ?? ''}`,
      output: `${d.beads}（count=${d.count}）`,
    }))],
  }
}
