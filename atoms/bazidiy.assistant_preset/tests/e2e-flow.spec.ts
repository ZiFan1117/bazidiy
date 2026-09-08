// End-to-end: the 八字 flow runs inside the real agent loop. A scripted mock
// LLM first asks calculate_bazi, then propose_designs, then generate_design,
// and the ontology tools answer deterministically — proving the whole
// 生辰→八字→方案→出图 chain works under dsh's agent-loop without a provider key.
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import LlmRuntime, { createUserMessage, CallId, type StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import AgentPresets from '@deepseek-ai/dsh-agent-presets'
import UserQuestions from '@deepseek-ai/dsh-user-questions'
import * as Ontology from '../src/index.ts'
import * as Persona from '@deepseek-ai/dsh-persona'
import * as ToolAskUser from '@deepseek-ai/dsh-tool-ask-user'
import type { GenerateOptions, LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'

const PRESET_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'presets')

const modules = new Map<string, unknown>([
  ['@bazidiy/ontology', Ontology],
  ['@deepseek-ai/dsh-persona', Persona],
  ['@deepseek-ai/dsh-tool-ask-user', ToolAskUser],
  ['@deepseek-ai/dsh-user-questions', UserQuestions],
])

function toolCall(rawId: string, name: string, args: object): StreamChunk[] {
  const callId = CallId(rawId)
  const json = JSON.stringify(args)
  return [
    { type: 'block-start', index: 0, blockType: 'tool-call' },
    { type: 'block-end', index: 0, block: { type: 'tool-call', id: callId, name, arguments: json } },
    { type: 'usage', usage: { inputTokens: 10, outputTokens: 5 } },
    { type: 'finish', reason: { kind: 'tool-calls' } },
  ]
}

function text(text: string): StreamChunk[] {
  return [
    { type: 'block-start', index: 0, blockType: 'text' },
    ...Array.from(text, (char): StreamChunk => ({ type: 'text-delta', index: 0, text: char })),
    { type: 'block-end', index: 0, block: { type: 'text', text } },
    { type: 'usage', usage: { inputTokens: 10, outputTokens: text.length } },
    { type: 'finish', reason: { kind: 'stop' } },
  ]
}

class ScriptedAdapter extends LlmAdapter {
  requests: GenerateOptions[] = []
  constructor(private script: StreamChunk[][]) { super() }
  resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({ provider, id: model, name: model })
  }
  async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const entry = this.script.shift()
    if (entry === undefined) throw new Error('ScriptedAdapter: script exhausted')
    for (const chunk of entry) {
      if (options.signal?.aborted) throw new Error('aborted')
      yield chunk
    }
  }
}

async function harness(adapter: ScriptedAdapter): Promise<Context> {
  const ctx = new Context()
  ctx.baseUrl = pathToFileURL(PRESET_ROOT).href + '/'
  await ctx.plugin(Loader)
  ctx.loader.builtins.include = Include
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt, { persona: 'deployment default' })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(AgentLoop, { agents: [] })
  await ctx.plugin(UserQuestions)
  await ctx.plugin(AgentPresets, {
    default: 'bazidiy',
    roots: [{ path: PRESET_ROOT, trust: 'system' }],
    includeUserRoot: false,
  })
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      const mod = modules.get(specifier)
      if (mod === undefined) throw new Error(`unexpected preset import: ${specifier}`)
      return mod
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  ctx.llm.registerAdapter(['mock'], adapter)
  return ctx
}

function waitForIdle(ctx: Context, agent: Agent): Promise<void> {
  return new Promise((resolve) => {
    const dispose = ctx.on('agent/status', ({ agent: subject, status }) => {
      if (subject === agent && status === 'idle') { dispose(); resolve() }
    })
  })
}

describe('bazidiy 八字 flow end-to-end in the agent loop', () => {
  it('runs calculate_bazi → propose_designs → generate_design and finishes', async () => {
    const adapter = new ScriptedAdapter([
      toolCall('c1', 'calculate_bazi', { birth_date: '1990-05-15', birth_hour: '午时', gender: '男' }),
      toolCall('c2', 'propose_designs', { bead_ids: '', wrist_size: 17, day_master_element: '火', month_branch_wuxing: '火' }),
      toolCall('c3', 'generate_design', { style_name: 'B-01', beads: '南红:8,南红:8,南红:8', wrist_size: '17', summary: '南红手串', rationale: '喜用火' }),
      text('已为您设计好手串'),
    ])

    const ctx = await harness(adapter)
    const handle = await ctx.agents.create({
      sessionId: SessionId('bazi-e2e'),
      agentOptions: { provider: 'mock', model: 'mock' },
      setup: async (agentCtx: Context) => void await ctx.agentPresets.mount(agentCtx),
    })
    const agent = handle.agent

    agent.followup(createUserMessage({ content: [{ type: 'text', text: '帮我算八字并设计手串' }], source: { kind: 'user' } }))
    await waitForIdle(ctx, agent)

    // The loop made four model requests (three tool turns + the final text).
    expect(adapter.requests).toHaveLength(4)

    // All three ontology tools were invoked, in order, by the agent loop.
    const events = agent.session.events as SessionEvent[]
    const called = events.filter(e => e.type === 'tool/call')
      .map(e => (e.data as { name: string }).name)
    expect(called).toEqual(['calculate_bazi', 'propose_designs', 'generate_design'])

    await ctx.fiber.dispose()
  })
})
