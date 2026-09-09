// check-encoding.mjs — 编码闸：文本文件必须 UTF-8 无 BOM、可完整解码，且无 GBK mojibake 残码。
// 项目自带的 check-utf8 只查 BOM 与 U+FFFD，抓不到“有效但错误”的 mojibake（GBK 残码），本闸补上。
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TEXT = /\.(ts|tsx|mjs|cjs|js|json|yml|yaml|md|css|html|bat|sh|ttl|sql|txt|gitignore)$/
const SKIP_DIRS = new Set(['node_modules', '.git', 'lib', 'dist', '.build', '__pycache__'])
const MOJIBAKE = /\u{9225}|\u{951b}|\u{9428}|\u{935c}|\u{5a34}|\u{5a06}|\u{93c2}|\u{9351}|\u{7eeb}|\u{95b0}|\u{752f}|\u{7481}|\u{93b4}|\u{93c9}|\u{9422}|\u{93c3}|\u{93ac}|\u{9475}|\u{9429}|\u{9359}|\u{9356}|\u{93c4}/u

const files = []
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const p = join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (TEXT.test(entry.name) || entry.name === '.gitignore') files.push(p)
  }
}
walk(ROOT)

const bom = []
const invalid = []
const mojibake = []
for (const p of files) {
  const bytes = readFileSync(p)
  const rel = relative(ROOT, p).replaceAll('\\', '/')
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bom.push(rel)
  const text = bytes.toString('utf8')
  if (text.includes('\uFFFD')) invalid.push(rel)
  if (MOJIBAKE.test(text)) mojibake.push(rel)
}

if (bom.length + invalid.length + mojibake.length > 0) {
  console.error('[check-encoding] FAIL')
  for (const f of bom) console.error('  BOM:      ' + f)
  for (const f of invalid) console.error('  INVALID:  ' + f)
  for (const f of mojibake) console.error('  MOJIBAKE: ' + f)
  process.exit(1)
}
console.log(`CHECK-ENCODING PASS (${files.length} text files: UTF-8, no BOM, no mojibake)`)
