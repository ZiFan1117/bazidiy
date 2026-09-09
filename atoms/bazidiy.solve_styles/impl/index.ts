/**
 * 款式求解引擎 — 珠子 + 款式 → 设计方案。
 * 自写组合枚举（候选集 < 40，无需 python-constraint）。
 * @module @bazidiy/ontology/solver
 */

import type { Bead, DesignOption } from '../kb/contracts.ts'
import { wuxing as wuxingData } from '../kb/wuxing.ts'
import { SPACER_MAP, candidatesFor, checkConstraint, loadStyles } from '../styles/index.ts'
import type { Position, Style } from '../styles/index.ts'

/** 腕围 + 珠径 → 手串颗数（圆形展开物理公式）。 */
export function beadCount(wristCm: number, diameterMm: number, spacerMm?: number): number {
  const rMm = wristCm * 10 / (2 * Math.PI) + diameterMm / 2
  const circumferenceMm = 2 * Math.PI * rMm
  if (spacerMm) {
    const groups = Math.max(1, Math.round(circumferenceMm / (2 * diameterMm + spacerMm)))
    return groups * 3
  }
  return Math.max(3, Math.round(circumferenceMm / diameterMm))
}

/** 五行顺序（取自 wuxing 数据，数据驱动）。 */
export function wuxingOrder(): string[] {
  return [...wuxingData.elements]
}

/** 是否为隔片。 */
export function isSpacer(bead: Bead): boolean {
  return bead.variant === 'spacer'
}

/** 组合枚举：每个变量的 domain 笛卡尔积，过滤出满足约束的前 limit 个解。 */
function solveConstraints(
  positions: readonly Position[],
  beads: readonly Bead[],
  constraints: Style['constraints'],
  limit = 2,
): Array<Map<number, Bead>> {
  const nonSpacer = beads.filter(b => !isSpacer(b))
  const spacers = beads.filter(b => isSpacer(b))

  const domains: Bead[][] = []
  for (const pos of positions) {
    const dom = pos.role === 'spacer'
      ? spacers
      : nonSpacer.filter(b => candidatesFor(b, pos))
    if (dom.length === 0) return []
    domains.push(dom)
  }

  const solutions: Array<Map<number, Bead>> = []
  // 笛卡尔积 + 约束过滤（递归枚举，逐层回退）
  const combo: Bead[] = []
  const walk = (depth: number): boolean => {
    if (depth === domains.length) {
      // 逐约束校验：variables 名 v0..vn 映射到 combo 对应位置
      for (const c of constraints) {
        const involved: Bead[] = []
        for (const v of c.variables) {
          const vi = Number(v.slice(1))
          const bead = combo[vi]
          if (bead !== undefined) involved.push(bead)
        }
        if (!checkConstraint(c.type, involved, c.params ?? {})) return false
      }
      const map = new Map<number, Bead>()
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i]
        const bead = combo[i]
        if (pos === undefined || bead === undefined) continue
        map.set(pos.slot, bead)
      }
      solutions.push(map)
      return solutions.length >= limit
    }
    const dom = domains[depth]
    if (dom === undefined) return false
    for (const bead of dom) {
      combo.push(bead)
      if (walk(depth + 1)) return true
      combo.pop()
    }
    return false
  }
  walk(0)
  return solutions
}

interface DesignProposalInternal {
  style: string
  style_name: string
  beads: string
  count: number
  diameter?: number
  main_dia?: number
  body_dia?: number
}

function b01Proposals(style: Style, bead: Bead, wristSize: number): DesignProposalInternal[] {
  const out: DesignProposalInternal[] = []
  for (const dia of [...bead.diameters].sort((a, b) => a - b)) {
    const count = beadCount(wristSize, dia)
    out.push({
      style: style.style_id, style_name: style.name,
      beads: Array.from({ length: count }, () => `${bead.name}:${dia}`).join(','),
      count, diameter: dia,
    })
  }
  return out
}

function b02Proposals(
  style: Style, main: Bead, body: Bead, spacer: Bead | undefined, wristSize: number,
): DesignProposalInternal[] {
  const out: DesignProposalInternal[] = []
  const spacerDia = spacer ? (SPACER_MAP[String(body.diameters[0])] ?? 4) : 4
  for (const md of [...main.diameters].sort((a, b) => a - b)) {
    if (md < 10) continue
    for (const bd of [...body.diameters].sort((a, b) => a - b)) {
      if (bd !== 6 && bd !== 8) continue
      const count = beadCount(wristSize, bd)
      const seq: string[] = [`${main.name}:${md}`]
      if (spacer) seq.push(`${spacer.name}:${spacerDia}`)
      for (let k = 0; k < count - 3; k++) seq.push(`${body.name}:${bd}`)
      if (spacer) seq.push(`${spacer.name}:${spacerDia}`)
      out.push({
        style: style.style_id, style_name: style.name,
        beads: seq.join(','), count, main_dia: md, body_dia: bd,
      })
    }
  }
  return out
}

