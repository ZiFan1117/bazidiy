/**
 * 命名/消歧规则原子（bazidiy.rules.naming / parse 底层）。
 * 独立纯模块：珠子全称集合 + 同名变体消歧（直径匹配 → 非隔片 round 优先）。
 * @module @bazidiy/ontology/atoms/naming
 */
import { beads } from '../../kb/beadCatalog.ts'

export type BeadRow = (typeof beads)[number]

/** 珠名全称集合（禁止缩写/编造）。 */
export const VALID_NAMES: ReadonlySet<string> = new Set(beads.map((b) => b.name))

/** 名字是否在库内全称集合。 */
export function isCanonicalName(name: string): boolean {
  return VALID_NAMES.has(name)
}

/**
 * 按珠子全称 + 直径消歧到唯一珠子（bead）。
 * 同名多变体（小叶紫檀 round/buddha、白银 round/spacer）时：
 * 优先选直径匹配的变体；仍多个时非隔片（round）优先。
 */
export function resolveVariant(name: string, diameter: number): BeadRow | undefined {
  const byName = beads.filter((b) => b.name === name)
  if (byName.length === 0) return undefined
  const byDiameter = byName.filter((b) => (b.diameters as readonly number[]).includes(diameter))
  const pool = byDiameter.length > 0 ? byDiameter : byName
  const nonSpacer = pool.find((b) => b.variant !== 'spacer')
  return nonSpacer ?? pool[0]
}
