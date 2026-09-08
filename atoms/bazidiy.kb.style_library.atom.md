---
id: bazidiy.kb.style_library
layer: primitive
version: 0.1.0
intent: "提供手串款式库本体：款式结构、槽位、允许变体/直径约束与隔片径映射"
when_to_use: "适用：求解引擎在给定款式下枚举组合前读取槽位与约束声明。"
language: zh-CN
tags: ["ontology","style","bracelet","slot","ossie"]
category: data
side_effects: none
lang: "ossie yaml + sqlite"
author: ZiFan1117
verified: false
implementation_ref: "bazidiy @bazidiy/ontology: kb/ossie/ontology.yaml（Style/Slot 概念）+ style_catalog.semantic.yaml + data/style_*.sql（Apache Ossie v0.2）→ tools/gen-ossie-db.mjs/gen-bindings.mjs 生成 src/kb/styleLibrary.ts"
deps: ["bazidiy.kb.bead_catalog"]
input: {"type":"object","properties":{"style_id":{"type":"string","description":"可选：款式 id，如 B-02"}}}
output: {"type":"object","properties":{"styles":{"type":"array","items":{"type":"object","properties":{"style_id":{"type":"string"},"name":{"type":"string"},"positions":{"type":"array"},"constraints":{"type":"array"}}}},"spacer_diameter_map":{"type":"object"}}}
---
## 它做什么

提供手串款式库本体：款式结构、槽位、允许变体/直径约束与隔片径映射。确定性实现：不调用 LLM、不依赖网络、可重复可测试（CPU 上“算账”）。

样式库遵循 Apache Ossie（ontology.yaml 的 Style/Slot 概念 + style_catalog.semantic.yaml）：款式/槽位/约束/隔片径拆为 SQLite 行，由 gen-bindings 还原引擎 Style[]，求解引擎按其生成解空间。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
S[kb/ossie ontology.yaml + data/style_*.sql] --> L[gen-ossie-db: SQLite 建库+自检]
L --> B[gen-bindings: 查询→src/kb/styleLibrary.ts]
Q[款式 id 查询] --> B
B --> O[款式+槽位+约束+隔片径]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class Style
class Slot
class SlotRole
class StyleLibrary { +byStyle(id) +spacerDia(bodyDia) }
Slot : +minDiameter
Slot : +maxDiameter
Style --> Slot : hasSlot
Slot --> SlotRole : hasRole
StyleLibrary --> Style
Slot : slotAllowsVariant
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant U as solve_styles
participant S as StyleLibrary
U->>S: byStyle(B-02)
S-->>U: 槽位[0主≥10,1隔片,2体6~8,-1隔片] + 约束[diameter,spacer_map]
U->>S: spacerDia(8)
S-->>U: 4
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
main --> load
byStyle --> index
spacerDia --> map
```

## 何时用

- 适用：求解引擎在给定款式下枚举组合前读取槽位与约束声明。
- 不适用：不含枚举/校验算法，不含“某组合是否可行”的执行。

## 示例

输入 { style_id: "B-02" } → 输出 4 个槽位与 2 条约束；spacer_map 6→4 / 8→4 / 10→5 / 12→6。
