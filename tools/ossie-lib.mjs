// ossie-lib.mjs — kb/ossie 公共：从 schema.sql + seed.sql 构建 SQLite（node:sqlite）。
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = join(here, '..', 'kb', 'ossie', 'data')
export const DB_PATH = join(DATA_DIR, 'bazidiy.db')

export function openBeadDb() {
  const db = new DatabaseSync(DB_PATH)
  db.exec(readFileSync(join(DATA_DIR, 'bead_schema.sql'), 'utf8'))
  db.exec(readFileSync(join(DATA_DIR, 'bead_seed.sql'), 'utf8'))
  return db
}

export function readBeadRows() {
  const db = openBeadDb()
  try {
    const rows = db.prepare('SELECT id, bead_id, material, variant, name, wuxing, diameters, color, image, image_w, image_h FROM beads ORDER BY rowid').all()
    return rows.map((r) => ({
      id: r.id, bead_id: r.bead_id, name: r.name, wuxing: r.wuxing, variant: r.variant,
      diameters: JSON.parse(r.diameters), color: r.color, image: r.image,
      image_w: Number(r.image_w), image_h: Number(r.image_h),
    }))
  } finally {
    db.close()
  }
}
