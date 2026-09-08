// Resize bead images to 96px on the long axis (2x the ~48px max render size)
// and re-encode as optimized PNG. Input: assets/beads/*.png (in place).
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const DIR = join(import.meta.dirname, '..', 'assets', 'beads')
const TARGET = 96

let before = 0
let after = 0
let count = 0

for (const file of readdirSync(DIR).filter(f => f.endsWith('.png'))) {
  const path = join(DIR, file)
  before += statSync(path).size
  const img = sharp(path)
  const { width, height } = await img.metadata()
  const long = Math.max(width ?? TARGET, height ?? TARGET)
  const scale = Math.min(1, TARGET / long)
  const buf = await sharp(path)
    .resize(Math.round((width ?? TARGET) * scale), Math.round((height ?? TARGET) * scale), { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toBuffer()
  await sharp(buf).toFile(path)
  after += buf.length
  count += 1
}

console.log(`resized ${count} images: ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(1)}MB`)
