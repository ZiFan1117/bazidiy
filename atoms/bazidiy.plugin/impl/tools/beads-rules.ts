/**
 * beads_rules 工具定义（bazidiy.plugin 的注册单元）。
 * @module @bazidiy/ontology/atoms/plugin/tools/beads-rules
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { listRules } from '../_atoms/rules/index.ts'

/** beads_rules 工具。 */
export const beadsRulesTool = () => defineTool({
  name: 'beads_rules',
  description: '返回珠子·八字·款式约束规则清单（R1–R14）：每条给出编号、名称、判据与实现归属。用于推导前了解支持范围与边界，不越界求解。',
  parameters: {},
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', required: true, const: 'rules_result' },
        rules: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              id: { type: 'string', required: true },
              name: { type: 'string', required: true },
              text: { type: 'string', required: true },
              source: { type: 'string', required: true },
            },
          },
        },
      },
    },
    render: (_args, value) => [{ type: 'text', text: `约束清单 ${(value.rules as unknown[]).length} 条（R1–R14）` }],
  },
  execute() {
    return Promise.resolve({ type: 'rules_result' as const, rules: [...listRules()] })
  },
})
