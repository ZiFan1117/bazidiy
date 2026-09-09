// Real-LLM smoke: boot the bazidiy preset with the real DeepSeek adapter and
// ask one bracelet request, then report which tools the model actually called.
// Run with DEEPSEEK_API_KEY set. Not part of the vitest suite (network + key).
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import LlmRuntime, { createUserMessage } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import AgentPresets from '@deepseek-ai/dsh-agent-presets'
import UserQuestions from '@deepseek-ai/dsh-user-questions'
import * as DeepSeekLlm from '@deepseek-ai/dsh-llm-deepseek'
import * as Ontology from '../src/index.ts'
import * as Persona from '@deepseek-ai/dsh-persona'
import * as ToolAskUser from '@deepseek-ai/dsh-tool-ask-user'

const PRESET_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'presets')

const modules = new Map<string, unknown>([
  ['@bazidiy/ontology', Ontology],
  ['@deepseek-ai/dsh-persona', Persona],
  ['@deepseek-ai/dsh-tool-ask-user', ToolAskUser],
  ['@deepseek-ai/dsh-user-questions', UserQuestions],
])

function waitForIdle(ctx: Context, agent: import('@deepseek-ai/dsh-agent').Agent): Promise<void> {
  return new Promise((resolve) => {
    const dispose = ctx.on('agent/status', ({ agent: subject, status }) => {
      if (subject === agent && status === 'idle') { dispose(); resolve() }
    })
  })
}

async function main() {
  if (process.env.DEEPSEEK_API_KEY === undefined || process.env.DEEPSEEK_API_KEY === '') {
    throw new Error('DEEPSEEK_API_KEY is not set')
  }

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
  await ctx.plugin(DeepSeekLlm)
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

  const handle = await ctx.agents.create({
    sessionId: SessionId('real-smoke'),
    agentOptions: { provider: 'deepseek-official', model: 'deepseek-v4-flash' },
    setup: async (agentCtx: Context) => void await ctx.agentPresets.mount(agentCtx),
  })
  const agent = handle.agent

  agent.followup(createUserMessage({
    content: [{ type: 'text', text: '帮我设计一条手串，我的生日是 1990 年 5 月 15 日午时，性别男，腕围 17cm' }],
    source: { kind: 'user' },
  }))
  await waitForIdle(ctx, agent)

  const events = agent.session.events as SessionEvent[]
  const called = events.filter(e => e.type === 'tool/call').map(e => (e.data as { name: string }).name)

  console.log('=== tools called by the real model ===')
  console.log(JSON.stringify(called, null, 2))

  for (const e of events) {
    if (e.type === 'tool/call') {
      const d = e.data as { name: string; arguments: string }
      console.log(`\n>>> tool/call ${d.name} args=${d.arguments}`)
    } else if (e.type === 'tool/result') {
      const d = e.data as { message: { content: Array<{ type: string; text?: string }> }; error?: { name: string; code: string }; meta?: unknown }
      const text = (d.message.content ?? []).filter(b => b.type === 'text').map(b => b.text ?? '').join('\n')
      console.log(`<<< tool/result error=${JSON.stringify(d.error ?? null)} meta=${JSON.stringify(d.meta ?? null)}`)
      if (text) console.log(`    content: ${text.slice(0, 500)}`)
    } else if (e.type === 'assistant/message') {
      const d = e.data as { content: Array<{ type: string; text?: string }> }
      const text = (d.content ?? []).filter(b => b.type === 'text').map(b => b.text ?? '').join('\n')
      if (text.trim()) console.log(`\n--- assistant said ---\n${text.slice(0, 800)}`)
    }
  }

  await ctx.fiber.dispose()
}

main().catch((error) => {
  console.error('SMOKE FAILED:', error)
  process.exitCode = 1
})
