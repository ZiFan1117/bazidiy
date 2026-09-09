/**
 * beads_derive 工具定义（bazidiy.plugin 的注册单元）。
 * @module @bazidiy/ontology/atoms/plugin/tools/beads-derive
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { derive } from '../_atoms/derive/index.ts'

/** beads_derive 工具。 */
export const beadsDeriveTool = () => defineTool({
  name: 'beads_derive',
  description: '统一确定性推导：生日+时辰 → 八字/旺衰/喜忌 → 候选材质 → 各款式逐槽方案，并附 R1–R14 证据链。封闭世界：域外输入返回 ok=false 与 reason。禁止自行推算八字或搭配，一律以本工具结果为准。',
  parameters: {
    birth_date: { type: 'string', required: true, description: '公历生日 YYYY-MM-DD，如 1990-05-15' },
    birth_hour: { type: 'string', required: true, description: '时辰名，如 午时' },
    wrist_cm: { type: 'number', required: true, description: '腕围 cm' },
    bead_ids: { type: 'string', description: '限定候选珠（逗号分隔 id/bead_id/name），留空=全部' },
    style_ids: { type: 'string', description: '只对指定款式求解（B-01..B-10，逗号分隔），留空=全部' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', required: true, const: 'derive_result' },
        ok: { type: 'boolean', required: true },
        day_master: { type: 'string', required: true },
        day_master_element: { type: 'string', required: true },
        strength: { type: 'string', required: true },
        favorable: { type: 'array', required: true, items: { type: 'string' } },
        unfavorable: { type: 'array', required: true, items: { type: 'string' } },
        designs: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              style: { type: 'string', required: true },
              style_name: { type: 'string', required: true },
              beads: { type: 'string', required: true },
              count: { type: 'integer', required: true },
              diameter: { type: 'integer' },
              main_dia: { type: 'integer' },
              body_dia: { type: 'integer' },
            },
          },
        },
        unavailable_styles: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              style: { type: 'string', required: true },
              reason: { type: 'string', required: true },
            },
          },
        },
        evidence: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              rule_id: { type: 'string', required: true },
              input: { type: 'string', required: true },
              output: { type: 'string', required: true },
            },
          },
        },
        reason: { type: 'string' },
      },
    },
    render: (_args, value) => {
      const v = value as unknown as {
        ok: boolean
        day_master: string
        strength: string
        favorable: string[]
        unfavorable: string[]
        designs: unknown[]
        evidence: unknown[]
        reason?: string
      }
      if (!v.ok) return [{ type: 'text', text: `无法推导：${v.reason ?? '域外输入'}` }]
      return [{
        type: 'text',
        text: `${v.day_master} 身${v.strength === 'strong' ? '旺' : '弱'}｜喜 ${v.favorable.join('')}｜忌 ${v.unfavorable.join('')}｜${v.designs.length} 个方案（证据 ${v.evidence.length} 条）`,
      }]
    },
  },
  execute(args) {
    const beadIds = (args.bead_ids ?? '').split(',').map(s => s.trim()).filter(Boolean)
    const styleIds = (args.style_ids ?? '').split(',').map(s => s.trim()).filter(Boolean)
    return Promise.resolve({
      type: 'derive_result' as const,
      ...derive({
        birth_date: args.birth_date,
        birth_hour: args.birth_hour,
        wrist_cm: Number(args.wrist_cm),
        bead_ids: beadIds,
        ...styleIds.length > 0 ? { style_ids: styleIds } : {},
      }),
    })
  },
})
