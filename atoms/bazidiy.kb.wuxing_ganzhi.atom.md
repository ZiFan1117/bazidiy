---
id: bazidiy.kb.wuxing_ganzhi
layer: primitive
version: 0.1.0
intent: "提供五行、天干、地支、节气的概念与个体及生克关系本体"
when_to_use: "适用：任何需要唯一引用 五行/干支/节气 术语的规则、引擎或外部系统；获取 生/克 邻接以推喜忌。"
language: zh-CN
tags: ["ontology","bazi","wuxing","ganzhi","rdf"]
category: data
side_effects: none
lang: "turtle (owl)"
author: ZiFan1117
verified: false
implementation_ref: "bazidiy @bazidiy/ontology: src/bazi.ts 词表 + src/data/wuxing.ts elements/generates/restricts；草案 kb/wuxing-ganzhi.ttl"
input: {"type":"object","properties":{"term":{"type":"string","description":"可选：术语名或 IRI，如 木 或 bzd:木；缺省返回全量词表"}}}
output: {"type":"object","properties":{"elements":{"type":"array","items":{"type":"string"}},"stems":{"type":"array","items":{"type":"string"}},"branches":{"type":"array","items":{"type":"string"}},"season_nodes":{"type":"array","items":{"type":"object"}},"generates":{"type":"object"},"restricts":{"type":"object"}}}
---
## 它做什么

提供五行、天干、地支、节气的概念与个体及生克关系本体。确定性实现：不调用 LLM、不依赖网络、可重复可测试（CPU 上“算账”）。

词库本体是全系统唯一事实源：五行/天干/地支/时节以 RDF 个体存在；生/克建模为 WuxingElement 上的对象属性（含逆关系），供旺衰/喜忌规则与排盘以 IRI 引用，杜绝字符串重复。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
S[turtle: wuxing-ganzhi.ttl] --> L[load .ttl 解析]
L --> M[materialize: IRI 索引 + 逆关系 generatedBy/restrictedBy]
Q[term 查询] --> M
M --> O[个体 + generates/restricts 子图 JSON]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class WuxingElement
class HeavenlyStem
class EarthlyBranch
class WuxingKB { +load(ttl) +buildIndex() +query(term) }
WuxingElement : +generates
WuxingElement : +restricts
HeavenlyStem ..> WuxingElement : belongsToElement
EarthlyBranch ..> WuxingElement : belongsToElement
WuxingKB --> WuxingElement : 索引到个体
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant U as 规则/引擎
participant KB as WuxingKB
U->>KB: query(term=木)
KB->>KB: 查 IRI 索引
KB-->>U: { iri: bzd:木, generates:[火], restricts:[土] }
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
main --> load
main --> materialize
query --> materialize
```

## 何时用

- 适用：任何需要唯一引用 五行/干支/节气 术语的规则、引擎或外部系统；获取 生/克 邻接以推喜忌。
- 不适用：本原子只回答“是什么/有什么关系”，不做任何判定或计算。

## 示例

输入 { term: "木" } → 输出 { iri: "bzd:木", generates: ["火"], restricts: ["土"] }；输入 {} 返回全量词表（10 天干/12 地支/12 时节 + 5 元素生克图）。
