/**
 * BaziDIY ontology plugin: registers calculate_bazi, propose_designs, generate_design
 * as model-facing dsh tools. Deterministic only — no LLM calls inside execute.
 * @module @bazidiy/ontology
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { beads as beadsData } from './data/beads.ts'
import { calculateBazi } from './bazi.ts'
import { propose } from './propose.ts'
import { mountBeadAssets } from './assets.ts'
import { loadDesign, saveDesign, type SavedDesign } from './designs.ts'

export const name = 'bazidiy-ontology'
export const inject = ['tools']

const VALID_NAMES: ReadonlySet<string> = new Set(beadsData.map(b => b.name))

/** 一颗最终珠子槽位。`image` 是图片 key（= bead 的 id），`ratio` 是图片宽高比（前端据此渲染）。 */
interface DesignSlot {
  name: string
  diameter: number
  slot: number
  image: string
  ratio: number
}

/**
 * 按珠子全称 + 直径 消歧到唯一珠子（bead）。
 * 同名多变体（小叶紫檀 round/buddha、白银 round/spacer）时：
 * 优先选直径匹配的变体；仍多个时非隔片（round）优先。
 */
function resolveBead(name: string, diameter: number): (typeof beadsData)[number] | undefined {
  const byName = beadsData.filter(b => b.name === name)
  if (byName.length === 0) return undefined
  const byDiameter = byName.filter(b => (b.diameters as readonly number[]).includes(diameter))
  const pool = byDiameter.length > 0 ? byDiameter : byName
  const nonSpacer = pool.find(b => b.variant !== 'spacer')
  return nonSpacer ?? pool[0]
}

/** 把 "南红:8,碎银子:4" 解析为 slots；名字非全称返回 null。 */
function parseSlots(beads: string): DesignSlot[] | null {
  const slots: DesignSlot[] = []
  if (!beads) return slots
  const items = beads.split(',').map(s => s.trim()).filter(s => s.length > 0)
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item === undefined || !item.includes(':')) continue
    const colon = item.indexOf(':')
    const beadName = item.slice(0, colon).trim()
    const diaStr = item.slice(colon + 1).trim()
    if (!VALID_NAMES.has(beadName)) return null
    const diameter = Number.parseInt(diaStr, 10)
    const bead = resolveBead(beadName, diameter)
    if (bead === undefined) return null
    const ratio = bead.image_w / bead.image_h
    slots.push({ name: beadName, diameter, slot: i, image: bead.id, ratio })
  }
  return slots
}

/**
 * Register the ontology tools on ctx.tools.
 * @param ctx - registrant context carrying the tool registry.
 */
export function apply(ctx: Context): void {
  const disposeAssets = mountBeadAssets(ctx)
  if (disposeAssets !== undefined) {
    ctx.effect(() => disposeAssets, 'ontology.bead-assets()')
  }
  ctx.tools.register(defineTool({
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
  }))

  ctx.tools.register(defineTool({
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
  }))

  ctx.tools.register(defineTool({
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
      const slots = parseSlots(args.beads)
      if (slots === null) {
        return Promise.resolve({
          type: 'design_result',
          style_name: args.style_name,
          slots: [],
          wrist_size: args.wrist_size ?? '',
          summary: args.summary,
          rationale: args.rationale,
          note: '珠子名未识别，请使用全称（如"小叶紫檀"，不要缩写）',
        })
      }
      return Promise.resolve({
        type: 'design_result',
        style_name: args.style_name,
        slots,
        wrist_size: args.wrist_size ?? '',
        summary: args.summary,
        rationale: args.rationale,
      })
    },
  }))

  ctx.tools.register(defineTool({
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
  }))

  ctx.tools.register(defineTool({
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
  }))
}
