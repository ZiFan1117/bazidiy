/**
 * propose 鈥?鏈綋涓€閾炬帹鐞嗭細鏃鸿“ 鈫?鍠滅敤绁?鈫?鐝犲瓙鍒嗙被 鈫?娆惧紡鏂规銆? * @module @bazidiy/ontology/propose
 */

import { beads as beadsData } from './data/beads.ts'
import { wuxing as wuxingData } from './data/wuxing.ts'
import { inferWuxing } from './wuxing.ts'
import { isSpacer, solveStyles, loadStyles } from './solver.ts'
import type { Bead, BeadInfo, DesignProposal } from './types.ts'

/** 浠庢暟鎹瀯寤虹彔瀛愬璞★紙鍘?as const 鍙鎬э級銆?*/
export function loadBeads(): Bead[] {
  return beadsData.map(b => ({
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

function toInfo(b: Bead): BeadInfo {
  return {
    id: b.id,
    bead_id: b.bead_id,
    name: b.name,
    wuxing: b.wuxing,
    variant: b.variant,
    diameters: b.diameters,
    color: b.color,
    icon: '',
  }
}

/**
 * 涓€閾炬帹鐞嗐€俤ay_master_element 涓嶅湪浜斿厓绱犲唴鏃惰繑鍥炵┖缁撴灉銆? */
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

  const suitable: BeadInfo[] = []
  const unsuitable: DesignProposal['unsuitable'] = []

  const isSuitable = (b: Bead): boolean => isSpacer(b) || !avoid.has(b.wuxing)

  for (const b of beads) {
    if (selectedIds.size > 0 && ![b.id, b.bead_id, b.name].some(t => selectedIds.has(t))) {
      continue
    }
    const base = toInfo(b)
    if (isSuitable(b)) {
      suitable.push(base)
    } else {
      unsuitable.push({
        ...base,
        reason: `${b.wuxing} 为忌神`,
      })
    }
  }

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
