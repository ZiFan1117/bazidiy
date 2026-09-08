// ossie-lib.mjs — kb/ossie 公共：从 schema.sql + seed.sql 构建 SQLite（node:sqlite）。
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const DATA_DIR = join(here, '..', 'kb', 'ossie', 'data')
export const DB_PATH = join(DATA_DIR, 'bazidiy.db')

const SQL_FILES = [
  ['bead_schema.sql', 'bead_seed.sql'],
  ['wuxing_schema.sql', 'wuxing_seed.sql'],
]

export function openBeadDb() {
  const db = new DatabaseSync(DB_PATH)
  for (const [schema, seed] of SQL_FILES) {
    db.exec(readFileSync(join(DATA_DIR, schema), 'utf8'))
    db.exec(readFileSync(join(DATA_DIR, seed), 'utf8'))
  }
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
