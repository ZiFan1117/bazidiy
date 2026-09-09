/**
 * BaziDIY ontology plugin: registers the deterministic tools (calculate_bazi,
 * propose_designs, generate_design, save_design, load_design, beads_derive,
 * beads_rules) as model-facing dsh tools, mounts the bead asset route, and
 * installs the ontology invariant. Deterministic only — no LLM calls inside execute.
 * @module @bazidiy/ontology
 */

import type { Context } from '@deepseek-ai/cordis'
import type { defineTool } from '@deepseek-ai/dsh-tools'
import { mountBeadAssets } from './assets.ts'
import { calculateBaziTool } from './tools/calculate-bazi.ts'
import { proposeDesignsTool } from './tools/propose-designs.ts'
import { generateDesignTool } from './tools/generate-design.ts'
import { saveDesignTool } from './tools/save-design.ts'
import { loadDesignTool } from './tools/load-design.ts'
import { beadsDeriveTool } from './tools/beads-derive.ts'
import { beadsRulesTool } from './tools/beads-rules.ts'

export const name = 'bazidiy-ontology'
export const inject = ['tools']

/**
 * Register the ontology tools on ctx.tools.
 * @param ctx - registrant context carrying the tool registry.
 */
export function apply(ctx: Context): void {
  const disposeAssets = mountBeadAssets(ctx)
  if (disposeAssets !== undefined) {
    ctx.effect(() => disposeAssets, 'ontology.bead-assets()')
  }
  // Idempotent tool registration: skip names already on the host registry (guard against double mounts).
  const registerTool = (tool: ReturnType<typeof defineTool>) => {
    if (!ctx.tools.schemas().some((s: { name: string }) => s.name === tool.name)) ctx.tools.register(tool)
  }
  registerTool(calculateBaziTool())
  registerTool(proposeDesignsTool())
  registerTool(generateDesignTool())
  registerTool(saveDesignTool(ctx))
  registerTool(loadDesignTool(ctx))
  registerTool(beadsDeriveTool())
  registerTool(beadsRulesTool())
}
