// Proves the ontology plugin registers its three tools through the real Loader
// and that each execute returns the canonical structured output.
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import { CallId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import AgentRegistry, { Inbox } from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import Storage from '@deepseek-ai/dsh-storage'
import * as StorageJson from '@deepseek-ai/dsh-storage-json'
import * as StorageDomain from '@deepseek-ai/dsh-storage-domain'
import * as Ontology from '../src/index.ts'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

function agent(ctx: Context): Agent {
  const scope = ctx.plugin(() => {})
  const id = SessionId('ontology-loader-agent')
  const session = Session.create(id)
  const value: Agent = {
    id, options: {}, session, inbox: new Inbox(session, { inserted: () => {}, discarded: () => {}, claimed: () => {} }),
    status: 'idle', ctx: scope.ctx,
    followup: () => {}, steer: () => {}, inject: () => {}, send: () => {}, cancel() {},
    runMaintenance: task => task(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  ctx.agents.register(value)
  return value
}

async function boot(): Promise<Context> {
  root = await mkdtemp(join(tmpdir(), 'dsh-ontology-loader-'))
  const configPath = join(root, 'cordis.yml')
  await writeFile(configPath, [
    "- name: '@deepseek-ai/dsh-agent'",
    "- name: '@deepseek-ai/dsh-system-prompt'",
    "- name: '@deepseek-ai/dsh-tools'",
    "- name: '@deepseek-ai/dsh-storage'",
    "- name: '@deepseek-ai/dsh-storage-json'",
    "  config:",
    `    root: '${join(root, 'storages').replace(/\\/g, '/')}'`,
    "- name: '@deepseek-ai/dsh-storage-domain'",
    "  config:",
    "    backend: json",
    "- name: '@bazidiy/ontology'",
    '',
  ].join('\n'))

  const ctx = new Context()
  context = ctx
  ctx.baseUrl = pathToFileURL(root).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-agent', AgentRegistry],
    ['@deepseek-ai/dsh-system-prompt', SystemPrompt],
    ['@deepseek-ai/dsh-tools', ToolRuntime],
    ['@deepseek-ai/dsh-storage', Storage],
    ['@deepseek-ai/dsh-storage-json', StorageJson],
    ['@deepseek-ai/dsh-storage-domain', StorageDomain],
    ['@bazidiy/ontology', Ontology],
  ])
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
      return modules.get(specifier)
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
  await ctx.loader.await()
  return ctx
}

describe('bazidiy-ontology real Loader composition', () => {
  it('registers the five ontology tools', async () => {
    const ctx = await boot()
    const names = new Set(ctx.tools.schemas().map(s => s.name))
    expect(names).toEqual(new Set([
      'calculate_bazi', 'propose_designs', 'generate_design', 'save_design', 'load_design',
    ]))
  })

  it('calculate_bazi returns a structured bazi_result', async () => {
    const ctx = await boot()
    const owner = agent(ctx)
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('bazi'),
      name: 'calculate_bazi',
      arguments: { birth_date: '1990-05-15', birth_hour: '午时', gender: '男' },
      agent: owner,
    })
    expect(result.isError).toBe(false)
    const value = result.value as { type: string; day_master_element: string; month_branch_wuxing: string }
    expect(value.type).toBe('bazi_result')
    expect(value.day_master_element).toHaveLength(1)
    expect(value.month_branch_wuxing).toHaveLength(1)
  })

  it('propose_designs returns favorable/designs', async () => {
    const ctx = await boot()
    const owner = agent(ctx)
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('propose'),
      name: 'propose_designs',
      arguments: { bead_ids: '', wrist_size: 17, day_master_element: '木', month_branch_wuxing: '水' },
      agent: owner,
    })
    expect(result.isError).toBe(false)
    const value = result.value as { type: string; favorable: string[]; designs: unknown[] }
    expect(value.type).toBe('design_proposal')
    expect(value.favorable.length).toBeGreaterThan(0)
    expect(value.designs.length).toBeGreaterThan(0)
  })

  it('generate_design rejects abbreviated bead names', async () => {
    const ctx = await boot()
    const owner = agent(ctx)
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('design'),
      name: 'generate_design',
      arguments: { style_name: 'B-01', beads: '南:8', wrist_size: '17', summary: '测试', rationale: '测试' },
      agent: owner,
    })
    expect(result.isError).toBe(false)
    const value = result.value as { type: string; slots: unknown[]; note?: string }
    expect(value.type).toBe('design_result')
    expect(value.slots).toEqual([])
    expect(value.note).toContain('全称')
  })

  it('generate_design accepts full bead names', async () => {
    const ctx = await boot()
    const owner = agent(ctx)
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('design-ok'),
      name: 'generate_design',
      arguments: { style_name: 'B-01', beads: '南红:8,南红:8', wrist_size: '17', summary: '测试', rationale: '测试' },
      agent: owner,
    })
    expect(result.isError).toBe(false)
    const value = result.value as { type: string; slots: Array<{ name: string; image: string; diameter: number }> }
    expect(value.type).toBe('design_result')
    expect(value.slots).toHaveLength(2)
    expect(value.slots[0]!.name).toBe('南红')
    expect(value.slots[0]!.image).toBe('nanhong_round')
    expect(value.slots[0]!.diameter).toBe(8)
  })

  it('generate_design resolves the spacer image key by name and diameter', async () => {
    const ctx = await boot()
    const owner = agent(ctx)
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('design-spacer'),
      name: 'generate_design',
      arguments: { style_name: 'B-03', beads: '白银:8,白银:4,白银:8', wrist_size: '17', summary: '测试', rationale: '测试' },
      agent: owner,
    })
    expect(result.isError).toBe(false)
    const value = result.value as { type: string; slots: Array<{ name: string; image: string; diameter: number }> }
    // 鐩村緞 4 鍙兘鍖归厤 spacer 鍙樹綋锛堢櫧閾?spacer 鐩村緞 [4,5,6]锛夛紝8 鍖归厤 round銆?    expect(value.slots.map(s => s.image)).toEqual(['baiyin_round', 'baiyin_spacer', 'baiyin_round'])
  })

  it('save_design persists per-session and load_design restores it', async () => {
    const ctx = await boot()
    const owner = agent(ctx)
    const designArgs = {
      style_name: 'B-01',
      slots: [
        { name: '南红', diameter: 8, slot: 0, image: 'nanhong_round', ratio: 1 },
        { name: '白银', diameter: 4, slot: 1, image: 'baiyin_spacer', ratio: 0.5 },
      ],
      wrist_size: '17',
      summary: '测试方案',
      rationale: '测试',
    }
    const saved = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('save'),
      name: 'save_design',
      arguments: designArgs,
      agent: owner,
    })
    expect(saved.isError).toBe(false)
    const savedValue = saved.value as { type: string; count: number }
    expect(savedValue.type).toBe('design_saved')
    expect(savedValue.count).toBe(2)

    const loaded = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('load'),
      name: 'load_design',
      arguments: {},
      agent: owner,
    })
    expect(loaded.isError).toBe(false)
    const loadedValue = loaded.value as { type: string; saved: boolean; style_name: string; slots: unknown[]; summary: string }
    expect(loadedValue.saved).toBe(true)
    expect(loadedValue.style_name).toBe('B-01')
    expect(loadedValue.slots).toEqual(designArgs.slots)
    expect(loadedValue.summary).toBe('测试方案')
  })

  it('load_design returns saved=false for a session with no saved design', async () => {
    const ctx = await boot()
    const owner = agent(ctx)
    const loaded = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: CallId('load-empty'),
      name: 'load_design',
      arguments: {},
      agent: owner,
    })
    expect(loaded.isError).toBe(false)
    const value = loaded.value as { saved: boolean }
    expect(value.saved).toBe(false)
  })
})
