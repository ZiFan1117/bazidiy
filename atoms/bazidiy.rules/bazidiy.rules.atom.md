---
id: bazidiy.rules
layer: primitive
version: 0.2.0
intent: "五行判据与约束：生克关系遍历、旺衰、喜忌、全组合自检、R1–R14 规则清单与封闭世界守卫"
when_to_use: "适用：任何需要五行生克/旺衰/喜忌判定、规则可发现性或域外值拒绝的推理。"
language: zh-CN
tags: ["rule","wuxing","strength","verdict","consistency","catalog","guard"]
category: other
side_effects: none
lang: "rule-data + evaluator"
author: ZiFan1117
verified: true
tests: [{"input":{"day_master_element":"金","month_branch_wuxing":"金"},"expect":{"strength":"strong","favorable":["木","水"]}}]
implementation_ref: "bazidiy @bazidiy/ontology: atoms/bazidiy.rules/impl/index.ts（loadRelations/judgeStrength/chooseVerdict/checkConsistency/listRules/guards）"
deps: ["bazidiy.kb"]
input: {"type":"object","required":["day_master_element","month_branch_wuxing"],"properties":{"day_master_element":{"type":"string","description":"单字五行：金/木/水/火/土"},"month_branch_wuxing":{"type":"string","description":"单字五行"},"element":{"type":"string"},"relation":{"type":"string","enum":["self","generates","restricts","generated_by","restricted_by"]}}}
output: {"type":"object","properties":{"strength":{"type":"string","enum":["strong","weak"]},"favorable":{"type":"array","items":{"type":"string"}},"unfavorable":{"type":"array","items":{"type":"string"}},"rules":{"type":"array","items":{"type":"object"}},"conflicts":{"type":"array","items":{"type":"string"}}}}
---
## 它做什么

五行判据与约束：生克关系遍历、旺衰、喜忌、全组合自检、R1–R14 规则清单与封闭世界守卫。确定性实现：不调用 LLM、不依赖网络、可重复可测试。

一个原子覆盖“判据 + 可发现性 + 校验”三件事：`judgeStrength`/`chooseVerdict` 从 kb 的规则数据判旺衰与喜忌；`loadRelations`/`follows`/`deriveElements` 提供生克遍历；`checkConsistency` 做 5×5 全组合自检；`listRules` 输出 R1–R14 清单供调用方先知道边界；`isWuxingElement`/`assertSingleWuxing`/`validateWuxingData` 等守卫实现封闭世界拒绝。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
KB[kb: wuxing 规则数据 + 珠库] --> R[loadRelations]
DM[day_master_element, month_branch_wuxing] --> S[judgeStrength]
S --> V[chooseVerdict]
R --> S
R --> V
V --> OUT[strength + favorable + unfavorable]
KB --> G[guards / listRules]
G --> OUT2[冲突清单 / R1–R14 / 域外拒绝]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class Rules {
  +loadRelations() +follows() +deriveElements()
  +judgeStrength() +chooseVerdict() +checkConsistency()
  +listRules() +ruleById()
  +isWuxingElement() +assertSingleWuxing() +validateWuxingData()
}
Rules --> WuxingData
Rules --> BeadCatalog
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant I as infer_verdict
participant D as derive
participant R as rules
I->>R: judgeStrength(金, 金)
R-->>I: { strength: strong, reasons }
I->>R: chooseVerdict(strong, 金)
R-->>I: { favorable: [木,水], unfavorable: [金,土] }
D->>R: isWuxingElement(金)
R-->>D: true
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
infer_verdict --> rules
derive --> rules
invariant --> rules
beads_rules --> rules
rules --> wuxingData
rules --> beadCatalog
```

## 何时用

- 适用：任何需要五行生克/旺衰/喜忌判定、规则可发现性或域外值拒绝的推理。
- 不适用：不排盘（bazidiy.calculate_chart）；不筛珠/求解款式（bazidiy.select_beads / solve_styles）；不命名消歧（bazidiy.rules.naming）。

## 示例

输入 { day_master_element:"金", month_branch_wuxing:"金" } → { strength:"strong", favorable:["木","水"], unfavorable:["金","土"] }；`listRules()` 返回 R1–R14；`checkConsistency()` 返回空数组。
