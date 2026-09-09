/**
 * 款式规则 —— 从 data/styles.ts 构建 Style/Position/Constraint。
 * 约束由类型化声明驱动（diameter/spacer_map/same_bead），无 hardness。
 * @module @bazidiy/ontology/styles
 */

import { styles as stylesData } from '../kb/styleLibrary.ts'
import type { Bead } from '../kb/contracts.ts'

/** 隔片直径映射。单一事实源：kb/style-library.ttl 的 spacerMap 个体 → styleLibrary 绑定的 spacer_diameter_map。 */
const spacerMapRaw = (stylesData as { spacer_diameter_map?: Record<string, number> }).spacer_diameter_map ?? {}
export const SPACER_MAP: Record<string, number> = spacerMapRaw

export interface Position {
  slot: number
  role: string
  min_dia?: number
  max_dia?: number
  variant_filter?: string[]
}

export interface Constraint {
  name: string
  type: string
  variables: string[]
  params?: Record<string, unknown>
  reason: string
}

export interface Style {
  style_id: string
  name: string
  positions: Position[]
  constraints: Constraint[]
}

/** 从款式声明构建 Position。 */
function buildPosition(p: {
  slot: number
  role?: string
  min_dia?: number
  max_dia?: number
  variant_filter?: string[]
}): Position {
  return {
    slot: p.slot,
    role: p.role ?? 'body',
    ...(p.min_dia !== undefined ? { min_dia: p.min_dia } : {}),
    ...(p.max_dia !== undefined ? { max_dia: p.max_dia } : {}),
    ...(p.variant_filter !== undefined ? { variant_filter: p.variant_filter } : {}),
  }
}

/** 从款式声明构建 Constraint。 */
function buildConstraint(c: {
  name: string
  type: string
  variables: string[]
  params?: Record<string, unknown>
  reason?: string
}): Constraint {
  return {
    name: c.name,
    type: c.type,
    variables: c.variables,
    ...(c.params !== undefined ? { params: c.params } : {}),
    reason: c.reason ?? '',
  }
}

/** 从 data/styles.ts 构建全部款式。 */
export function loadStyles(): Style[] {
  const raw = stylesData.styles as unknown as Record<string, {
    name: string
    positions: Array<Parameters<typeof buildPosition>[0]>
    constraints: Array<Parameters<typeof buildConstraint>[0]>
  }>
  return Object.entries(raw).map(([id, cfg]) => ({
    style_id: id,
    name: cfg.name,
    positions: cfg.positions.map(buildPosition),
    constraints: cfg.constraints.map(buildConstraint),
  }))
}

/** 珠子是否满足某槽位的直径/类型过滤。 */
export function candidatesFor(bead: Bead, pos: Position): boolean {
  if (pos.variant_filter && !pos.variant_filter.includes(bead.variant)) return false
  const minDia = pos.min_dia
  if (minDia !== undefined && !bead.diameters.some(d => d >= minDia)) return false
  const maxDia = pos.max_dia
  if (maxDia !== undefined && !bead.diameters.some(d => d <= maxDia)) return false
  return true
}

/** 约束类型 → 校验函数。 */
const CHECKERS: Record<string, (beads: Bead[], params: Record<string, unknown>) => boolean> = {
  diameter(beads, params) {
    const main = beads[0]
    const body = beads.length > 1 ? beads[1] : undefined
    const mainMin = typeof params.main_min === 'number' ? params.main_min : 0
    const bodySet = Array.isArray(params.body) ? params.body.filter((d): d is number => typeof d === 'number') : []
    const mainOk = main !== undefined && main.diameters.some(d => d >= mainMin)
    const bodyOk = body === undefined || body.diameters.some(d => bodySet.includes(d))
    return mainOk && bodyOk
  },
  spacer_map(beads) {
    const body = beads.length > 1 ? beads[1] : undefined
    if (body === undefined) return true
    const bodyDia = body.diameters.find(d => d === 6 || d === 8) ?? 0
    return String(bodyDia) in SPACER_MAP
  },
  same_bead(beads) {
    return beads[0] !== undefined && beads[1] !== undefined && beads[0].name === beads[1].name
  },
}

/** 对一组按 variables 顺序取出的珠子，执行约束校验。 */
export function checkConstraint(type: string, beads: Bead[], params: Record<string, unknown>): boolean {
  const checker = CHECKERS[type]
  if (checker === undefined) throw new Error(`unknown constraint type ${JSON.stringify(type)}`)
  return checker(beads, params)
}
