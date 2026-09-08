---
id: bazidiy.rules.consistency
layer: primitive
version: 0.1.0
intent: "自检全部旺衰×喜忌组合不存在喜忌交集冲突"
when_to_use: "适用：改喜忌/旺衰规则数据后回归；服务启动自检。"
language: zh-CN
tags: ["rule","consistency","invariant"]
category: other
side_effects: none
lang: "rule-data + evaluator"
author: ZiFan1117
verified: true
implementation_ref: "bazidiy @bazidiy/ontology: src/atoms/rules/consistency.ts（组合 strength+verdictChoice 全组合自检）"
deps: ["bazidiy.rules.verdict_choice","bazidiy.rules.relations"]
input: {"type":"object","properties":{"verbose":{"type":"boolean","description":"是否输出全部组合结果"}}}
output: {"type":"object","properties":{"conflicts":{"type":"array","items":{"type":"string"}}}}
tests: [{"input":{},"expect":{"conflicts":[]}}]
---
## 它做什么

自检全部旺衰×喜忌组合不存在喜忌交集冲突。确定性实现：不调用 LLM、不依赖网络、可重复可测试（CPU 上“算账”）。

一致性自检：遍历 5 日主 × 5 月支 全部组合跑旺衰+喜忌，断言 favorable 与 unfavorable 无交集；冲突以字符串列出。供规则数据变更后的回归与 dsh invariant 启动自检。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
ALL[5x5 日主×月支 组合] --> R[infer strength + verdict]
R --> C{favorable ∩ unfavorable = ∅?}
C -- 有交集 --> O[conflicts: 描述]
C -- 空 --> OK[consistent]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class ConsistencyCheck { +run(): string[] }
ConsistencyCheck --> inferWuxing
ConsistencyCheck : overlap(fav, unfav)
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant U as CI/invariant
participant C as ConsistencyCheck
U->>C: run()
C->>C: 25 组合逐判
C-->>U: [] (或冲突列表)
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
run --> loopCombos
loopCombos --> inferWuxing
loopCombos --> overlapCheck
```

## 何时用

- 适用：改喜忌/旺衰规则数据后回归；服务启动自检。
- 不适用：运行时单次推理。

## 示例

输入 {} → 输出 { conflicts: [] }（当前规则数据一致）。
