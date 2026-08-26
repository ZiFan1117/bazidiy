/**
 * Saved-design storage domain for the BaziDIY ontology. One record per
 * session: the record key IS the session id, so the "current saved design"
 * is a single `put`/`get` on the `saved` table. The domain is opened lazily
 * on first use and closed when the consumer's fiber unloads.
 * @module @bazidiy/ontology/designs
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-storage-domain'
import type { Domain } from '@deepseek-ai/dsh-storage-domain'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'

/** One saved design slot, mirroring the `generate_design` output slot. */
export const savedSlotSchema = z.object({
  name: z.string(),
  diameter: z.number().int(),
  slot: z.number().int(),
  image: z.string(),
  ratio: z.number(),
})

/** The saved-design record value (what one session persists). */
export const savedDesignSchema = z.object({
  style_name: z.string(),
  slots: z.array(savedSlotSchema),
  wrist_size: z.string(),
  summary: z.string(),
  rationale: z.string(),
})

/** Stored design type, inferred from the zod schema. */
export type SavedDesign = z.infer<typeof savedDesignSchema>

/** Domain spec: one table `saved` keyed by session id. */
export const designsDomain = defineDomain({
  name: 'bazidiy_designs',
  version: 1,
  tables: {
    saved: domainTable(savedDesignSchema),
  },
})

/**
 * Open the designs domain on the current context's storage hub.
 * @param ctx - Cordis context carrying the mounted storage-domain facility.
 * @returns the opened domain handle.
 */
async function openDesigns(ctx: Context): Promise<Domain<typeof designsDomain>> {
  const facility = ctx.get('storageDomain')
  if (facility === undefined) {
    throw new Error('storage-domain facility is not mounted; add @deepseek-ai/dsh-storage-domain to the profile')
  }
  return facility.open(designsDomain)
}

/**
 * Save one design under the given session id (idempotent overwrite).
 * @param ctx - Cordis context.
 * @param sessionId - the owning session id (record key).
 * @param design - the design to persist.
 */
export async function saveDesign(ctx: Context, sessionId: string, design: SavedDesign): Promise<void> {
  const domain = await openDesigns(ctx)
  try {
    await domain.table('saved').put(sessionId, design)
  } finally {
    await domain.close()
  }
}

/**
 * Load the design saved under a session id, or undefined when none exists.
 * @param ctx - Cordis context.
 * @param sessionId - the owning session id (record key).
 * @returns the saved design, or undefined when absent.
 */
export async function loadDesign(ctx: Context, sessionId: string): Promise<SavedDesign | undefined> {
  const domain = await openDesigns(ctx)
  try {
    return domain.table('saved').get(sessionId)
  } finally {
    await domain.close()
  }
}
