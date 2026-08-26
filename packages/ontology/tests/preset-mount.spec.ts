// Proves the bazidiy preset composes the ontology tools + ask_user_question
// under a real agent preset mount, with the 八字 persona shadowing the deployment.
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import AgentRegistry, { assembleContextFor, type Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import AgentPresets from '@deepseek-ai/dsh-agent-presets'
import UserQuestions from '@deepseek-ai/dsh-user-questions'
import * as Ontology from '../src/index.ts'
import * as Persona from '@deepseek-ai/dsh-persona'
import * as ToolAskUser from '@deepseek-ai/dsh-tool-ask-user'
import { describe, expect, it } from 'vitest'

const PRESET_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'presets')

const modules = new Map<string, unknown>([
  ['@bazidiy/ontology', Ontology],
  ['@deepseek-ai/dsh-persona', Persona],
  ['@deepseek-ai/dsh-tool-ask-user', ToolAskUser],
  ['@deepseek-ai/dsh-user-questions', UserQuestions],
])

async function harness(): Promise<Context> {
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
  // The preset rows reference package names; resolve them from this module map.
  ctx.loader.internal = {
    version: 'v2',
    async import(specifier: string) {
      const mod = modules.get(specifier)
      if (mod === undefined) throw new Error(`unexpected preset import: ${specifier}`)
      return mod
    },
  } as unknown as NonNullable<typeof ctx.loader.internal>
  return ctx
}

async function agentOn(ctx: Context, id: string): Promise<Agent> {
  const handle = await ctx.agents.create({
    sessionId: SessionId(id),
    setup: async (agentCtx: Context) => void await ctx.agentPresets.mount(agentCtx),
  })
  return handle.agent
}

describe('bazidiy preset composition', () => {
  it('mounts the ontology tools and ask_user_question for the agent', async () => {
    const ctx = await harness()
    const agent = await agentOn(ctx, 'sess-bazidiy')

    const names = ctx.tools.schemas(agent).map(s => s.name).sort()
    expect(names).toEqual([
      'ask_user_question', 'calculate_bazi', 'generate_design', 'load_design', 'propose_designs', 'save_design',
    ])

    await ctx.fiber.dispose()
  })

  it('shadows the deployment persona with the 八字 assistant identity', async () => {
    const ctx = await harness()
    const agent = await agentOn(ctx, 'sess-persona')

    const prompt = await ctx.systemPrompt.assemble(assembleContextFor(agent))
    const persona = prompt.sections.find(s => s.name === 'deployment:persona')
    expect(persona?.text).toContain('手串定制助手')
    expect(persona?.text).toContain('calculate_bazi')

    await ctx.fiber.dispose()
  })

  it('leaves the host tool registry empty (agent-plane only)', async () => {
    const ctx = await harness()
    await agentOn(ctx, 'sess-plane')

    expect(ctx.tools.schemas()).toEqual([])

    await ctx.fiber.dispose()
  })
})
