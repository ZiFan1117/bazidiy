/** Package-owned ontology data invariants. @module @bazidiy/ontology/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'
import { validateConsistency } from './_atoms/infer_verdict/index.ts'
import { assertSingleWuxing, validateWuxingData } from './_atoms/rules/index.ts'
import { beads as beadsData } from './_atoms/kb/beadCatalog.ts'

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
  // R4 / FunctionalProperty: catalog size and single-valued wuxing.
  const expectedBeadRows = 33
  if (beadsData.length !== expectedBeadRows) {
    fail(`beads catalog count drift: got ${beadsData.length}, expected ${expectedBeadRows}`)
  }
  for (const conflict of assertSingleWuxing()) {
    fail(`bead wuxing not single-valued: ${conflict}`)
  }
  for (const gap of validateWuxingData()) {
    fail(`wuxing data incomplete: ${gap}`)
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
