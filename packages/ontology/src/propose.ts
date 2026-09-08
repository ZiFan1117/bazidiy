/**
 * propose — 一链推理：旺衰 → 喜用神 → 筛珠 → 款式方案（bazidiy.propose_designs）。
 * 判据取自规则模块；筛珠走 atoms/selectBeads；款式求解走 solver。
 * @module @bazidiy/ontology/propose
 */

import { beads as beadsData } from './data/beads.ts'
import { wuxing as wuxingData } from './data/wuxing.ts'
import { inferWuxing } from './wuxing.ts'
import { isSpacer, solveStyles, loadStyles } from './solver.ts'
import { selectBeads } from './atoms/selectBeads.ts'
import type { Bead, DesignProposal } from './atoms/bazidiy.framework/contracts.ts'

/** 从数据构建珠对象（去只读 as const 类型）。 */
export function loadBeads(): Bead[] {
  return beadsData.map((b) => ({
    id: b.id,
    bead_id: b.bead_id,
    name: b.name,
    wuxing: b.wuxing,
    variant: b.variant,
    diameters: [...b.diameters],
    color: b.color,
    image: b.image,
  }))
}

/**
 * 一链推理。day_master_element 不在五元素内时返回空结果。
 */
export function propose(
  beadIds: string[],
  wristSize: number,
  dayMasterElement: string,
  monthBranchWuxing: string,
): DesignProposal {
  const elements = wuxingData.elements as readonly string[]
  if (!elements.includes(dayMasterElement)) {
    return {
      type: 'design_proposal',
      day_master: dayMasterElement,
      favorable: [],
      unfavorable: [],
      suitable: [],
      unsuitable: [],
      designs: [],
      unavailable_styles: [],
    }
  }

  const verdict = inferWuxing(dayMasterElement, monthBranchWuxing)
  const fav = verdict.favorable
  const avoid = new Set(verdict.unfavorable)

  const beads = loadBeads()
  const selectedIds = new Set(beadIds)
  const { suitable, unsuitable } = selectBeads(beads, avoid, selectedIds)

  const isSuitable = (b: Bead): boolean => isSpacer(b) || !avoid.has(b.wuxing)
  const matchBeads = beads.filter(isSuitable)
  const { proposals, unavailable } = solveStyles(loadStyles(), matchBeads, wristSize)

  return {
    type: 'design_proposal',
    day_master: dayMasterElement,
    favorable: fav,
    unfavorable: verdict.unfavorable,
    suitable,
    unsuitable,
    designs: proposals,
    unavailable_styles: unavailable,
  }
}
