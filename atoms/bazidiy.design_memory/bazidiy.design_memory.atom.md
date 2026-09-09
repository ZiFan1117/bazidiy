---
id: bazidiy.design_memory
layer: capability
version: 0.1.0
intent: "按会话保存/恢复一次最终设计方案（save/load 两方法）"
when_to_use: "适用：保存定稿后免重推理即可恢复同会话方案。"
language: zh-CN
tags: ["storage","session","design","save","load"]
category: storage
side_effects: db
lang: typescript
author: ZiFan1117
verified: true
tests: [{"input":{"save":{"style_name":"B-01","slots":[],"wrist_size":"17","summary":"s","rationale":"r"}},"expect":{"load":"B-01"}}]
implementation_ref: "bazidiy @bazidiy/ontology: atoms/bazidiy.design_memory/impl/index.ts（storage domain bazidiy_designs）"
input: {"type":"object","description":"save 方法需要 style_name/slots/wrist_size/summary/rationale；load 方法无需参数"}
output: {"type":"object","properties":{"type":{"type":"string","enum":["design_saved","design_loaded"]},"saved":{"type":"boolean"},"style_name":{"type":"string"},"slots":{"type":"array"},"count":{"type":"integer"}}}
---
## 它做什么

按会话保存/恢复一次最终设计方案（save/load 两方法）。确定性实现：不调用 LLM、不依赖网络、可重复可测试（CPU 上“算账”）。

会话级方案存取：以 sessionId 为记录键，一张 saved 表 put/get。save_design 存定稿（style/slots/wrist/summary/rationale），load_design 读回；未存过返回 saved=false。需在 agent 会话内执行（依赖 exec.agent.session）。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
save: IN[design] --> OPEN[open domain] --> PUT[table saved.put(sessionId, design)] --> CLOSE --> OUT[saved]
load: R[read] --> GET[table saved.get(sessionId)] --> CLOSE2 --> OUT2[loaded|not-found]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class DesignDomain { +open(ctx) }
DesignDomain : table(saved)
class DesignStore { +save(sessionId, design) +load(sessionId) }
DesignStore --> DesignDomain
slot schema : name/diameter/image/ratio
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant U as Agent (save_design)
participant S as DesignStore
U->>S: save(session, {style_name:B-02,…})
S->>S: put(saved) 
S-->>U: {type:design_saved, count:3}
U->>S: load(session)
S-->>U: {type:design_loaded, saved:true,…}
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
save --> openDomain
save --> put
load --> openDomain
load --> get
```

## 何时用

- 适用：保存定稿后免重推理即可恢复同会话方案。
- 不适用：无会话上下文时拒绝（需 exec.agent.session）。

## 示例

save → { type:"design_saved", style_name:"B-02", count:3 }；load → { type:"design_loaded", saved:true, slots:[…] } 或 { saved:false }。
