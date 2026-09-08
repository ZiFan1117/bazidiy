// sync-atoms.mjs — 从原子真源组装完整的 dsh 插件发布/构建视图。
// 真源都在 bazidiy/atoms/<id>/（文档+impl+tests+assets+tools 同夹；plugin 原子另含 pkg/ 打包配置）。
// 目标：默认 .build/ontology（打 tgz 用）；monorepo 构建成员用 SYNC_ATOMS_TO 指定。
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const ATOMS = join(ROOT, 'atoms')
const PKG = process.env.SYNC_ATOMS_TO || join(ROOT, '.build', 'ontology')
const SKIP_MANIFEST = process.env.SKIP_PKG_MANIFEST === '1'

function mirrorName(dir) {
  if (dir === 'bazidiy.framework') return 'bazidiy.framework'
  return dir.startsWith('bazidiy.') ? dir.slice('bazidiy.'.length) : dir
}
function atomDirs() {
  return readdirSync(ATOMS, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== '__shared').map(d => d.name)
}
function wipeExceptNodes(target) {
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
}

wipeExceptNodes(PKG)
mkdirSync(join(PKG, 'src'), { recursive: true })

// 1) plugin 原子：impl(壳 src) + pkg(打包配置)
const plug = join(ATOMS, 'bazidiy.plugin')
if (existsSync(join(plug, 'impl'))) cpSync(join(plug, 'impl'), join(PKG, 'src'), { recursive: true })
if (existsSync(join(plug, 'pkg'))) {
  for (const f of readdirSync(join(plug, 'pkg'))) {
    if (SKIP_MANIFEST && f === 'package.json') continue
    copyFileSync(join(plug, 'pkg', f), join(PKG, f))
  }
}

// 2) 各原子 impl → src/_atoms/<codeName>（共享 __shared/impl 平铺并入）
const MIRROR = join(PKG, 'src', '_atoms')
mkdirSync(MIRROR, { recursive: true })
for (const dir of atomDirs()) {
  if (dir === 'bazidiy.plugin') continue
  const impl = join(ATOMS, dir, 'impl')
  if (existsSync(impl) && readdirSync(impl).length > 0) cpSync(impl, join(MIRROR, mirrorName(dir)), { recursive: true })
}
if (existsSync(join(ATOMS, '__shared', 'impl'))) cpSync(join(ATOMS, '__shared', 'impl'), MIRROR, { recursive: true })

// 3) 原子 tests → <pkg>/tests（含 plugin 原子集成测试与 real-smoke 等 dev 文件）
const testsDir = join(PKG, 'tests')
let tests = 0
for (const dir of atomDirs()) {
  const t = join(ATOMS, dir, 'tests')
  if (!existsSync(t)) continue
  mkdirSync(testsDir, { recursive: true })
  for (const f of readdirSync(t)) {
    const s = join(t, f)
    if (statSync(s).isFile()) { copyFileSync(s, join(testsDir, f)); tests++ }
  }
}

// 4) kb 原子 assets → <pkg>/assets（发布资源）
const kbAssets = join(ATOMS, 'bazidiy.kb', 'assets')
if (existsSync(kbAssets)) cpSync(kbAssets, join(PKG, 'assets'), { recursive: true })

// 5) persona yml → presets/bazidiy（monorepo 侧 packages/bazidiy/presets/bazidiy；.build 侧 <pkg>/../presets/bazidiy）
const presetsDir = join(dirname(PKG), 'presets', 'bazidiy')
const persona = join(ATOMS, 'bazidiy.assistant_preset', 'impl')
if (existsSync(persona)) {
  mkdirSync(presetsDir, { recursive: true })
  for (const f of readdirSync(persona)) {
    const s = join(persona, f)
    if (statSync(s).isFile()) copyFileSync(s, join(presetsDir, f))
  }
}

console.log(`sync-atoms → ${PKG}`)
console.log(`  plugin impl(壳)+pkg${SKIP_MANIFEST ? '(保留目标 package.json)' : ''}`)
console.log(`  src/_atoms: ${readdirSync(MIRROR).filter(n => !n.endsWith('.yml')).length} 个代码原子`)
console.log(`  tests: ${tests} 个文件`)
console.log(`  assets: ${existsSync(join(PKG, 'assets')) ? 'beads ✓' : '无'}`)
console.log(`  persona: ${existsSync(presetsDir) ? readdirSync(presetsDir).join(',') : '无'}`)
