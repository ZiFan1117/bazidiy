// check-imports.mjs — 引用纪律自检：原子真源只允许相对/裸包 import；禁 file:// 与盘符绝对路径。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
const SRC = 'D:/Ontology/bazidiy/atoms'
const files = []
const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.(ts|tsx|mjs)$/.test(e)) files.push(p) } }
walk(SRC)
let bad = 0
for (const f of files) {
  const txt = readFileSync(f, 'utf8')
  for (const m of txt.matchAll(/from\s+'([^']+)'/g)) {
    const spec = m[1]
    if (spec.startsWith('file:') || spec.startsWith('/') || /^[A-Za-z]:\//.test(spec) || spec.startsWith('D:\\') || spec.startsWith('C:\\')) {
      console.log('ABSOLUTE', f.replace(SRC, ''), spec); bad++
    }
  }
}
console.log(bad === 0 ? 'CHECK-IMPORTS PASS (' + files.length + ' files)' : 'CHECK-IMPORTS FAIL=' + bad)
process.exit(bad ? 1 : 0)
