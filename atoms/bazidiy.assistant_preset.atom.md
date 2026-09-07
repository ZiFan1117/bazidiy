---
id: bazidiy.assistant_preset
layer: capability
version: 0.1.0
intent: "定义“手串定制助手”角色：严格流程、硬约束与话术"
when_to_use: "适用：把确定性工具封装成可对话的定制助手；跨会话挂载。"
language: zh-CN
tags: ["preset","persona","agent","bracelet"]
category: ai
side_effects: none
lang: "yaml (dsh preset)"
author: ZiFan1117
verified: false
implementation_ref: "bazidiy @bazidiy/ontology: packages/presets/bazidiy/agent.cordis.yml"
deps: ["bazidiy.calculate_chart","bazidiy.propose_designs","bazidiy.generate_design","bazidiy.design_memory"]
input: {"type":"object","properties":{"user_message":{"type":"string"},"session_state":{"type":"object","description":"已收集的生辰/腕围等"}}}
output: {"type":"object","properties":{"reply":{"type":"string"},"tool_calls":{"type":"array","description":"依次调用的工具与参数"}}}
---
## 它做什么

定义“手串定制助手”角色：严格流程、硬约束与话术。确定性实现：不调用 LLM、不依赖网络、可重复可测试（CPU 上“算账”）。

定义“手串定制助手”角色（agent.cordis.yml persona）：缺信息先 ask_user_question → 排盘(calculate_bazi) → 提案(propose_designs) → 直接定稿出图(generate_design)；换款只重 propose 不重排盘。硬约束：禁止自算旺衰/喜忌、禁止编造珠名/缩写、禁止展示八字内部、回复≤150 字。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
A[用户对话] --> B{信息齐全?}
B -- 否 --> Q[ask_user_question 追问]
B -- 是 --> C[calculate_bazi]
C --> D[propose_designs]
D --> E[generate_design 直接出图]
E --> F[回复 ≤150 字]
换款: D2[propose_designs(限定) → generate_design]，不重排盘
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class PersonaConfig { +text: persona/流程/硬约束 }
class ToolSet
PersonaConfig ..> calculate_bazi
PersonaConfig ..> propose_designs
PersonaConfig ..> generate_design
PersonaConfig ..> ask_user_question
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant U as 用户
participant P as 助手(LLM)
participant T as 工具链
U->>P: 帮我定制手串
P->>P: 缺信息→追问
U->>P: 1990-05-15 午时 女 腕17
P->>T: calculate_bazi → propose_designs → generate_design
T-->>P: 定稿槽位
P-->>U: 说明 + 出图
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
onMessage --> ensureInfo
ensureInfo --> askUser
main --> calculateChart
main --> proposeDesigns
main --> generateDesign
onChange --> proposeDesigns
```

## 何时用

- 适用：把确定性工具封装成可对话的定制助手；跨会话挂载。
- 不适用：不是计算器本身；任何计算必须经工具。

## 示例

对话流：用户给生辰→工具排盘→喜忌→挑 B-01→出图；用户说“换红色珠子”→ propose_designs(限定) 重出方案（不重排盘）。
