/**
 * Bracelet SVG view for a settled generate_design result. Pure presentation:
 * reads the slots from the tool result's `meta` (projected by the ontology
 * tool's presentationMeta) and draws the bead circle. No session reads, no I/O.
 * (编辑/查看切换在 DesignResultView，本模块不依赖 BeadEditor——避免循环依赖。)
 * @module @bazidiy/ontology/BraceletSvg
 */

import type { ReactNode } from 'react'
import type { ToolResultNode } from '@deepseek-ai/dsh-client-runtime/client'
import {
  CIRCLE_CX, CIRCLE_CY, CIRCLE_H, CIRCLE_W, PX_PER_MM, amplifySize,
  circlePositions, computeRadius, isSpacerImage, rotationOffset,
} from './geometry.ts'
import type { RenderSlot } from './geometry.ts'
import css from './BraceletSvg.module.css'

/** One persisted slot from the tool's presentationMeta projection. */
interface MetaSlots {
  style_name?: string
  wrist_size?: string
  summary?: string
  slots?: RenderSlot[]
}

/** Image URL for a picture key (served under the beads static path). */
function imageUrl(imageKey: string): string {
  return `/beads/${imageKey}.png`
}

/**
 * Draw one bead at its circle position.
 * @param slot - slot data (name/diameter/image key/ratio).
 * @param pos - precomputed center position.
 * @returns the positioned <image> element.
 */
function BeadImage({ slot, pos }: { slot: RenderSlot; pos: { x: number; y: number } }): ReactNode {
  const size = amplifySize(slot.diameter) * PX_PER_MM
  // ratio = image width/height (from the ontology bead data — single source).
  const ratio = slot.ratio > 0 ? slot.ratio : 1
  const spacer = isSpacerImage(slot.image)
  const w = spacer ? size * ratio : size
  const h = spacer ? size : size / ratio
  const rad = Math.atan2(pos.y - CIRCLE_CY, pos.x - CIRCLE_CX)
  const offset = rotationOffset(slot.image)
  const deg = offset !== 0 ? Math.round((rad * 180) / Math.PI + offset) : 0
  const left = Math.round(pos.x - w / 2)
  const top = Math.round(pos.y - h / 2)
  return (
    <image
      href={imageUrl(slot.image)}
      x={left}
      y={top}
      width={w.toFixed(1)}
      height={h.toFixed(1)}
      transform={deg ? `rotate(${deg},${pos.x.toFixed(1)},${pos.y.toFixed(1)})` : undefined}
      className={css.bead}
    />
  )
}

/**
 * The bracelet SVG card for a settled `generate_design` result.
 * @param block - the settled tool result node carrying the projected slots in `meta`.
 * @returns the SVG element, or null when the result carries no renderable slots.
 */
export function BraceletSvg({ block }: { block: ToolResultNode }): ReactNode {
  const meta = block.meta as MetaSlots | undefined
  const slots = meta?.slots ?? []
  if (slots.length === 0) return null

  const wristSizeCm = meta?.wrist_size !== undefined && meta.wrist_size !== ''
    ? Number.parseFloat(meta.wrist_size)
    : 17
  const pxSizes = slots.map(s => (amplifySize(s.diameter) + 1) * PX_PER_MM)
  const positions = circlePositions(pxSizes, wristSizeCm)
  const radius = Math.round(computeRadius(pxSizes, wristSizeCm))

  return (
    <div className={css.card}>
      {meta?.summary !== undefined && meta.summary !== '' ? (
        <p className={css.summary}>{meta.summary}</p>
      ) : null}
      <svg viewBox={`0 0 ${CIRCLE_W} ${CIRCLE_H}`} className={css.svg} role="img" aria-label="手串预览">
        <circle cx={CIRCLE_CX} cy={CIRCLE_CY} r={radius} fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray="4 4" className={css.guide} />
        {slots.map((slot, i) => {
          const pos = positions[i]
          if (pos === undefined) return null
          return <BeadImage key={`${slot.image}-${i}`} slot={slot} pos={pos} />
        })}
      </svg>
    </div>
  )
}
