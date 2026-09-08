---
id: bazidiy.rules.relations
layer: primitive
version: 0.1.0
intent: "五行关系访问层：加载生克关系并沿关系取后继（共享工具箱，单一定义）"
when_to_use: "被 strength/verdict_choice/consistency 等规则原子复用的五行关系遍历；避免各自复制实现"
language: zh-CN
tags: ["rule","relations","wuxing","shared"]
category: other
side_effects: none
lang: typescript
author: ZiFan1117
verified: false
implementation_ref: "bazidiy @bazidiy/ontology: src/atoms/rules.relations/index.ts（loadRelations/follows/deriveElements）"
deps: ["bazidiy.kb"]
input: {"type":"object","properties":{"element":{"type":"string","description":"五行（木/火/土/金/水）"},"relation":{"type":"string","enum":["self","generates","restricts","generated_by","restricted_by"]}}}
output: {"type":"object","properties":{"elements":{"type":"array","items":{"type":"string"}},"generates":{"type":"object"},"restricts":{"type":"object"},"next":{"type":"string"}}}
---

## 它做什么

五行关系访问层：加载生克关系并沿关系取后继（共享工具箱，单一定义）。确定性纯函数，不调 LLM、不联网。

被 strength（旺衰）、verdict_choice（喜忌）、consistency（自检）等规则原子**复用的共享实现**；避免各自复制一份"遍历生克"逻辑。

## 怎么实现

**1) 数据流转（flowchart）**
```mermaid
flowchart LR
D[data wuxing(生克)] --> R[loadRelations]
E[element + relation 名] --> F[follows 取后继]
E2[element + 来源关系列表] --> DE[deriveElements 去重保序]
R --> F
F --> OUT[next 或 undefined]
```

**2) 模块分解（classDiagram）**
```mermaid
classDiagram
class relations {
  +loadRelations()
  +follows(rel, name, element)
  +deriveElements(rel, element, sources)
}
relations --> wuxingData
```

**3) 交互时序（sequenceDiagram）**
```mermaid
sequenceDiagram
participant R as rules.strength/verdict/consistency
participant X as rules.relations
R->>X: loadRelations()
R->>X: deriveElements(rel, 金, [restricts,generates])
X-->>R: [木,水]
```

**4) 调用图（graph）**
```mermaid
graph TD
rules.strength --> rules.relations
rules.verdict_choice --> rules.relations
rules.consistency --> rules.relations
rules.relations --> wuxingData
```

## 何时用

- 适用：需要沿生克图取后继、反向找"谁生我/谁克我"的任何规则/推理。
- 不适用：不做旺衰/喜忌判定本身（那是 strength/verdict_choice）。

## 示例

输入 { element:"金", relation:"generates" } → 输出 { next:"水" }；deriveElements(金, [restricts,generates]) → [木,水]。
