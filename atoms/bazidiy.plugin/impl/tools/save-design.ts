/**
 * save_design 工具定义（bazidiy.plugin 的注册单元）。
 * @module @bazidiy/ontology/atoms/plugin/tools/save-design
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { saveDesign, type SavedDesign } from '../_atoms/design_memory/index.ts'

/** save_design 工具。 */
export const saveDesignTool = (ctx: Context) => defineTool({
  name: 'save_design',
  description: '把当前会话的最终设计方案保存下来，之后可用 load_design 恢复。保存后无需重新推理即可回到这套珠子组合。',
  parameters: {
    style_name: { type: 'string', required: true, description: '款式编号，如 B-01' },
    slots: {
      type: 'array', required: true,
      description: '珠子序列，来自 generate_design 返回的 slots，逐字照抄',
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
    summary: { type: 'string', required: true, description: '一句话设计说明' },
    rationale: { type: 'string', required: true },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', required: true, const: 'design_saved' },
        style_name: { type: 'string', required: true },
        count: { type: 'integer', required: true },
      },
    },
    render: (_args, value) => [{
      type: 'text',
      text: `已保存 ${value.style_name}（${value.count} 颗珠子）。需要恢复时告诉我即可。`,
    }],
  },
  execute(args, exec) {
    const sessionId = exec.agent?.session.id
    if (sessionId === undefined) {
      return Promise.reject(new Error('save_design 只能在 agent 会话内调用（缺少会话上下文）'))
    }
    const design: SavedDesign = {
      style_name: args.style_name,
      slots: args.slots,
      wrist_size: args.wrist_size,
      summary: args.summary,
      rationale: args.rationale,
    }
    return saveDesign(ctx, sessionId, design).then(() => ({
      type: 'design_saved' as const,
      style_name: args.style_name,
      count: args.slots.length,
    }))
  },
})
