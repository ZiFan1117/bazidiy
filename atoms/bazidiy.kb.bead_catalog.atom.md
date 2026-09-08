---
id: bazidiy.kb.bead_catalog
layer: primitive
version: 0.1.0
intent: "提供手串珠子库本体：珠实例、变体、五行归属、直径、颜色与图片"
when_to_use: "适用：筛珠/求解/解析/SVG 渲染读取可用珠的唯一珠源；换库存只需换本体实例不碰代码。"
language: zh-CN
tags: ["ontology","bead","bracelet","catalog","ossie"]
category: data
side_effects: none
lang: "ossie yaml + sqlite"
author: ZiFan1117
verified: false
implementation_ref: "bazidiy @bazidiy/ontology: kb/ossie/ontology.yaml（合并篇）+ bead_catalog.semantic.yaml + data/*.sql（Apache Ossie v0.2）→ tools/gen-ossie-db.mjs/gen-bindings.mjs 生成绑定；资源 assets/beads/*.png"
deps: ["bazidiy.kb.wuxing_ganzhi"]
input: {"type":"object","properties":{"bead_id":{"type":"string","description":"可选：珠 id，如 xiaoye-zitan_round"},"wuxing":{"type":"string","description":"可选：五行筛选"}}}
output: {"type":"object","properties":{"beads":{"type":"array","items":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"wuxing":{"type":"string"},"variant":{"type":"string"},"diameters":{"type":"array","items":{"type":"integer"}},"color":{"type":"string"},"image":{"type":"string"}}}}}}
---
## 它做什么

提供手串珠子库本体：珠实例、变体、五行归属、直径、颜色与图片。确定性实现：不调用 LLM、不依赖网络、可重复可测试（CPU 上“算账”）。

珠子库本体遵循 Apache Ossie（v0.2）：概念/关系/约束在 `bead.ontology.yaml`，dataset/字段语义在 `bead_catalog.semantic.yaml`，33 个珠实例以 SQLite 行存于 `kb/ossie/data`；生成绑定供引擎只读。图片资源与实例 1:1 随原子打包。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
S[kb/ossie ontology+semantic yaml + data/*.sql] --> L[gen-ossie-db: SQLite 建库+自检]
L --> B[gen-bindings: 查询→TS 绑定]
Q[按 id 或 五行 查询] --> B
B --> O[珠实例 + 属性/五行]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class Bead
class BeadVariant
class BeadMaterial
class BeadCatalog { +byId(id) +byElement(wx) }
Bead : +diameters
Bead : +color
Bead : +image
Bead --> BeadVariant : hasVariant
Bead ..> WuxingElement : belongsToElement
Bead --> BeadMaterial : madeOf
BeadCatalog --> Bead
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant U as select_beads/parse_slots
participant C as BeadCatalog
U->>C: byElement(木)
C->>C: 过滤 belongsToElement
C-->>U: 木系珠实例列表
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
main --> load
byId --> index
byElement --> index
```

## 何时用

- 适用：筛珠/求解/解析/SVG 渲染读取可用珠的唯一珠源；换库存只需换本体实例不碰代码。
- 不适用：不含“哪些珠可用”的判断（那是 select_beads + 规则的事）。

## 示例

输入 { bead_id: "xiaoye-zitan_round" } → 输出 { name: 小叶紫檀, wuxing: 木, variant: round, diameters: [6,8,10,12], color: "#5B2333", image: "/beads/trimmed/xiaoye-zitan_round.png" }。
