// gen-kb.mjs — BaziDIY 领域知识生成器（wuxing-ganzhi + style-library）。
// 珠子库已迁移到 kb/ossie（Apache Ossie 标准：ontology.yaml + semantic_model.yaml + data/*.sql），
// 由 tools/gen-ossie-db.mjs + tools/gen-bindings.mjs 生成，不再由本脚本负责。
// 输出：kb/*.ttl + packages/ontology/src/kb/{vocab,styleLibrary}.ts
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const KB = join(ROOT, 'kb')
const KB_TS = join(ROOT, 'packages', 'ontology', 'src', 'kb')
mkdirSync(KB, { recursive: true })
mkdirSync(KB_TS, { recursive: true })

// ---------------------------------------------------------------- 词库（本体/主干）
const ELEMENTS = ['木', '火', '土', '金', '水']
const GENERATES = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const RESTRICTS = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }
const STEM_ELEMENT = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']
const STEM_NAMES = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCH_ELEMENT = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水']
const BRANCH_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const SEASONS = [
  ['立春', 2, 4], ['惊蛰', 3, 6], ['清明', 4, 5], ['立夏', 5, 6],
  ['芒种', 6, 6], ['小暑', 7, 7], ['立秋', 8, 7], ['白露', 9, 8],
  ['寒露', 10, 8], ['立冬', 11, 7], ['大雪', 12, 7], ['小寒', 1, 6],
]

// ------------------------------------------------------------ 款式（从 data 推导）
const stylesSrc = (await import('file:///' + join(ROOT, 'packages', 'ontology', 'src', 'data', 'styles.ts').replace(/\\/g, '/'))).styles

// ---------------------------------------------------------------- Turtle 写出
const esc = (s) => JSON.stringify(String(s))
const w = (lines) => lines.join('\n') + '\n'

function vocabTTL() {
  const L = ['@prefix bzd: <https://bazidiy.example/ontology#> .', '', 'bzd:WuxingGanzhiOntology a owl:Ontology .', '', 'bzd:WuxingElement a owl:Class .', 'bzd:HeavenlyStem a owl:Class .', 'bzd:EarthlyBranch a owl:Class .', 'bzd:SeasonNode a owl:Class .', 'bzd:generates a owl:ObjectProperty .', 'bzd:restricts a owl:ObjectProperty .', 'bzd:belongsToElement a owl:ObjectProperty .', 'bzd:order a owl:DatatypeProperty .', 'bzd:month a owl:DatatypeProperty .', 'bzd:day a owl:DatatypeProperty .', '']
  for (const e of ELEMENTS) {
    L.push(`bzd:${e} a bzd:WuxingElement .`)
    L.push(`bzd:${e} bzd:generates bzd:${GENERATES[e]} .`)
    L.push(`bzd:${e} bzd:restricts bzd:${RESTRICTS[e]} .`)
  }
  L.push('')
  STEM_NAMES.forEach((n, i) => {
    L.push(`bzd:${n} a bzd:HeavenlyStem .`)
    L.push(`bzd:${n} bzd:order ${i} .`)
    L.push(`bzd:${n} bzd:belongsToElement bzd:${STEM_ELEMENT[i]} .`)
  })
  L.push('')
  BRANCH_NAMES.forEach((n, i) => {
    L.push(`bzd:${n} a bzd:EarthlyBranch .`)
    L.push(`bzd:${n} bzd:order ${i} .`)
    L.push(`bzd:${n} bzd:belongsToElement bzd:${BRANCH_ELEMENT[i]} .`)
  })
  L.push('')
  for (const [name, m, d] of SEASONS) {
    L.push(`bzd:${name} a bzd:SeasonNode .`)
    L.push(`bzd:${name} bzd:month ${m} .`)
    L.push(`bzd:${name} bzd:day ${d} .`)
  }
  return w(L)
}

