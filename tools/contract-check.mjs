// contract-check.mjs — 原子契约测试：真跑核心能力/规则原子，失败即非零退出（verified 依据）。
// 运行前先执行 tools/sync-atoms.mjs 组装 .build/ontology（含 src/_atoms）；
// 组装到别处时用 SYNC_ATOMS_TO 指向该包目录。
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BUILD = process.env.SYNC_ATOMS_TO || join(ROOT, '.build', 'ontology')
const B = pathToFileURL(join(BUILD, 'src')).href + '/'

const bazi = await import(B + '_atoms/calculate_chart/index.ts')
const wux = await import(B + '_atoms/infer_verdict/index.ts')
const prop = await import(B + '_atoms/propose_designs/index.ts')
const solver = await import(B + '_atoms/solve_styles/index.ts')
const stylesEng = await import(B + '_atoms/styles/index.ts')
const parseSlotsM = await import(B + '_atoms/parse_slots/index.ts')
const genM = await import(B + '_atoms/generate_design/index.ts')
const namingM = await import(B + '_atoms/rules.naming/index.ts')
const selectM = await import(B + '_atoms/select_beads/index.ts')
const rulesM = await import(B + '_atoms/rules/index.ts')
const deriveM = await import(B + '_atoms/derive/index.ts')

let fail = 0
const run = (id, fn) => {
  try { fn(); console.log('PASS', id) } catch (e) { fail++; console.log('FAIL', id, e.message) }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg) }

run('bazidiy.calculate_chart', () => {
  const r = bazi.calculateBazi('1990-05-15', '午时', '女')
  assert(r.four_pillars === '庚午 壬巳 庚辰 壬午', 'pillars')
  assert(r.day_master_element === '金', 'day master')
})
run('bazidiy.infer_verdict', () => {
  const v = wux.inferWuxing('金', '金')
  assert(v.strength === 'strong' && JSON.stringify(v.favorable) === '["木","水"]', '金金')
})
run('bazidiy.select_beads', () => {
  const beads = prop.loadBeads()
  const { unsuitable } = selectM.selectBeads(beads, new Set(['火', '木']))
  assert(unsuitable.some((b) => b.id === 'nanhong_round'), '南红忌')
  const { suitable } = selectM.selectBeads(beads, new Set(['火', '木']))
  assert(suitable.some((b) => b.id === 'baiyin_round'), '银喜')
})
run('bazidiy.solve_styles', () => {
  const beads = prop.loadBeads().filter((b) => b.variant !== 'spacer')
  const { proposals } = solver.solveStyles(stylesEng.loadStyles(), beads, 17)
  assert(proposals.length > 0, '有方案')
  assert(solver.beadCount(17, 6) === 31, '珠数公式')
})
run('bazidiy.styles', () => {
  assert(stylesEng.loadStyles().length === 4, '四款式')
  assert(stylesEng.SPACER_MAP['10'] === 5, '隔片映射')
  assert(stylesEng.checkConstraint('same_bead', [prop.loadBeads()[0], prop.loadBeads()[0]], {}) === true, 'same_bead')
})
run('bazidiy.parse_slots', () => {
  const ok = parseSlotsM.parseSlots('南红:8,碎银子:4,南红:8')
  assert(ok !== null && ok.length === 3, '解析')
  assert(parseSlotsM.parseSlots('玛瑙:8') === null, '非法名拒绝')
})
run('bazidiy.propose_designs', () => {
  const p = prop.propose([], 17, '金', '金')
  assert(p.designs.length > 0 && p.type === 'design_proposal', 'propose')
})
run('bazidiy.generate_design', () => {
  const good = genM.generateDesign({ style_name: 'B-02', beads: '南红:8,碎银子:4,南红:8', summary: 'x', rationale: 'r' })
  assert(good.slots.length === 3 && good.note === undefined, '定稿')
  const bad = genM.generateDesign({ style_name: 'B-02', beads: '白玉:8', summary: 'x', rationale: 'r' })
  assert(bad.note !== undefined, '非法名 note')
})
run('bazidiy.rules', () => {
  assert(rulesM.judgeStrength('金', '金').strength === 'strong', 'strong')
  assert(rulesM.judgeStrength('金', '水').strength === 'weak', 'weak')
  assert(JSON.stringify(rulesM.chooseVerdict('strong', '金').favorable) === '["木","水"]', 'fav')
  assert(rulesM.checkConsistency().length === 0, '无冲突')
  const rel = rulesM.loadRelations()
  assert(rulesM.follows(rel, 'generates', '金') === '水', 'follows')
  assert(JSON.stringify(rulesM.deriveElements(rel, '金', ['restricts', 'generates'])) === '["木","水"]', 'deriveElements')
  assert(rulesM.listRules().length === 14 && rulesM.ruleById('R12') !== undefined, 'R1–R14')
  assert(rulesM.isWuxingElement('金') === true && rulesM.isWuxingElement('X') === false, '五行闭合')
  assert(rulesM.isCatalogMember('南红') === true && rulesM.isCatalogMember('玛瑙') === false, '目录封闭')
  assert(rulesM.assertSingleWuxing().length === 0 && rulesM.validateWuxingData().length === 0, '数据闭合')
})
run('bazidiy.rules.naming', () => {
  assert(namingM.isCanonicalName('南红') === true && namingM.isCanonicalName('玛瑙') === false, 'canonical')
  assert(namingM.resolveVariant('白银', 10)?.variant === 'round', 'resolve')
})
run('bazidiy.derive', () => {
  const ev = new deriveM.Evidence()
  ev.add('R1', '四柱', '庚午 壬巳 庚辰 壬午')
  assert(ev.snapshot().length === 1 && deriveM.chain('R5', '候选', []).output === '(无)', '证据链')
  const r = deriveM.derive({ birth_date: '1990-05-15', birth_hour: '午时', wrist_cm: 17 })
  assert(r.ok === true && r.day_master_element === '金', '统一推导')
  assert(r.designs.length > 0 && r.evidence.length > 0, '方案+证据')
  const filtered = deriveM.derive({ birth_date: '1990-05-15', birth_hour: '午时', wrist_cm: 17, style_ids: ['B-02'] })
  assert(new Set(filtered.designs.map((d) => d.style)).size === 1 && filtered.designs[0].style === 'B-02', '款式过滤')
  const refused = deriveM.derive({ birth_date: '1990-05-15', birth_hour: '午时', wrist_cm: 17, style_ids: ['B-99'] })
  assert(refused.ok === false && refused.reason.includes('R12'), '域外拒绝')
})
console.log(fail === 0 ? 'ALL CONTRACT PASS' : 'CONTRACT FAILS=' + fail)
process.exit(fail ? 1 : 0)
