// gen-ossie-db.mjs — 从 schema.sql+seed.sql 建 SQLite 并做数据自检（Ossie requires 兜底）。
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR, DB_PATH } from './ossie-lib.mjs'

const db = new DatabaseSync(DB_PATH)
for (const [schema, seed] of [['bead_schema.sql', 'bead_seed.sql'], ['wuxing_schema.sql', 'wuxing_seed.sql']]) {
  db.exec(readFileSync(join(DATA_DIR, schema), 'utf8'))
  db.exec(readFileSync(join(DATA_DIR, seed), 'utf8'))
}

const errors = []
const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c

// --- bead ---
const nBeads = count('beads'); const nMats = count('materials'); const nVar = count('variants')
if (nBeads !== 33) errors.push(`beads=${nBeads} (期望 33)`)
if (nMats !== 31) errors.push(`materials=${nMats} (期望 31)`)
for (const r of db.prepare('SELECT id FROM beads').all()) {
  if (db.prepare('SELECT COUNT(*) c FROM beads WHERE id=?').get(r.id).c !== 1) errors.push(`bead id 非唯一: ${r.id}`)
}
if (db.prepare('SELECT COUNT(*) c FROM beads WHERE material NOT IN (SELECT id FROM materials)').get().c > 0) errors.push('孤立材料引用')
for (const r of db.prepare('SELECT id, variant, diameters FROM beads').all()) {
  for (const d of JSON.parse(r.diameters)) {
    if (!Number.isInteger(d) || d < 4 || d > 15) errors.push(`${r.id} 直径越界: ${d}`)
    if (r.variant === 'spacer' && ![4, 5, 6].includes(d)) errors.push(`${r.id} 隔片直径非法: ${d}`)
  }
}

// --- wuxing ---
const nEl = count('elements'); const nStem = count('stems'); const nBranch = count('branches'); const nSea = count('seasons')
if (nEl !== 5) errors.push(`elements=${nEl} (期望 5)`)
if (nStem !== 10) errors.push(`stems=${nStem} (期望 10)`)
if (nBranch !== 12) errors.push(`branches=${nBranch} (期望 12)`)
if (nSea !== 12) errors.push(`seasons=${nSea} (期望 12)`)
const wx = new Set(['木', '火', '土', '金', '水'])
for (const r of db.prepare('SELECT name, generates, restricts FROM elements').all()) {
  if (!wx.has(r.name) || !wx.has(r.generates) || !wx.has(r.restricts)) errors.push(`elements 值非法: ${JSON.stringify(r)}`)
}
for (const t of ['stems', 'branches']) {
  for (const r of db.prepare(`SELECT name, ord, element FROM ${t}`).all()) {
    if (!wx.has(r.element)) errors.push(`${t} element 非法: ${r.name}->${r.element}`)
    if (!Number.isInteger(r.ord) || r.ord < 0 || r.ord >= (t === 'stems' ? 10 : 12)) errors.push(`${t} ord 越界: ${r.name}`)
  }
}
for (const r of db.prepare('SELECT name, month, day FROM seasons').all()) {
  if (!Number.isInteger(r.month) || r.month < 1 || r.month > 12 || !Number.isInteger(r.day) || r.day < 1 || r.day > 31) errors.push(`season 值非法: ${JSON.stringify(r)}`)
}

db.close()
if (errors.length) {
  console.log('DB SELF-CHECK FAIL')
  for (const e of errors) console.log('  - ' + e)
  process.exit(1)
}
console.log(`DB SELF-CHECK PASS: beads=${nBeads} materials=${nMats} variants=${nVar} | elements=${nEl} stems=${nStem} branches=${nBranch} seasons=${nSea}`)
