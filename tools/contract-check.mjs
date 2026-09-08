// contract-check.mjs — 原子契约测试：真跑核心能力/规则原子，失败即非零退出（verified 依据）。
// 运行前先执行 tools/sync-atoms.mjs 组装 .build/ontology（含 src/_atoms）。
const B = 'file:///D:/Ontology/bazidiy/.build/ontology/src/'
const bazi = await import(B + '_atoms/calculate_chart/index.ts')
const wux = await import(B + '_atoms/infer_verdict/index.ts')
const prop = await import(B + '_atoms/propose_designs/index.ts')
const solver = await import(B + '_atoms/solve_styles/index.ts')
const stylesEng = await import(B + '_atoms/solve_styles/styles.ts')
const parseSlotsM = await import(B + '_atoms/parse_slots/index.ts')
const genM = await import(B + '_atoms/generate_design/index.ts')
const namingM = await import(B + '_atoms/rules.naming/index.ts')
const strengthM = await import(B + '_atoms/rules.strength/index.ts')
const verdictM = await import(B + '_atoms/rules.verdict_choice/index.ts')
const consM = await import(B + '_atoms/rules.consistency/index.ts')
const selectM = await import(B + '_atoms/select_beads/index.ts')

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
run('bazidiy.rules.strength', () => {
  assert(strengthM.judgeStrength('金', '金').strength === 'strong', 'strong')
  assert(strengthM.judgeStrength('金', '水').strength === 'weak', 'weak')
})
run('bazidiy.rules.verdict_choice', () => {
  const v = verdictM.chooseVerdict('strong', '金')
  assert(JSON.stringify(v.favorable) === '["木","水"]', 'fav')
})
run('bazidiy.rules.naming', () => {
  assert(namingM.isCanonicalName('南红') === true && namingM.isCanonicalName('玛瑙') === false, 'canonical')
  assert(namingM.resolveVariant('白银', 10)?.variant === 'round', 'resolve')
})
run('bazidiy.rules.consistency', () => {
  assert(consM.checkConsistency().length === 0, '无冲突')
})
console.log(fail === 0 ? 'ALL CONTRACT PASS' : 'CONTRACT FAILS=' + fail)
process.exit(fail ? 1 : 0)
