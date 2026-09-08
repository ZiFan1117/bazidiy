/**
 * 筛珠原子（bazidiy.select_beads）。
 * 按忌神集合把珠子分成 suitable / unsuitable（隔片豁免，不受五行限制），支持选定子集。
 * @module @bazidiy/ontology/atoms/selectBeads
 */
import type { Bead, BeadInfo, UnsuitableBead } from '../bazidiy.framework/contracts.ts'

/** 隔片恒定豁免：variant === 'spacer'。 */
export function isSpacerBead(b: Pick<Bead, 'variant'>): boolean {
  return b.variant === 'spacer'
}

export interface SelectResult {
  suitable: BeadInfo[]
  unsuitable: UnsuitableBead[]
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
 * 按喜忌筛选珠子：五行 ∈ 忌神 → unsuitable（reason=X 为忌神）；否则 suitable；隔片豁免。
 * @param beads 候选珠
 * @param avoid 忌神五行集合
 * @param selectedIds 限定 id/bead_id/name 子集；空集 = 全部
 */
export function selectBeads(beads: readonly Bead[], avoid: ReadonlySet<string>, selectedIds: ReadonlySet<string> = new Set()): SelectResult {
  const suitable: BeadInfo[] = []
  const unsuitable: UnsuitableBead[] = []
  for (const b of beads) {
    if (selectedIds.size > 0 && ![b.id, b.bead_id, b.name].some((t) => selectedIds.has(t))) {
      continue
    }
    const base = toInfo(b)
    if (isSpacerBead(b) || !avoid.has(b.wuxing)) {
      suitable.push(base)
    } else {
      unsuitable.push({ ...base, reason: `${b.wuxing} 为忌神` })
    }
  }
  return { suitable, unsuitable }
}
