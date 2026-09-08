/**
 * Bead editor: lets the user swap beads in a settled generate_design result.
 * Fetches the bead catalog from the host (`/beads/catalog.json`), shows the
 * current bracelet slots as selectable chips, and offers every catalog bead
 * as a replacement for the selected slot. The bracelet preview re-renders
 * from the local editable slots (no session writes while editing).
 * @module @bazidiy/ontology/BeadEditor
 */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { RenderSlot } from '../ui.svg_render/geometry.ts'
import { BraceletSvg } from '../ui.svg_render/BraceletSvg.tsx'
import type { ToolResultNode } from '@deepseek-ai/dsh-client-runtime/client'
import css from './BeadEditor.module.css'

/** One catalog entry served by `/beads/catalog.json`. */
export interface CatalogBead {
  id: string
  bead_id: string
  name: string
  wuxing: string
  variant: string
  diameters: number[]
  color: string
  image: string
  ratio: number
}

/** The catalog document shape. */
export interface BeadCatalog {
  beads: CatalogBead[]
}

/** Image URL for a picture key (served under the beads static path). */
function imageUrl(imageKey: string): string {
  return `/beads/${imageKey}.png`
}

/**
 * Build a replacement slot from a catalog bead and the selected slot's
 * position, keeping the original slot order and index.
 * @param bead - the catalog bead chosen as the replacement.
 * @param slot - the original slot being replaced.
 * @returns a new slot referencing the catalog bead's picture.
 */
function slotFromCatalog(bead: CatalogBead, slot: RenderSlot): RenderSlot {
  const preferred = bead.diameters.includes(slot.diameter)
    ? slot.diameter
    : (bead.diameters[0] ?? slot.diameter)
  return {
    name: bead.name,
    diameter: preferred,
    image: bead.image,
    ratio: bead.ratio,
  }
}

/** Load the bead catalog from the host route. */
function loadCatalog(): Promise<BeadCatalog> {
  return fetch('/beads/catalog.json').then(res => {
    if (!res.ok) throw new Error(`catalog fetch failed: ${res.status}`)
    return res.json() as Promise<BeadCatalog>
  })
}

/** Spacer beads (variant 'spacer') are grouped at the end of the picker. */
function sortCatalog(beads: readonly CatalogBead[]): CatalogBead[] {
  const spacers = beads.filter(b => b.variant === 'spacer')
  const rest = beads.filter(b => b.variant !== 'spacer')
  return [...rest, ...spacers]
}

/**
 * The bead editor panel: current slots as selectable chips, catalog grid as
 * replacements, and a live bracelet preview. Editing is local state only —
 * the caller decides whether to persist the edited slots.
 * @param props - the settled result node whose meta carries the editable slots.
 */
export function BeadEditor({ block }: { block: ToolResultNode }): ReactNode {
  const meta = block.meta as { wrist_size?: string; summary?: string; slots?: RenderSlot[] } | undefined
  const initialSlots = meta?.slots ?? []
  const [slots, setSlots] = useState<RenderSlot[]>(initialSlots)
  const [selected, setSelected] = useState<number | null>(null)
  const [catalog, setCatalog] = useState<CatalogBead[] | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadCatalog().then(
      c => { if (!cancelled) setCatalog(sortCatalog(c.beads)) },
      e => { if (!cancelled) setCatalogError(e instanceof Error ? e.message : String(e)) },
    )
    return () => { cancelled = true }
  }, [])

  const onSlotClick = (index: number): void => {
    setSelected(prev => (prev === index ? null : index))
  }

  const onBeadClick = (bead: CatalogBead): void => {
    if (selected === null) return
    setSlots(prev => prev.map((s, i) => (i === selected ? slotFromCatalog(bead, s) : s)))
    setSelected(null)
  }

  return (
    <div className={css.editor}>
      <div className={css.preview}>
        <BraceletSvg block={{ ...block, meta: { ...meta, slots } } as ToolResultNode} />
      </div>
      <div className={css.slots}>
        {slots.map((slot, i) => (
          <button
            type="button"
            key={`${slot.image}-${i}`}
            className={i === selected ? css.slotActive : css.slot}
            onClick={() => { onSlotClick(i) }}
            aria-pressed={i === selected}
            title={`${slot.name} ${slot.diameter}mm`}
          >
            <img src={imageUrl(slot.image)} alt={slot.name} className={css.slotImage} />
          </button>
        ))}
      </div>
      {catalogError !== null && <p className={css.error} role="alert">{catalogError}</p>}
      {catalog !== null && (
        <div className={css.catalog}>
          {catalog.map(bead => (
            <button
              type="button"
              key={bead.id}
              className={selected === null ? css.beadDisabled : css.bead}
              onClick={() => { onBeadClick(bead) }}
              disabled={selected === null}
              title={`${bead.name}（${bead.wuxing}）${bead.diameters.join('/')}mm`}
            >
              <img src={imageUrl(bead.image)} alt={bead.name} className={css.beadImage} />
              <span className={css.beadName}>{bead.name}</span>
            </button>
          ))}
        </div>
      )}
      {selected === null && catalog !== null && (
        <p className={css.hint}>先点选上面一颗珠子，再从下方选替换品</p>
      )}
    </div>
  )
}
