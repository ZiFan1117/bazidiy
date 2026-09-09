/**
 * propose_designs 工具定义（bazidiy.plugin 的注册单元）。
 * @module @bazidiy/ontology/atoms/plugin/tools/propose-designs
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { propose } from '../_atoms/propose_designs/index.ts'

/** propose_designs 工具。 */
export const proposeDesignsTool = () => defineTool({
  name: 'propose_designs',
  description: '本体一次性推理：旺衰 → 喜用神 → 珠子分类 → 款式方案。传 bead_ids="" 使用全部珠子。返回 favorable/unfavorable/designs，直接引用，禁止自行推算。day_master_element 和 month_branch_wuxing 必须是单字五行（金/木/水/火/土），来自 calculate_bazi 返回的同名字段。',
  parameters: {
    bead_ids: { type: 'string', description: '逗号分隔的珠子 id，如 taishan-yu_round；空字符串=全部珠子' },
    wrist_size: { type: 'integer', description: '腕围 cm，默认 17' },
    day_master_element: { type: 'string', required: true, description: '日主五行，单字（金/木/水/火/土），来自 calculate_bazi 返回的 day_master_element' },
    month_branch_wuxing: { type: 'string', required: true, description: '月支五行，单字（金/木/水/火/土），来自 calculate_bazi 返回的 month_branch_wuxing' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', required: true, const: 'design_proposal' },
        day_master: { type: 'string', required: true },
        favorable: { type: 'array', required: true, items: { type: 'string' } },
        unfavorable: { type: 'array', required: true, items: { type: 'string' } },
        suitable: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              bead_id: { type: 'string', required: true },
              name: { type: 'string', required: true },
              wuxing: { type: 'string', required: true },
              variant: { type: 'string', required: true },
              diameters: { type: 'array', required: true, items: { type: 'integer' } },
              color: { type: 'string', required: true },
              icon: { type: 'string', required: true },
            },
          },
        },
        unsuitable: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              bead_id: { type: 'string', required: true },
              name: { type: 'string', required: true },
              wuxing: { type: 'string', required: true },
              variant: { type: 'string', required: true },
              diameters: { type: 'array', required: true, items: { type: 'integer' } },
              color: { type: 'string', required: true },
              icon: { type: 'string', required: true },
              reason: { type: 'string', required: true },
            },
          },
        },
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
      },
    },
    render: (_args, value) => [{
      type: 'text',
      text: `喜用神：${value.favorable.join('、')}；忌神：${value.unfavorable.join('、')}；${value.designs.length} 个方案可选`,
    }],
  },
  execute(args) {
    const ids = (args.bead_ids ?? '').split(',').map(s => s.trim()).filter(s => s.length > 0)
    const wrist = args.wrist_size ?? 17
    return Promise.resolve(propose(ids, wrist, args.day_master_element, args.month_branch_wuxing))
  },
})
