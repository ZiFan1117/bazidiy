---
id: bazidiy.kb
layer: primitive
version: 0.2.0
intent: "BaziDIY 领域本体与数据：五行/干支/节气 + 珠料×变体=珠 + 款式槽位（Apache Ossie 合并篇）"
when_to_use: "全领域概念/关系/约束与实例数据唯一源（ontology.yaml + semantic 契约 + SQLite）；其它原子经绑定/契约引用"
language: zh-CN
tags: ["ontology","kb","wuxing","bead","style","ossie"]
category: data
side_effects: none
lang: "ossie yaml + sqlite"
author: ZiFan1117
verified: false
implementation_ref: "bazidiy @bazidiy/ontology: kb/ossie/ontology.yaml（合并篇）+ {bead,wuxing,style}_catalog.semantic.yaml + data/*.sql（Apache Ossie v0.2）→ tools/gen-ossie-db.mjs/gen-bindings.mjs 生成绑定；资源 assets/beads/*.png"
deps: []
input: {"type":"object","properties":{"domain":{"type":"string","enum":["wuxing","bead","style"]},"term":{"type":"string","description":"可选：概念/术语查询"}}}
output: {"type":"object","properties":{"ontology":{"type":"object"},"datasets":{"type":"array"},"bindings":{"type":"object"}}}
---

## 它做什么

BaziDIY 领域本体与数据唯一源（3 合 1）：五行/干支/节气、珠料×变体=珠实例、款式槽位，以及生克关系与值类型约束。确定性纯数据/绑定，不调 LLM、不联网。

按 Apache Ossie（v0.2）组织：概念/关系/requires 在合并篇 `ontology.yaml`；实例分域落 SQLite（`data/*.sql`）；生成只读绑定供其它原子引用。

## 怎么实现

**1) 数据流转（flowchart）**
```mermaid
flowchart LR
O[ontology.yaml 合并篇] --> DB[gen-ossie-db: SQLite 建库+自检]
C[bead/wuxing/style semantic 契约] --> DB
DB --> B[gen-bindings: TS 绑定 + ttl 导出]
Q[按领域/术语查询] --> B
B --> OUT[概念/关系/实例]
```

**2) 模块分解（classDiagram）**
```mermaid
classDiagram
class kb {
  +ontology.yaml
  +bead_catalog.semantic.yaml
  +wuxing_catalog.semantic.yaml
  +style_catalog.semantic.yaml
  +data/*.sql
}
class Bindings
kb --> Bindings
```

**3) 交互时序（sequenceDiagram）**
```mermaid
sequenceDiagram
participant A as 其它原子/引擎
participant K as bazidiy.kb
A->>K: 查词表/珠子/款式
K->>K: gen 绑定只读
K-->>A: 数据/契约
```

**4) 调用图（graph）**
```mermaid
graph TD
rules.* --> bazidiy.kb
calculate_chart --> bazidiy.kb
infer_verdict --> bazidiy.kb
solve_styles --> bazidiy.kb
```

## 何时用

- 适用：全领域概念/实例/契约的权威来源；构建其它原子与对外数据接口。
- 不适用：不做判据/求解（那是 rules.* 与能力原子）。

## 示例

输入 { domain:"bead", term:"nanhong_round" } → 输出该珠实例（材料/变体/五行/直径/图）；输入 { domain:"wuxing", term:"金" } → 生=水、克=木。