function styleTTL() {
  const L = ['@prefix bzd: <https://bazidiy.example/ontology#> .', '', 'bzd:StyleLibraryOntology a owl:Ontology .', '', 'bzd:Style a owl:Class .', 'bzd:config a owl:DatatypeProperty .', '']
  for (const [id, cfg] of Object.entries(stylesSrc.styles)) {
    L.push(`bzd:${id} a bzd:Style .`)
    const payload = { name: cfg.name, positions: cfg.positions, constraints: cfg.constraints }
    L.push(`bzd:${id} bzd:config ${esc(JSON.stringify(payload))} .`)
    L.push('')
  }
  L.push('bzd:spacerMap a owl:Class .')
  for (const [bd, sd] of Object.entries(stylesSrc.spacer_diameter_map)) {
    L.push(`bzd:spacerMap${bd} a bzd:spacerMap .`)
    L.push(`bzd:spacerMap${bd} bzd:body ${bd} .`)
    L.push(`bzd:spacerMap${bd} bzd:spacer ${sd} .`)
  }
  return w(L)
}

// ------------------------------------------------------------- Turtle 解析（自检用）
function parseTTL(text) {
  const triples = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('@') || line.startsWith('#')) continue
    const m = line.match(/^(\S+)\s+(\S+)\s+(.+?)\.\s*$/)
    if (!m) throw new Error('ttl 无法解析行: ' + raw)
    const o = m[3].trim()
    let val
    if (o.startsWith('"')) {
      const end = o.indexOf('"', 1)
      val = end >= 0 ? o.slice(1, end) : o
    } else if (/^-?\d+(\.\d+)?$/.test(o)) {
      val = Number(o)
    } else if (o === 'true') val = true
    else if (o === 'false') val = false
    else val = o
    triples.push({ s: m[1], p: m[2], o: val })
  }
  return triples
}

function tsVocab() {
  const stems = STEM_NAMES.map((n, i) => ({ name: n, order: i, element: STEM_ELEMENT[i] }))
  const branches = BRANCH_NAMES.map((n, i) => ({ name: n, order: i, element: BRANCH_ELEMENT[i] }))
  const seasons = SEASONS.map(([name, month, day]) => ({ name, month, day }))
  const lines = [
    '// GENERATED by tools/gen-kb.mjs from kb/wuxing-ganzhi.ttl — do not edit; edit the .ttl then re-run.',
    '// BaziDIY 五行·干支·节气 词库绑定（只读）。',
    'export const elementOrder: string[] = ' + JSON.stringify(ELEMENTS),
    'export const generates: Record<string, string> = ' + JSON.stringify(GENERATES),
    'export const restricts: Record<string, string> = ' + JSON.stringify(RESTRICTS),
    'export interface Stem { name: string; order: number; element: string }',
    'export interface Branch { name: string; order: number; element: string }',
    'export interface SeasonNode { name: string; month: number; day: number }',
    'export const stems: Stem[] = ' + JSON.stringify(stems),
    'export const branches: Branch[] = ' + JSON.stringify(branches),
    'export const seasons: SeasonNode[] = ' + JSON.stringify(seasons),
    'export const STEM_NAMES: string[] = ' + JSON.stringify(STEM_NAMES),
    'export const BRANCH_NAMES: string[] = ' + JSON.stringify(BRANCH_NAMES),
    'export const STEM_ELEMENT: Record<string, string> = ' + JSON.stringify(Object.fromEntries(stems.map((s) => [s.name, s.element]))),
    'export const BRANCH_ELEMENT: Record<string, string> = ' + JSON.stringify(Object.fromEntries(branches.map((b) => [b.name, b.element]))),
    '',
  ]
  return lines.join('\n')
}

function tsStyles() {
  return [
    '// GENERATED by tools/gen-kb.mjs from kb/style-library.ttl — do not edit; edit the .ttl then re-run.',
    '// BaziDIY 款式库绑定（只读）。',
    'export const styles: Record<string, unknown> = ' + JSON.stringify(stylesSrc, null, 2),
    '',
  ].join('\n')
}

writeFileSync(join(KB, 'wuxing-ganzhi.ttl'), vocabTTL(), 'utf8')
writeFileSync(join(KB, 'style-library.ttl'), styleTTL(), 'utf8')
const styleCount = parseTTL(styleTTL()).filter((t) => t.p === 'a' && t.o === 'bzd:Style').length
console.log('ttl written: styles=' + styleCount + ' vocab ok=' + parseTTL(vocabTTL()).length + ' triples (bead 已归 kb/ossie)')

writeFileSync(join(KB_TS, 'vocab.ts'), tsVocab(), 'utf8')
writeFileSync(join(KB_TS, 'styleLibrary.ts'), tsStyles(), 'utf8')
console.log('bindings written: vocab.ts, styleLibrary.ts')
