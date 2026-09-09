---
id: bazidiy.derive
layer: capability
version: 0.1.0
intent: "统一确定性推导：生日+时辰 → 八字/旺衰/喜忌 → 候选材质 → 各款式逐槽方案，附 R1–R14 证据链"
when_to_use: "适用：Agent 一次调用拿到完整可解释方案；需要封闭世界拒绝域外输入时。"
language: zh-CN
tags: ["derive","pipeline","evidence","closed-world","deterministic"]
category: other
side_effects: none
lang: typescript
author: ZiFan1117
verified: true
implementation_ref: "bazidiy @bazidiy/ontology: atoms/bazidiy.derive/impl/index.ts + impl/evidence.ts（证据链）"
deps: ["bazidiy.calculate_chart","bazidiy.infer_verdict","bazidiy.kb","bazidiy.propose_designs","bazidiy.rules"]
input: {"type":"object","required":["birth_date","birth_hour","wrist_cm"],"properties":{"birth_date":{"type":"string"},"birth_hour":{"type":"string"},"gender":{"type":"string"},"wrist_cm":{"type":"number"},"bead_ids":{"type":"array","items":{"type":"string"}},"style_ids":{"type":"array","items":{"type":"string"}}}}
output: {"type":"object","required":["ok","day_master","strength","favorable","unfavorable","designs","evidence"],"properties":{"ok":{"type":"boolean"},"day_master":{"type":"string"},"day_master_element":{"type":"string"},"strength":{"type":"string","enum":["strong","weak"]},"favorable":{"type":"array","items":{"type":"string"}},"unfavorable":{"type":"array","items":{"type":"string"}},"designs":{"type":"array","items":{"type":"object"}},"unavailable_styles":{"type":"array","items":{"type":"object"}},"evidence":{"type":"array","items":{"type":"object"}},"reason":{"type":"string"}}}
tests: [{"input":{"birth_date":"1990-05-15","birth_hour":"午时","wrist_cm":17},"expect":{"ok":true,"day_master_element":"金"}}]
---
## 它做什么

统一确定性推导：生日+时辰 → 八字/旺衰/喜忌 → 候选材质 → 各款式逐槽方案，附 R1–R14 证据链。确定性实现：不调用 LLM、不依赖网络、可重复可测试。

一次调用把原先“排盘 → 提方案”两步合成一条可解释链：每步写入证据（规则编号 + 输入 + 结论），域外输入按封闭世界语义返回 `ok:false` 与 `reason`，而不是给“可能的答案”。可选 `style_ids` 只对指定款式求解。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
IN[birth_date, birth_hour, wrist_cm] --> B[calculate_chart]
B --> G{五行在闭合集合?}
G -- 否 --> X[ok:false + R12 reason]
G -- 是 --> V[infer_verdict 旺衰/喜忌]
V --> P[propose_designs 筛珠+求解]
P --> S{style_ids 限定?}
S -- 是 --> F[按款式过滤]
S -- 否 --> A[全部方案]
F --> OUT[ok + designs + evidence]
A --> OUT
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class Derive { +derive(req) }
Derive --> CalculateChart
Derive --> InferVerdict
Derive --> ProposeDesigns
Derive --> Evidence
Derive --> Guards
Derive --> DesignOption
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant A as Agent
participant D as derive
participant E as Evidence
A->>D: derive({birth_date, birth_hour, wrist_cm:17})
D->>D: calculateBazi → 庚金 / 月支火
D->>E: add(R1, 四柱, …)
D->>D: inferWuxing → weak, 喜土金
D->>E: add(R2/R3, 旺衰/喜忌, …)
D->>D: propose → 10 方案
D-->>A: ok:true, designs, evidence(17)
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
derive --> calculateBazi
derive --> inferWuxing
derive --> propose
derive --> isWuxingElement
derive --> Evidence
derive --> filterByStyleIds
```

## 何时用

- 适用：Agent 一次调用拿到完整可解释方案；需要封闭世界拒绝域外输入时。
- 不适用：不落盘（持久化在 bazidiy.design_memory）；不做最终文案定稿（定稿在 bazidiy.generate_design）。

## 示例

输入 `{ birth_date:"1990-05-15", birth_hour:"午时", wrist_cm:17 }` → `{ ok:true, day_master:"庚金", strength:"weak", favorable:["土","金"], unfavorable:["火","水"], designs:[10], evidence:[17] }`；指定 `style_ids:["B-02"]` 时只返回 B-02 的方案，无解则 `ok:false` + `reason`。
