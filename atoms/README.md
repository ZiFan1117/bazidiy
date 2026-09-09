# Atoms · BaziDIY 软件原子（v0.3）

> 每个原子一个文件夹：`atoms/<id>/<id>.atom.md`（契约文档）+ `detail.json`（机器可读边车）+ `impl/`（实现）+ `tests/`（原子级测试）。
> 实现单一事实源 = `atoms/<id>/impl/`；发布视图由 `tools/sync-atoms.mjs` 组装。完整说明见仓库根 README。

## 原子一览

| 原子（文件夹） | intent | layer | detail.json |
| --- | --- | --- | --- |
| `bazidiy.assistant_preset/` | 定义“手串定制助手”角色：严格流程、硬约束与话术 | capability | ✓ |
| `bazidiy.calculate_chart/` | 把公历生辰与时辰排成四柱八字并统计五行 | capability | ✓ |
| `bazidiy.derive/` | 统一确定性推导（排盘→旺衰→喜忌→筛珠→款式），附 R1–R14 证据链 | capability | ✓ |
| `bazidiy.design_memory/` | 按会话保存/恢复一次最终设计方案（save/load 两方法） | capability | ✓ |
| `bazidiy.generate_design/` | 解析并校验完整珠序后定稿最终手串方案 | capability | ✓ |
| `bazidiy.infer_verdict/` | 判定日主旺衰并推导喜用神与忌神 | capability | ✓ |
| `bazidiy.kb/` | BaziDIY 领域本体与数据：五行/干支/节气 + 珠料×变体=珠 + 款式槽位（Apache Ossie 合并篇） | primitive | ✓ |
| `bazidiy.parse_slots/` | 把“珠名:直径,珠名:直径”珠序串解析消歧为槽位序列 | capability | ✓ |
| `bazidiy.plugin/` | 框架原子：把 7 个工具与三项装配能力（珠子静态路由 / 客户端 toolview / 运行时 invariant）注册进 dsh 宿主 | capability | ✓ |
| `bazidiy.propose_designs/` | 一链出方案：旺衰→喜忌→筛珠→款式求解→给喜忌珠与可选方案 | capability | ✓ |
| `bazidiy.rules/` | 五行判据与约束：生克遍历、旺衰、喜忌、全组合自检、R1–R14 清单与封闭世界守卫 | primitive | ✓ |
| `bazidiy.rules.naming/` | 定义珠子命名规则：必须全称、禁止缩写、同名变体优先非隔片 | primitive | ✓ |
| `bazidiy.select_beads/` | 按喜忌从珠子库筛出 suitable 与 unsuitable（隔片豁免） | capability | ✓ |
| `bazidiy.solve_styles/` | 按款式槽位约束枚举组合，求腕围下可行方案与不可行款式原因 | capability | ✓ |
| `bazidiy.styles/` | 从款式库构建 Style/Position/Constraint，并提供候选过滤与约束校验器 | capability | ✓ |
| `bazidiy.ui.bead_editor/` | 可视化逐颗换珠与调直径的编辑器 | capability | ✓ |
| `bazidiy.ui.svg_render/` | 把定稿槽位序列渲染成手串 SVG 卡片 | capability | ✓ |
