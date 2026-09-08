/**
 * 珠序解析原子（bazidiy.parse_slots）。
 * 把 "南红:8,碎银子:4,南红:8" 解析/消歧为槽位序列；含未知名/缩写 → 整体 null。
 * @module @bazidiy/ontology/atoms/parseSlots
 */
import { resolveVariant, isCanonicalName } from '../rules.naming/index.ts'

/** 一颗最终珠子槽位。`image` 是图片 key（= bead 的 id），`ratio` 是图片宽高比（前端据此渲染）。 */
export interface DesignSlot {
  name: string
  diameter: number
  slot: number
  image: string
  ratio: number
}

/** 把 "南红:8,碎银子:4" 解析为 slots；名字非全称返回 null。 */
export function parseSlots(beads: string): DesignSlot[] | null {
  const slots: DesignSlot[] = []
  if (!beads) return slots
  const items = beads.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item === undefined || !item.includes(':')) continue
    const colon = item.indexOf(':')
    const beadName = item.slice(0, colon).trim()
    const diaStr = item.slice(colon + 1).trim()
    if (!isCanonicalName(beadName)) return null
    const diameter = Number.parseInt(diaStr, 10)
    const bead = resolveVariant(beadName, diameter)
    if (bead === undefined) return null
    const ratio = bead.image_w / bead.image_h
    slots.push({ name: beadName, diameter, slot: i, image: bead.id, ratio })
  }
  return slots
}
