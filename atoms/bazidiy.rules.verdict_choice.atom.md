---
id: bazidiy.rules.verdict_choice
layer: primitive
version: 0.1.0
intent: "依据旺衰给出喜用神与忌神选择规则"
when_to_use: "适用：给出喜用/忌神五行集合供筛珠。"
language: zh-CN
tags: ["rule","wuxing","favorable","unfavorable"]
category: other
side_effects: none
lang: "rule-data + evaluator"
author: ZiFan1117
verified: true
tests: [{"input":{"strength":"strong","day_master_element":"金"},"expect":{"favorable":["木","水"]}}]
implementation_ref: "bazidiy @bazidiy/ontology: src/atoms/rules/verdictChoice.ts（数据 data/wuxing.ts favorable/unfavorable_rules）"
deps: ["bazidiy.kb","bazidiy.rules.relations"]
input: {"type":"object","required":["strength","day_master_element"],"properties":{"strength":{"type":"string","enum":["strong","weak"]},"day_master_element":{"type":"string"}}}
output: {"type":"object","properties":{"favorable":{"type":"array","items":{"type":"string"}},"unfavorable":{"type":"array","items":{"type":"string"}},"reasons":{"type":"array","items":{"type":"string"}}}}
---
## 它做什么

依据旺衰给出喜用神与忌神选择规则。确定性实现：不调用 LLM、不依赖网络、可重复可测试（CPU 上“算账”）。

喜忌判据按 strength 选择规则族：身旺喜克泄耗（我克=财、我生=食伤）、忌比劫印；身弱喜生扶（印、比劫）、忌官杀食伤。favorable/unfavorable 通过对五行邻接（沿关系链取后继）推导，规则文件引用本体 IRI。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
IN[strength, day_master_element] --> F{按 strength 选规则族}
F -- strong --> R1[favorable: restricts+generates 邻接]
F -- weak --> R2[favorable: generated_by + include_self]
R1 --> O[favorable[] + unfavorable[] + reasons]
R2 --> O
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class FavorableRule { +condition.strength +favorable_from[] +include_self }
class UnfavorableRule { +condition.strength +unfavorable_from[] }
class VerdictChoice { +pick(strength, dayMaster) }
VerdictChoice --> FavorableRule
VerdictChoice --> UnfavorableRule
VerdictChoice --> WuxingElement : 沿关系取后继
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant U as infer_verdict
participant V as VerdictChoice
U->>V: pick(strong, 金)
V->>V: favorable_from=[restricts,generates]
V-->>U: { favorable:[火,水], unfavorable:[金,土] }
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
pick --> selectFav
pick --> selectUnfav
selectFav --> relationTraverse
```

## 何时用

- 适用：给出喜用/忌神五行集合供筛珠。
- 不适用：不做旺衰判定（那是 strength）。

## 示例

输入 { strength: "strong", day_master_element: "金" } → { favorable: ["火","水"], unfavorable: ["金","土"] }。
