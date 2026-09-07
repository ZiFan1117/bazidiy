# BaziDIY 本体 → 软件原子市场 拆分定稿（草稿 v1）

> 状态：**草稿**（不落地、不提交、`verified:false`）。来源仓库 `ZiFan1117/bazidiy`（八字五行手串定制 dsh 插件）。
> 目标：按 software-atom-market 判据把 `@bazidiy/ontology` 拆成可复用原子，知识层本体化（OWL/Turtle）。

## 0. 拆分判据（来自 software-atom-market SPEC/schema）

- 单意图原子性：一个原子 = 能用一句话说清的意图；大则拆、小则合。
- 原子 = 自包含单元；**代码零内嵌（C1）**，跨原子依赖只允许 import/include 引用（C2），写进 `deps`。
- 每个原子声明 I/O（JSON-Schema）与类型化接口（C3）；依赖图透明（C4）。
- 机器闸：`id/layer/version/intent/description/input/output` 必填；description 四节 + 四图；枚举合法。

## 0.1 语言与披露基调（定稿）

- 正文语言：`zh-CN`（领域术语中文）；标识符/枚举/代码用英文；检索用英文 `tags`。
- 渐进披露的两层载体即市场协议：frontmatter 的 `id/intent(+when_to_use)`＝列表/搜索一句；frontmatter 之后的正文本体（四节四图）＝详情层，命中后才整篇读取。
- 本仓原子文档 = **v0.3 整份 `<id>.atom.md`（skills/SKILL.md 式）**：`---` YAML frontmatter（含 id/layer/version/intent/when_to_use/language/input/output/tests…，数组/对象 JSON 内联）+ `---` 后的正文四节；只用四个 `##`，不用 `###`，四图以加粗行标注。
- 需要机器可读明细：`.atom.md` 之外另存结构化边车 `details/<id>.detail.json`（JSON），与 `atoms/<id>.atom.md` 一一对应，由 `implementation_ref` 关联。

## 1. 分层模型（两型，自下而上单向依赖）

```
⑤ 角色   assistant_preset
④ 呈现   ui.svg_render · ui.bead_editor
③ 能力   计算/判据执行/流程/存取（确定性，无 LLM）
  规则(判据数据+轻量求值) strength · verdict_choice · naming · consistency
② 知识本体(OWL/Turtle)  kb.wuxing_ganzhi · kb.bead_catalog · kb.style_library
① 概念与术语唯一源（同②的词表部分），无内嵌
```

| 型 | 含义 | 市场 layer |
|---|---|---|
| 支撑型 | 声明/判据数据，供人 import；本体+规则 | `primitive` |
| 能力型 | 执行/组合，import 支撑或彼此 | `capability` |

## 2. 18 个原子清单

### 知识本体（primitive · OWL/Turtle · 单一事实源）

| id | 一句话 | 本体内容（类/个体/属性） |
|---|---|---|
| `bazidiy.kb.wuxing_ganzhi` | 五行/干支/节气基础词汇是什么 | 类：五行元素/天干/地支/时节；个体：木火土金水、甲…癸、子…亥；对象属性：生(generates)、克(restricts) |
| `bazidiy.kb.bead_catalog` | 珠子库里有哪些珠子、各自什么样 | 类：珠料/变体/珠实例；个体：33 珠；对象属性：属五行、是变体；数据属性：直径/色/图/宽高比 |
| `bazidiy.kb.style_library` | 款式结构是什么 | 类：款式/槽位/角色；个体：B-01…B-10；约束属性：允许变体、直径范围、隔片径映射 |

### 规则（primitive · 带 IRI 判据数据 + 轻量求值）

| id | 判据一句话 | 引用的本体 |
|---|---|---|
| `bazidiy.rules.strength` | 月令与日主同/生 → 判旺衰 | kb.wuxing_ganzhi |
| `bazidiy.rules.verdict_choice` | 按旺衰给喜/忌 | kb.wuxing_ganzhi |
| `bazidiy.rules.naming` | 珠名全称、禁缩写、同名变体优先 round | kb.bead_catalog |
| `bazidiy.rules.consistency` | 喜忌不得交集自检 | 规则 self |

### 能力（capability · 确定性）

