---
id: bazidiy.rules.naming
layer: primitive
version: 0.1.0
intent: "定义珠子命名规则：必须全称、禁止缩写、同名变体优先非隔片"
when_to_use: "适用：解析珠序前校验与消歧，杜绝“白玉/玛瑙”等编造名与缩写。"
language: zh-CN
tags: ["rule","naming","bead","canonical"]
category: other
side_effects: none
lang: "rule-data + evaluator"
author: ZiFan1117
verified: true
tests: [{"input":{"name":"玛瑙"},"expect":{"ok":false}},{"input":{"name":"白银","diameter":10},"expect":{"variant":"round"}}]
implementation_ref: "bazidiy @bazidiy/ontology: atoms/bazidiy.rules.naming/impl/index.ts（VALID_NAMES + resolveVariant 消歧）"
deps: ["bazidiy.kb"]
input: {"type":"object","properties":{"name":{"type":"string","description":"珠子名（须全称）"},"diameter":{"type":"integer"}}}
output: {"type":"object","properties":{"ok":{"type":"boolean"},"bead_id":{"type":"string"},"variant":{"type":"string"},"reason":{"type":"string"}}}
---
## 它做什么

定义珠子命名规则：必须全称、禁止缩写、同名变体优先非隔片。确定性实现：不调用 LLM、不依赖网络、可重复可测试（CPU 上“算账”）。

命名判据保证珠子名可用性与确定性：① 名必须在珠库全称集合 VALID_NAMES（禁缩写/编造）；② 同名多变体时优先选直径匹配、非隔片(round)的变体。供珠序解析与定稿校验调用。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
IN[name, diameter] --> A{name 在全称集合?}
A -- 否 --> OUT[rejected + reason]
A -- 是 --> B[同名变体: 直径匹配优先]
B --> C[仍多则 round 优先]
C --> OUT2[canonical bead_id + variant]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class NamingRule { +isCanonical(name) +resolveVariant(name, dia) }
NamingRule --> BeadCatalog : VALID_NAMES/同名集合
NamingRule : preferNonSpacer
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant U as parse_slots
participant N as NamingRule
U->>N: isCanonical(玛瑙)
N-->>U: false(不在库)
U->>N: resolveVariant(小叶紫檀,10)
N-->>U: xiaoye-zitan_round
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
isCanonical --> catalogNames
resolveVariant --> filterByDiameter
filterByDiameter --> preferRound
```

## 何时用

- 适用：解析珠序前校验与消歧，杜绝“白玉/玛瑙”等编造名与缩写。
- 不适用：不做珠序整体解析。

## 示例

输入 { name:"小叶紫檀", diameter:10 } → { ok:true, bead_id:"xiaoye-zitan", variant:"round" }；输入 { name:"玛瑙" } → { ok:false, reason:"不在库全称集合" }。
