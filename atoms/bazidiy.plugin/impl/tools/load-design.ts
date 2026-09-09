/**
 * load_design 工具定义（bazidiy.plugin 的注册单元）。
 * @module @bazidiy/ontology/atoms/plugin/tools/load-design
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import { loadDesign } from '../_atoms/design_memory/index.ts'

/** load_design 工具。 */
export const loadDesignTool = (ctx: Context) => defineTool({
  name: 'load_design',
  description: '读取当前会话之前用 save_design 保存的设计方案。若没有保存过，返回 saved=false。',
  parameters: {},
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', required: true, const: 'design_loaded' },
        saved: { type: 'boolean', required: true },
        style_name: { type: 'string' },
        slots: {
          type: 'array',
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
        wrist_size: { type: 'string' },
        summary: { type: 'string' },
        rationale: { type: 'string' },
      },
    },
    render: (_args, value) => {
      if (!value.saved) return [{ type: 'text', text: '本会话还没有保存过方案。' }]
      return [{
        type: 'text',
        text: `已恢复 ${value.style_name}（${value.slots?.length ?? 0} 颗珠子）：${value.summary ?? ''}`,
      }]
    },
  },
  execute(_args, exec) {
    const sessionId = exec.agent?.session.id
    if (sessionId === undefined) {
      return Promise.reject(new Error('load_design 只能在 agent 会话内调用（缺少会话上下文）'))
    }
    return loadDesign(ctx, sessionId).then((design) => {
      if (design === undefined) {
        return { type: 'design_loaded' as const, saved: false as const }
      }
      return {
        type: 'design_loaded' as const,
        saved: true as const,
        style_name: design.style_name,
        slots: design.slots,
        wrist_size: design.wrist_size,
        summary: design.summary,
        rationale: design.rationale,
      }
    })
  },
})