function b03Proposals(
  style: Style, main: Bead, spacer: Bead | undefined, wristSize: number,
): DesignProposalInternal[] {
  const out: DesignProposalInternal[] = []
  for (const dia of [...main.diameters].sort((a, b) => a - b)) {
    const sDia = SPACER_MAP[String(dia)]
    if (sDia === undefined) continue
    const count = beadCount(wristSize, dia, sDia)
    const groups = Math.floor(count / 3)
    const seq: string[] = spacer
      ? [`${main.name}:${dia}`, `${main.name}:${dia}`, `${spacer.name}:${sDia}`]
      : [`${main.name}:${dia}`, `${main.name}:${dia}`, `${main.name}:${dia}`]
    out.push({
      style: style.style_id, style_name: style.name,
      beads: Array.from({ length: groups }, () => seq).flat().join(','),
      count, diameter: dia,
    })
  }
  return out
}

function b10Proposals(
  style: Style, beadsByWuxing: Map<string, Bead[]>, wristSize: number,
): DesignProposalInternal[] {
  const order = wuxingOrder()
  const groups: Record<string, Bead[]> = {}
  for (const wx of order) groups[wx] = (beadsByWuxing.get(wx) ?? []).filter(b => !isSpacer(b))
  if (order.some(wx => (groups[wx] ?? []).length === 0)) return []

  // 全部五行共有的直径
  let common: Set<number> | null = null
  for (const wx of order) {
    const set = new Set<number>()
    for (const b of groups[wx] ?? []) for (const d of b.diameters) set.add(d)
    if (common === null) {
      common = set
    } else {
      const next = new Set<number>()
      for (const d of common) if (set.has(d)) next.add(d)
      common = next
    }
  }
  if (common === null || common.size === 0) return []

  const out: DesignProposalInternal[] = []
  for (const dia of [...common].sort((a, b) => a - b)) {
    const count = beadCount(wristSize, dia)
    const seg = Math.floor(count / 5)
    if (seg < 1) continue
    const finalCount = seg * 5
    const seq: string[] = []
    for (const wx of order) {
      const bead = (groups[wx] ?? [])[0]
      if (bead === undefined) continue
      for (let k = 0; k < seg; k++) seq.push(`${bead.name}:${dia}`)
    }
    out.push({
      style: style.style_id, style_name: style.name,
      beads: seq.join(','), count: finalCount, diameter: dia,
    })
  }
  return out.slice(0, 2)
}

function toOption(p: DesignProposalInternal): DesignOption {
  const d: DesignOption = { style: p.style, style_name: p.style_name, beads: p.beads, count: p.count }
  if (p.diameter !== undefined) d.diameter = p.diameter
  if (p.main_dia !== undefined) d.main_dia = p.main_dia
  if (p.body_dia !== undefined) d.body_dia = p.body_dia
  return d
}

/**
 * 对所有款式求解，返回 (proposals, unavailable_styles)。
 */
export function solveStyles(
  styles: readonly Style[],
  suitableBeads: readonly Bead[],
  wristSize: number,
  maxProposals = 10,
): { proposals: DesignOption[]; unavailable: Array<{ style: string; reason: string }> } {
  const beadsByWuxing = new Map<string, Bead[]>()
  for (const b of suitableBeads) {
    const list = beadsByWuxing.get(b.wuxing) ?? []
    list.push(b)
    beadsByWuxing.set(b.wuxing, list)
  }

  const proposals: DesignOption[] = []
  const unavailable: Array<{ style: string; reason: string }> = []

  for (const style of styles) {
    if (style.style_id === 'B-10') {
      const b10 = b10Proposals(style, beadsByWuxing, wristSize)
      if (b10.length === 0) {
        unavailable.push({ style: style.style_id, reason: '五行各缺一种可选珠' })
        continue
      }
      proposals.push(...b10.map(toOption))
      continue
    }

    const matched = solveConstraints(style.positions, suitableBeads, style.constraints)
    if (matched.length === 0) {
      unavailable.push({ style: style.style_id, reason: '无匹配组合' })
      continue
    }
    for (const byPos of matched) {
      proposals.push(...expandDesign(style, byPos, wristSize).map(toOption))
    }
  }

  return { proposals: proposals.slice(0, maxProposals), unavailable }
}

/** 把一次约束解（slot → bead）按款式展开为具体方案。 */
function expandDesign(style: Style, byPos: Map<number, Bead>, wristSize: number): DesignProposalInternal[] {
  if (style.style_id === 'B-01') {
    const main = byPos.get(0)
    if (main === undefined) return []
    return b01Proposals(style, main, wristSize)
  }
  if (style.style_id === 'B-02') {
    const main = byPos.get(0)
    const body = byPos.get(2)
    const spacer = byPos.get(1) ?? byPos.get(-1)
    if (main === undefined || body === undefined) return []
    return b02Proposals(style, main, body, spacer, wristSize)
  }
  if (style.style_id === 'B-03') {
    const main = byPos.get(0)
    const spacer = byPos.get(2)
    if (main === undefined) return []
    return b03Proposals(style, main, spacer, wristSize)
  }
  return []
}

export { loadStyles }
