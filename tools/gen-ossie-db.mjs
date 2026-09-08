// gen-ossie-db.mjs — 从 schema.sql+seed.sql 建 SQLite 并做数据自检（Ossie requires 兜底）。
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR, DB_PATH } from './ossie-lib.mjs'

const db = new DatabaseSync(DB_PATH)
db.exec(readFileSync(join(DATA_DIR, 'bead_schema.sql'), 'utf8'))
db.exec(readFileSync(join(DATA_DIR, 'bead_seed.sql'), 'utf8'))

const errors = []
const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c

const nBeads = count('beads')
const nMats = count('materials')
const nVar = count('variants')
if (nBeads !== 33) errors.push(`beads=${nBeads} (期望 33)`)
if (nMats !== 31) errors.push(`materials=${nMats} (期望 31)`)
if (nVar < 2) errors.push(`variants=${nVar}`)

// 唯一性 / 基数：id、bead_id 存在且指向材料
for (const r of db.prepare('SELECT id FROM beads').all()) {
  if (db.prepare('SELECT COUNT(*) c FROM beads WHERE id=?').get(r.id).c !== 1) errors.push(`bead id 非唯一: ${r.id}`)
}
const orphan = db.prepare('SELECT COUNT(*) c FROM beads WHERE material NOT IN (SELECT id FROM materials)').get().c
if (orphan > 0) errors.push(`孤立材料引用 ${orphan}`)

// 直径：4..15 且为整数；隔片(spacer)∈{4,5,6}
for (const r of db.prepare('SELECT id, variant, diameters FROM beads').all()) {
  const ds = JSON.parse(r.diameters)
  for (const d of ds) {
    if (!Number.isInteger(d) || d < 4 || d > 15) errors.push(`${r.id} 直径越界: ${d}`)
    if (r.variant === 'spacer' && ![4, 5, 6].includes(d)) errors.push(`${r.id} 隔片直径非法: ${d}`)
  }
}

// 颜色 / 图 基本完整性
for (const r of db.prepare('SELECT id, color, image FROM beads').all()) {
  if (!/^#?[0-9A-Fa-f]{6}$/.test(String(r.color).replace(/^#/, ''))) errors.push(`${r.id} 颜色非法: ${r.color}`)
  if (!r.image) errors.push(`${r.id} 缺图`)
}

db.close()
if (errors.length) {
  console.log('DB SELF-CHECK FAIL')
  for (const e of errors) console.log('  - ' + e)
  process.exit(1)
}
console.log(`DB SELF-CHECK PASS: beads=${nBeads} materials=${nMats} variants=${nVar}`)
