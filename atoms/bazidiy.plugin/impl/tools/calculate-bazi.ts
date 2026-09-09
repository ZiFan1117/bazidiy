/**
 * calculate_bazi 工具定义（bazidiy.plugin 的注册单元）。
 * @module @bazidiy/ontology/atoms/plugin/tools/calculate-bazi
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { calculateBazi } from '../_atoms/calculate_chart/index.ts'

/** calculate_bazi 工具。 */
export const calculateBaziTool = () => defineTool({
  name: 'calculate_bazi',
  description: '计算八字：公历生日 + 时辰 → 四柱 + 日主五行 + 月支五行。返回里的 day_master_element 是单字五行（金/木/水/火/土之一，不是"庚金"这种两字），month_branch_wuxing 也是单字五行，这两个值原样传给 propose_designs。',
  parameters: {
    birth_date: { type: 'string', required: true, description: '公历生日，格式 YYYY-MM-DD，如 1990-05-15' },
    birth_hour: { type: 'string', required: true, description: '时辰名，如 子时/午时' },
    gender: { type: 'string', required: true, enum: ['男', '女'], description: '性别' },
  },
  output: {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', required: true, const: 'bazi_result' },
        four_pillars: { type: 'string', required: true },
        day_master: { type: 'string', required: true, description: '日主，如"庚金"（天干+五行，展示用）' },
        day_master_element: { type: 'string', required: true, description: '日主五行，单字：金/木/水/火/土。传给 propose_designs 用这个值，不是 day_master' },
        wuxing_count: { type: 'object', additionalProperties: true, required: true },
        wuxing_details: {
          type: 'array', required: true,
          items: {
            type: 'object', additionalProperties: false,
            properties: {
              柱: { type: 'string', required: true },
              天干: { type: 'string', required: true },
              天干五行: { type: 'string', required: true },
              地支: { type: 'string', required: true },
              地支五行: { type: 'string', required: true },
            },
          },
        },
        month_branch: { type: 'string', required: true },
        month_branch_wuxing: { type: 'string', required: true, description: '月支五行，单字：金/木/水/火/土。传给 propose_designs 用这个值' },
      },
    },
    render: (_args, value) => [{
      type: 'text',
      text: `四柱：${value.four_pillars}；日主${value.day_master}；月支${value.month_branch}(${value.month_branch_wuxing})`,
    }],
  },
  execute(args) {
    return Promise.resolve(calculateBazi(args.birth_date, args.birth_hour, args.gender))
  },
})
