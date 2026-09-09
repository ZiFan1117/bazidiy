/**
 * generate_design 工具定义（bazidiy.plugin 的注册单元）。
 * @module @bazidiy/ontology/atoms/plugin/tools/generate-design
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { generateDesign, type GenerateInput } from '../_atoms/generate_design/index.ts'

/** generate_design 工具。 */
export const generateDesignTool = () => defineTool({
  name: 'generate_design',
  description: '输出最终设计方案。style_name 必须来自 propose_designs 的 designs；beads 必须是完整珠子序列（格式 珠名:直径,珠名:直径）。珠子名必须全称，禁止缩写。',
  parameters: {
    style_name: { type: 'string', required: true, description: '款式编号，如 B-01（来自 designs）' },
    beads: { type: 'string', required: true, description: '完整珠子序列，如 南红:8,碎银子:4,南红:8' },
    wrist_size: { type: 'string', description: '腕围 cm' },
    summary: { type: 'string', required: true, description: '一句话设计说明，≤50 字' },
    rationale: { type: 'string', required: true, description: '设计理由' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', required: true, const: 'design_result' },
        style_name: { type: 'string', required: true },
        slots: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              name: { type: 'string', required: true },
              diameter: { type: 'integer', required: true },
              slot: { type: 'integer', required: true },
              image: { type: 'string', required: true },
              ratio: { type: 'number', required: true },
            },
          },
        },
        wrist_size: { type: 'string', required: true },
        summary: { type: 'string', required: true },
        rationale: { type: 'string', required: true },
        note: { type: 'string' },
      },
    },
    render: (_args, value) => {
      if (value.note) return [{ type: 'text', text: value.note }]
      return [{ type: 'text', text: `${value.style_name}：${value.slots.length} 颗珠子 — ${value.summary}` }]
    },
    presentationMeta: (_args, value) => ({
      style_name: value.style_name,
      wrist_size: value.wrist_size,
      summary: value.summary,
      slots: value.slots,
    }),
  },
  execute(args) {
    const input: GenerateInput = {
      style_name: args.style_name,
      beads: args.beads,
      summary: args.summary,
      rationale: args.rationale,
    }
    if (args.wrist_size !== undefined) input.wrist_size = args.wrist_size
    return Promise.resolve(generateDesign(input))
  },
})
