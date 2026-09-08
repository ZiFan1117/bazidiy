/**
 * BaziDIY web UI plugin, browser half: registers the bracelet SVG view into the
 * keyed tool-view slot for `generate_design`. The view renders the settled
 * result's projected slots (block.meta) and falls back to nothing while the
 * call is still running (the generic card owns that state).
 * @module @bazidiy/ontology/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: merges the 'tool.call.toolview' SlotMap entry owned by ui-tool.
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import { DesignResultView } from '../_atoms/ui.bead_editor/DesignResultView.tsx'

/** Required services: the slot registry. */
export const inject = ['slots']

/**
 * Register the bracelet SVG view for `generate_design`.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('tool.call.toolview', () =>
    ctx.slots.register({ name: 'tool.call.toolview', key: 'generate_design' }, DesignResultView))
}
