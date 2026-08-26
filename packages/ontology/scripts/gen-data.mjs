import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = 'D:/softwork/bazidiy/backend/ontology/data'
const DST = 'D:/softwork/bazidiy/dsh/packages/bazidiy/ontology/src/data'
const ASSETS = 'D:/softwork/bazidiy/dsh/packages/bazidiy/ontology/assets/beads'

mkdirSync(DST, { recursive: true })

const read = (n) => JSON.parse(readFileSync(join(SRC, n), 'utf8'))

/** Read one PNG's intrinsic width/height (image key = bead id). */
function pngSize(key) {
  const buf = readFileSync(join(ASSETS, `${key}.png`))
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

// ── beads ── (merge image aspect ratio from the actual PNG files —?one source)
const beads = read('beads.json').map(({ id, bead_id, name, wuxing, variant, diameters, color, image }) => {
  const { w, h } = pngSize(id)
  return {
    id, bead_id, name, wuxing, variant, diameters, color, image,
    image_w: w, image_h: h,
  }
})

// ── wuxing ──
const wuxing = read('wuxing.json')
wuxing.schema_version = 3

// ── styles ── (drop hardness constraints)
const stylesRaw = read('styles.json')
for (const sid of Object.keys(stylesRaw.styles)) {
  stylesRaw.styles[sid].constraints = stylesRaw.styles[sid].constraints.filter(c => c.type !== 'hardness')
}

const header = `/**
 * BaziDIY ontology data —?the single source of truth for the deterministic rules.
 * Generated from backend/ontology/data (schema v3, hardness removed).
 * Do not hand-edit; edit the JSON source and regenerate.
 * @module @bazidiy/ontology/data
 */
/* oxlint-disable -- generated literal data, not hand-written logic */
`
const toTs = (name, obj) => header + `export const ${name} = ${JSON.stringify(obj, null, 2)} as const\n`

writeFileSync(join(DST, 'beads.ts'), toTs('beads', beads), 'utf8')
writeFileSync(join(DST, 'wuxing.ts'), toTs('wuxing', wuxing), 'utf8')
writeFileSync(join(DST, 'styles.ts'), toTs('styles', stylesRaw), 'utf8')

console.log('beads:', beads.length, '| wuxing v', wuxing.schema_version, '| styles:', Object.keys(stylesRaw.styles).join(','))
