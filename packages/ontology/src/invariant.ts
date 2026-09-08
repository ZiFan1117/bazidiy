/** Package-owned ontology data invariants. @module @bazidiy/ontology/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'
import { validateConsistency } from './atoms/infer_verdict/index.ts'

const PACKAGE_NAME = '@bazidiy/ontology'

/** Cordis companion plugin name. */
export const name = 'bazidiy-ontology-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** Validate the ontology rules are self-consistent (no favorable/unfavorable overlap). */
function validateOntology(fail: InvariantFailure): void {
  const conflicts = validateConsistency()
  for (const conflict of conflicts) {
    fail(`ontology rules inconsistent: ${conflict}`)
  }
}

/** Validate the loaded rule data on install. */
const install: InvariantInstaller = Object.assign((_ctx: Context, fail: InvariantFailure) => {
  validateOntology(fail)
}, { inject: [] })

/**
 * Register the ontology invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
