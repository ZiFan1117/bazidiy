---
id: bazidiy.plugin
layer: capability
version: 0.1.0
intent: "把 7 个确定性工具与三项装配能力（珠子静态路由 / 客户端 toolview / 运行时 invariant）注册进 dsh 宿主"
when_to_use: "在 dsh profile 中加载本插件即获得全部模型工具、珠子图与结果卡片、以及加载期数据校验"
language: zh-CN
tags: ["plugin","framework","dsh","tools","assembly"]
category: ai
side_effects: none
lang: typescript
author: ZiFan1117
verified: true
implementation_ref: "bazidiy @bazidiy/ontology: atoms/bazidiy.plugin/impl/index.ts（注册）+ impl/tools/*.ts（7 个工具定义）+ assets.ts（/beads 路由）+ client/index.ts（toolview 槽）+ invariant.ts（加载期校验）"
deps: ["bazidiy.calculate_chart","bazidiy.propose_designs","bazidiy.generate_design","bazidiy.design_memory","bazidiy.derive","bazidiy.rules","bazidiy.infer_verdict","bazidiy.kb","bazidiy.ui.bead_editor"]
input: {"type":"object","properties":{"ctx":{"type":"object","description":"Cordis 上下文：tools / webServer / slots / invariants"}}}
output: {"type":"object","properties":{"tools":{"type":"array","items":{"type":"string"}},"routes":{"type":"array","items":{"type":"string"}},"slots":{"type":"array","items":{"type":"string"}},"invariants":{"type":"array","items":{"type":"string"}}}}
tests: [{"input":{"mount":"web profile"},"expect":{"tools":7,"routes":1,"slots":1,"invariants":1}}]
---
## 它做什么

把 7 个确定性工具与三项装配能力（珠子静态路由 / 客户端 toolview / 运行时 invariant）注册进 dsh 宿主。框架原子：本身不做领域计算，只把下层原子装配成可用的插件。

注册面：`calculate_bazi`、`propose_designs`、`generate_design`、`save_design`、`load_design`、`beads_derive`、`beads_rules`（幂等注册，重复挂载不报错）；`/beads` 前缀路由（静态 PNG + `/beads/catalog.json`）；`tool.call.toolview` 槽的 `generate_design` 卡片；`@bazidiy/ontology` 的加载期 invariant（喜忌无交集 + 目录计数 + 五行单值 + 生克闭合）。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
P[dsh profile 加载] --> A[apply ctx]
A --> T[注册 7 工具]
A --> R[挂 /beads 路由]
A --> S[注入 toolview 槽]
A --> I[安装 invariant]
T --> OUT[模型可调用的工具表]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class Plugin { +apply(ctx) }
Plugin --> Tools : defineTool ×7
Plugin --> Assets : mountBeadAssets
Plugin --> Client : slots.register
Plugin --> Invariant : invariants.register
Plugin --> Atoms : 下层原子
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant L as dsh Loader
participant P as bazidiy.plugin
participant A as 下层原子
L->>P: apply(ctx)
P->>A: 导入工具实现
P->>P: 幂等注册 7 工具
P->>P: 挂 /beads 路由 + toolview 槽
P-->>L: 注册完成（含 disposer）
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
apply --> calculate_chart
apply --> propose_designs
apply --> generate_design
apply --> design_memory
apply --> derive
apply --> rules
invariant --> infer_verdict
invariant --> rules
assets --> kb
client --> ui.bead_editor
```

## 何时用

- 适用：在 dsh profile 中加载本插件即获得全部模型工具、珠子图与结果卡片、以及加载期数据校验。
- 不适用：不做领域计算（在能力原子）；不发布到原子市场以外的运行环境。

## 示例

`dsh web --patch apps/cli/config/bazidiy.patch.yml` → 插件行激活后 `ctx.tools` 出现 7 个工具、`/beads/catalog.json` 可访问、`generate_design` 结果渲染手串卡片；invariant 在加载期报告 0 冲突。
