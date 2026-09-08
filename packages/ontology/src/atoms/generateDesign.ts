/**
 * 定稿原子（bazidiy.generate_design）。
 * 解析并全称校验珠序，产出可渲染 design_result；非法珠名 → 带 note 的拒绝结果。
 * @module @bazidiy/ontology/atoms/generateDesign
 */
import { parseSlots, type DesignSlot } from './parseSlots.ts'

export interface GenerateInput {
  style_name: string
  beads: string
  wrist_size?: string
  summary: string
  rationale: string
}

export interface DesignResult {
  type: 'design_result'
  style_name: string
  slots: DesignSlot[]
  wrist_size: string
  summary: string
  rationale: string
  note?: string
}

/** 解析并校验完整珠序后定稿。珠子名须全称；非法时 note 提示。 */
export function generateDesign(input: GenerateInput): DesignResult {
  const slots = parseSlots(input.beads)
  const base = {
    type: 'design_result' as const,
    style_name: input.style_name,
    wrist_size: input.wrist_size ?? '',
    summary: input.summary,
    rationale: input.rationale,
  }
  if (slots === null) {
    return { ...base, slots: [], note: '珠子名未识别，请使用全称（如"小叶紫檀"，不要缩写）' }
  }
  return { ...base, slots }
}
