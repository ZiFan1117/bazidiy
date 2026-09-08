---
id: bazidiy.rules.strength
layer: primitive
version: 0.1.0
intent: "依据月令与日主关系判定日主旺衰（得令/得生）"
when_to_use: "适用：在喜忌选择之前判定日主强弱；判据变更只改规则数据。"
language: zh-CN
tags: ["rule","wuxing","strength","deterministic"]
category: other
side_effects: none
lang: "rule-data + evaluator"
author: ZiFan1117
verified: true
implementation_ref: "bazidiy @bazidiy/ontology: src/atoms/rules/strength.ts（数据 data/wuxing.ts strength_rules）"
deps: ["bazidiy.kb","bazidiy.rules.relations"]
input: {"type":"object","required":["day_master_element","month_branch_wuxing"],"properties":{"day_master_element":{"type":"string","description":"单字五行：金/木/水/火/土"},"month_branch_wuxing":{"type":"string","description":"单字五行"}}}
output: {"type":"object","properties":{"strength":{"type":"string","enum":["strong","weak"]},"reasons":{"type":"array","items":{"type":"string"}}}}
tests: [{"input":{"day_master_element":"金","month_branch_wuxing":"金"},"expect":{"strength":"strong"}}]
---
## 它做什么

依据月令与日主关系判定日主旺衰（得令/得生）。确定性实现：不调用 LLM、不依赖网络、可重复可测试（CPU 上“算账”）。

旺衰判据 = 两条同构规则（得令而旺/得生而旺），以“月支(月令) 与 日主 是否同五行 / 月令是否生日主”决定 strong 与否，理由来自命名的 rule.reason。数据来自 wuxing 本体 strength_rules，术语用 IRI 匹配。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
IN[day_master_element, month_branch_wuxing] --> R[match 规则]
R --> C{命中 strong 规则?}
C -- 是 --> O[strong + reason]
C -- 否 --> O2[weak + 未命中说明]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class StrengthRule { +type: same_as|generates +args +reason }
class Evaluator { +judge(dayMaster, monthBranch) }
Evaluator --> StrengthRule : 逐条 match
Evaluator --> WuxingElement : 按 IRI 比较
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant U as infer_verdict
participant E as Evaluator
U->>E: judge(金, 金)
E->>E: 月令同日主 → strong_same 命中
E-->>U: { strength: strong, reasons:[得令而旺…] }
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
judge --> matchSameAs
judge --> matchGenerates
match --> kbIRI
```

## 何时用

- 适用：在喜忌选择之前判定日主强弱；判据变更只改规则数据。
- 不适用：不做喜忌组合；不排盘。

## 示例

输入 { day_master_element: 金, month_branch_wuxing: 金 } → { strength: "strong", reasons: ["月令与日主同五行，日主得令而旺"] }。
