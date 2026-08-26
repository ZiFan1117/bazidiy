/**
 * Bracelet geometry: pure circle-layout math for the SVG renderer.
 * mm/cm are converted to px once at the entry; everything after is pixel math.
 * @module @bazidiy/ontology/geometry
 */

/** Circular canvas size (px). */
export const CIRCLE_W = 480
export const CIRCLE_H = 480
export const CIRCLE_CX = 240
export const CIRCLE_CY = 240

/** Base bead diameter in px (8mm = 22px). */
export const BASE_PX = 22
/** mm → px coefficient. */
export const PX_PER_MM = BASE_PX / 8
/** cm → px coefficient (17cm wrist → R=100px). */
export const PX_PER_CM = 100 / 17

/** A bead slot for rendering. `image` is the picture key (e.g. nanhong_round), `ratio` = width/height. */
export interface RenderSlot {
  name: string
  diameter: number
  image: string
  ratio: number
}

/**
 * Visually amplify diameters above 8mm (extra 40% of the excess) so 10mm/12mm
 * beads read clearly larger than 8mm.
 * @param diameterMm - bead diameter in mm.
 * @returns amplified diameter in mm.
 */
export function amplifySize(diameterMm: number): number {
  if (diameterMm <= 8) return diameterMm
  return diameterMm + (diameterMm - 8) * 0.4
}

interface RadiusAndLength {
  R: number
  totalLen: number
}

function computeRadiusAndLength(pxSizes: readonly number[], wristSizeCm: number): RadiusAndLength {
  const wristRadius = wristSizeCm * PX_PER_CM
  const totalLen = pxSizes.reduce((a, b) => a + b, 0)
  const minRadius = totalLen / (2 * Math.PI)
  return { R: Math.max(wristRadius, minRadius), totalLen }
}

/** Circle radius in px (wrist-driven, with a no-overlap floor). */
export function computeRadius(pxSizes: readonly number[], wristSizeCm: number): number {
  return computeRadiusAndLength(pxSizes, wristSizeCm).R
}

/** Bead-center positions on the circle, slot 0 centered at 12 o'clock. */
export function circlePositions(
  pxSizes: readonly number[],
  wristSizeCm: number,
): Array<{ x: number; y: number }> {
  const { R, totalLen } = computeRadiusAndLength(pxSizes, wristSizeCm)
  const spans = pxSizes.map(s => (s / totalLen) * 2 * Math.PI)
  const startAngle = -Math.PI / 2 - (spans[0] ?? 0) / 2
  const positions: Array<{ x: number; y: number }> = []
  let cumAngle = startAngle
  for (const span of spans) {
    positions.push({
      x: Math.round(CIRCLE_CX + R * Math.cos(cumAngle + span / 2)),
      y: Math.round(CIRCLE_CY + R * Math.sin(cumAngle + span / 2)),
    })
    cumAngle += span
  }
  return positions
}

/** Rotation offset (deg) per picture-key shape family. */
export function rotationOffset(imageKey: string): number {
  if (imageKey.includes('barrel') || imageKey.includes('spacer')) return 90
  if (imageKey.includes('buddha') || imageKey.includes('pixiu')) return -90
  return 0
}

/** Whether a picture key names a spacer (uses width as the short axis). */
export function isSpacerImage(imageKey: string): boolean {
  return imageKey.includes('spacer')
}
