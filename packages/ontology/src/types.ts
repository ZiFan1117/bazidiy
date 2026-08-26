/**
 * Pure types of the BaziDIY ontology domain. No runtime imports here.
 * @module @bazidiy/ontology/types
 */

/** A bead record from the catalog. */
export interface Bead {
  id: string
  bead_id: string
  name: string
  wuxing: string
  variant: string
  diameters: number[]
  color: string
  image: string
}

/** A bead with its suitability resolved, for a proposal output. */
export interface BeadInfo {
  id: string
  bead_id: string
  name: string
  wuxing: string
  variant: string
  diameters: number[]
  color: string
  icon: string
}

/** An unsuitable bead carries a reason. */
export interface UnsuitableBead extends BeadInfo {
  reason: string
}

/** One selectable design option produced by the solver. */
export interface DesignOption {
  style: string
  style_name: string
  beads: string
  count: number
  diameter?: number
  main_dia?: number
  body_dia?: number
}

/** The result of inferWuxing. */
export interface WuxingVerdict {
  day_master: string
  month_branch: string
  strength: 'strong' | 'weak'
  strength_reasons: string[]
  favorable: string[]
  unfavorable: string[]
  reasons: string[]
}

/** The full proposal produced by propose(). */
export interface DesignProposal {
  type: 'design_proposal'
  day_master: string
  favorable: string[]
  unfavorable: string[]
  suitable: BeadInfo[]
  unsuitable: UnsuitableBead[]
  designs: DesignOption[]
  unavailable_styles: Array<{ style: string; reason: string }>
}