| id | 一句话（intent） | 输入 → 输出 | import（deps） |
|---|---|---|---|
| `bazidiy.calculate_chart` | 按公历生辰+时辰排四柱 | 生日+时辰+性别 → 四柱/日主/五行 | kb.wuxing_ganzhi |
| `bazidiy.infer_verdict` | 判旺衰并推喜忌 | 日主/月支五行IRI → 强/弱+喜/忌+理由 | rules.strength, rules.verdict_choice |
| `bazidiy.select_beads` | 按喜忌筛选珠子 | 喜忌 + 库存 → suitable/unsuitable | kb.bead_catalog, rules.verdict_choice |
| `bazidiy.solve_styles` | 枚举组合求可行款式 | 可用珠+腕围 → 方案/不可用原因 | kb.style_library, kb.bead_catalog |
| `bazidiy.parse_slots` | 珠序串解析+消歧 | 珠序串 → 槽位或 null | kb.bead_catalog, rules.naming |
| `bazidiy.propose_designs` | 一链出提案（框架/组合） | 五行+腕围+珠限定 → 提案 | infer_verdict, select_beads, solve_styles |
| `bazidiy.generate_design` | 定稿（框架/组合） | 款式+珠序+说明 → 定稿或 note | parse_slots, rules.naming, kb.bead_catalog |
| `bazidiy.design_memory` | 方案按会话存取 | 方案(save)/空(load) → 已存/已取或未存 | —（storage domain） |
| `bazidiy.ui.svg_render` | 槽位序列渲染手串 SVG | 槽位 → SVG | kb.bead_catalog（图 key） |
| `bazidiy.ui.bead_editor` | 可视化换珠编辑 | 槽位 → 可编辑 UI | ui.svg_render, kb.bead_catalog |
| `bazidiy.assistant_preset` | 定义助手角色与流程 | 对话 → 助手回复 | 上述工具 |

> `propose_designs`/`generate_design`/`calculate_chart` 是"把下层都串起来才交付"的**框架/组合**能力；save/load 合为一个 `design_memory` 的两方法。

## 3. 代码约定 C1–C4（落地要求）

1. **C1 零内嵌**：五行/干支/珠子/样式术语全系统唯一来源 = 本体。删除 `bazi.ts` 内联 `TIAN_GAN/DI_ZHI/JIE_QI/WX_*` 等表与 `data/*.ts` 中的重复词表，改引本体绑定。
2. **C2 只引用**：原子间依赖用 import/npm，写在 manifest `deps` 与本包 package.json；不拷贝实现。
3. **C3 I/O**：每个能力给出 input/output JSON-Schema 与类型化函数签名；每个本体原子给出"术语查询 → 子图 JSON"。
4. **C4 依赖透明**：见 §2 表与 §4 图，无隐含交叉。

## 4. 依赖图

```
assistant_preset → ui.* / 各工具能力
ui.bead_editor → ui.svg_render, kb.bead_catalog
propose_designs → infer_verdict, select_beads, solve_styles
generate_design → parse_slots, rules.naming, kb.bead_catalog
solve_styles → kb.style_library, kb.bead_catalog
select_beads → kb.bead_catalog, rules.verdict_choice
parse_slots → kb.bead_catalog, rules.naming
infer_verdict → rules.strength, rules.verdict_choice, kb.wuxing_ganzhi
calculate_chart → kb.wuxing_ganzhi
rules.* / kb.bead_catalog / kb.style_library → kb.wuxing_ganzhi（术语引用）
```

## 5. 本体建模映射（.ttl 草案见 kb/）

| kb | 前缀命名空间 | 代表类 | 代表对象属性 | 代表数据属性 |
|---|---|---|---|---|
| wuxing-ganzhi | `bzd:` https://bazidiy.example/ontology# | 五行元素/天干/地支/时节 | 生/克 | 序数/所属 |
| bead-catalog | 同 | 珠料/变体/珠实例 | 属五行/是变体 | 直径/颜色/图/宽高比 |
| style-library | 同 | 款式/槽位/槽位角色 | 含槽位/允许变体 | 直径范围/隔片径/角色 |

## 6. 对软件原子市场的对接

- 规则/判据形态：判据写成"带本体 IRI 的声明式规则数据 + 轻量确定性求值器"；不引入重 OWL-DL 推理机；本体只做加载期轻量物化（CPU、确定性、零网络）。
- 发布通道（后续另定）：联邦（bazidiy 仓加 `atoms/*.atom.md` + topic `software-atom`）或中央 PR。
- 许可/署名前置待办：bazidiy 顶层 `LICENSE`=GPL-3.0、`README` 声明 GPL-3.0，但 `packages/ontology/package.json` 写 MIT；市场投稿默认 MIT。投稿前须对齐。`author` 默认 `ZiFan1117`，可改。
- **市场增强备注（仅备案，不提交）**：dsh-atom-market `atom_search` 的检索面目前仅为 `id + intent + category`，`tags` 不入 registry index、不参与检索；若要提升召回，建议把 `tags`（及 description 首段/摘要）并入索引与检索 haystack —— 属 software-atom-market 生态演进项。

## 7. 文件产物

```
bazidiy-split-drafts/
├─ SPLIT.md                       本文件
├─ build-atoms.mjs                生成器（改一处可整体重出）
├─ kb/wuxing-ganzhi.ttl           OWL/Turtle 词库本体（草案）
├─ kb/bead-catalog.ttl            珠子库本体（草案）
├─ kb/style-library.ttl           样式库本体（草案）
├─ atoms/<id>.atom.md ×18        原子文档（v0.3 整份式：YAML frontmatter 元数据 + 正文四节四图；verified:false）
└─ details/<id>.detail.json ×18  结构化 JSON 边车（language/intent/when_to_use/deps/io/diagrams/when/example）
```
