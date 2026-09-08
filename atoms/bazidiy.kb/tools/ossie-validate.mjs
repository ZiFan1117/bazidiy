// ossie-validate.mjs — 官方 Apache Ossie validator（Python validate.py）双文档闸门。
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const py = process.env.PYTHON ?? (process.platform === 'win32' ? 'D:/dsh/Python312/python.exe' : 'python3')
const validate = join('D:/Ontology/ossie', 'validation', 'validate.py') // Apache ossie 本地检出
const checks = [
  { doc: join(ROOT, 'kb', 'ossie', 'ontology.yaml'), schema: join('D:/Ontology/ossie', 'ontology', 'ontology.json') },
  { doc: join(ROOT, 'kb', 'ossie', 'bead_catalog.semantic.yaml'), schema: join('D:/Ontology/ossie', 'core-spec', 'ossie-schema.json') },
  { doc: join(ROOT, 'kb', 'ossie', 'wuxing_catalog.semantic.yaml'), schema: join('D:/Ontology/ossie', 'core-spec', 'ossie-schema.json') },
  { doc: join(ROOT, 'kb', 'ossie', 'style_catalog.semantic.yaml'), schema: join('D:/Ontology/ossie', 'core-spec', 'ossie-schema.json') },
]
let ok = true
for (const c of checks) {
  const r = spawnSync(py, [validate, c.doc, '--schema', c.schema], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1' } })
  const out = (r.stdout || '') + (r.stderr || '')
  const passed = out.includes('Validation PASSED')
  console.log((passed ? 'PASS' : 'FAIL') + '  ' + c.doc)
  if (!passed) { ok = false; console.log(out) }
}
process.exit(ok ? 0 : 1)
