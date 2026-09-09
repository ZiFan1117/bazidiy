// check-deps.mjs — 依赖透明闸（C4）：atom.md / detail.json 的 deps 必须等于真实跨原子 import。
// 用法：node tools/check-deps.mjs [--fix]   （--fix 按真实 import 回写两处声明）
// 例外：bazidiy.assistant_preset 是 yml 角色原子，deps 表示“挂载的工具”，不做 import 对账。
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ATOMS = join(ROOT, 'atoms')
const FIX = process.argv.includes('--fix')
const YML_ATOMS = new Set(['bazidiy.assistant_preset'])

const ids = readdirSync(ATOMS, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()
const idSet = new Set(ids)
const mirrorToAtom = (seg) => seg === 'kb' ? 'bazidiy.kb' : (idSet.has('bazidiy.' + seg) ? 'bazidiy.' + seg : null)

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.isFile()) out.push(p)
  }
  return out
}

function atomFromSpec(spec) {
  if (!spec.startsWith('.')) return null
  const parts = spec.split('/')
  let i = 0
  while (i < parts.length && (parts[i] === '.' || parts[i] === '..')) i++
  if (parts[i] === '_atoms') i++
  const seg = parts[i]
  return seg ? mirrorToAtom(seg) : null
}

function actualDeps(id) {
  const files = walk(join(ATOMS, id, 'impl')).filter(f => /\.(ts|tsx)$/.test(f))
  const found = new Set()
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    for (const m of text.matchAll(/from\s+'([^']+)'/g)) {
      const dep = atomFromSpec(m[1])
      if (dep && dep !== id) found.add(dep)
    }
  }
  return [...found].sort()
}

function declaredDeps(id) {
  const md = join(ATOMS, id, `${id}.atom.md`)
  if (!existsSync(md)) return null
  const m = readFileSync(md, 'utf8').match(/^deps:\s*(\[[^\n]*\])\s*$/m)
  if (!m) return []
  try { return JSON.parse(m[1]) } catch { return null }
}

function writeDeps(id, deps) {
  const mdPath = join(ATOMS, id, `${id}.atom.md`)
  let md = readFileSync(mdPath, 'utf8')
  const line = `deps: ${JSON.stringify(deps)}`
  if (/^deps:\s*\[[^\n]*\]\s*$/m.test(md)) {
    md = md.replace(/^deps:\s*\[[^\n]*\]\s*$/m, line)
  } else {
    // 插到 implementation_ref 之后（与既有文件顺序一致）
    md = md.replace(/^(implementation_ref:.*)$/m, `$1\n${line}`)
  }
  writeFileSync(mdPath, md, 'utf8')

  const detailPath = join(ATOMS, id, 'detail.json')
  if (existsSync(detailPath)) {
    const obj = JSON.parse(readFileSync(detailPath, 'utf8'))
    obj.deps = deps
    writeFileSync(detailPath, JSON.stringify(obj, null, 2) + '\n', 'utf8')
  }
}

let fail = 0
for (const id of ids) {
  const actual = actualDeps(id)
  const declared = declaredDeps(id)
  if (declared === null) {
    console.log(`[WARN] ${id}: 缺 atom.md 或 deps 不是 JSON 数组，跳过`)
    continue
  }
  const unknown = declared.filter(d => !idSet.has(d))
  if (unknown.length > 0) { console.log(`[ERR ] ${id}: deps 含不存在的原子 ${unknown.join(', ')}`); fail++ }
  if (YML_ATOMS.has(id)) {
    console.log(`[SKIP] ${id}: yml 角色原子，deps=${JSON.stringify(declared)}（挂载的工具，不做 import 对账）`)
    continue
  }
  const missing = actual.filter(d => !declared.includes(d))
  const extra = declared.filter(d => !actual.includes(d))
  const dupes = declared.filter((d, i) => declared.indexOf(d) !== i)
  if (missing.length === 0 && extra.length === 0 && dupes.length === 0) {
    console.log(`[ OK ] ${id}: deps ${declared.length} 项与 import 一致`)
    continue
  }
  if (FIX) {
    writeDeps(id, actual)
    console.log(`[FIX ] ${id}: deps → ${JSON.stringify(actual)}（原缺 ${missing.join(', ') || '无'}；原多 ${extra.join(', ') || '无'}；原重复 ${[...new Set(dupes)].join(', ') || '无'}）`)
  } else {
    if (missing.length > 0) { console.log(`[ERR ] ${id}: 声明缺 ${missing.join(', ')}`); fail++ }
    if (extra.length > 0) { console.log(`[ERR ] ${id}: 声明多余 ${extra.join(', ')}`); fail++ }
    if (dupes.length > 0) { console.log(`[ERR ] ${id}: 声明重复 ${[...new Set(dupes)].join(', ')}`); fail++ }
  }
}
if (FIX) {
  console.log('\n[check-deps --fix] 已按真实 import 回写；请重跑 node tools/check-deps.mjs 复核。')
  process.exit(0)
}
console.log(fail === 0 ? '\nCHECK-DEPS PASS' : `\nCHECK-DEPS FAIL=${fail}`)
process.exit(fail ? 1 : 0)
