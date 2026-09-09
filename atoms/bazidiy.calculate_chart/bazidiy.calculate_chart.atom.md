---
id: bazidiy.calculate_chart
layer: capability
version: 0.1.0
intent: "把公历生辰与时辰排成四柱八字并统计五行"
when_to_use: "适用：模型拿到生辰后由确定性工具排盘，禁止 LLM 自行推算干支。"
language: zh-CN
tags: ["bazi","chart","pillars","deterministic"]
category: other
side_effects: none
lang: typescript
author: ZiFan1117
verified: true
implementation_ref: "bazidiy @bazidiy/ontology: atoms/bazidiy.calculate_chart/impl/index.ts（calculateBazi）+ atoms/bazidiy.plugin/impl/tools/calculate-bazi.ts（工具壳）"
deps: ["bazidiy.kb"]
input: {"type":"object","required":["birth_date","birth_hour","gender"],"properties":{"birth_date":{"type":"string","description":"公历生日 YYYY-MM-DD"},"birth_hour":{"type":"string","description":"时辰名如 午时，或 0-23 数字字符串"},"gender":{"type":"string","enum":["男","女"]}}}
output: {"type":"object","required":["type","four_pillars","day_master","day_master_element","wuxing_count","wuxing_details","month_branch","month_branch_wuxing"],"properties":{"type":{"type":"string","const":"bazi_result"},"four_pillars":{"type":"string"},"day_master":{"type":"string"},"day_master_element":{"type":"string"},"wuxing_count":{"type":"object"},"wuxing_details":{"type":"array"},"month_branch":{"type":"string"},"month_branch_wuxing":{"type":"string"}}}
tests: [{"input":{"birth_date":"1990-05-15","birth_hour":"午时","gender":"女"},"expect":{"type":"bazi_result"}}]
---
## 它做什么

把公历生辰与时辰排成四柱八字并统计五行。确定性实现：不调用 LLM、不依赖网络、可重复可测试（CPU 上“算账”）。

把公历生日+时辰排成四柱并统计五行。内部先 resolveHourDz 把时辰名/数字映射到时支；再分 年柱(getYearGz)、月柱(getMonthGz，按节气表分月)、日柱(getDayGz，UTC 天数基准)、时柱(getHourGz) 得到天干地支，最后累计五行计数与明细。gender 暂不影响排盘。

## 怎么实现

**1) 数据流转（flowchart：一份数据从输入到输出怎么走）**
```mermaid
flowchart LR
IN[birth_date, birth_hour, gender] --> A[resolveHourDz 时辰→时支]
A --> Y[getYearGz]
A --> M[getMonthGz + 节气分界]
A --> D[getDayGz]
A --> H[getHourGz 五鼠遁]
Y & M & D & H --> P[四柱拼接 + 五行统计]
P --> OUT[bazi_result]
```

**2) 模块分解（classDiagram：代码/类怎么划分与归属）**
```mermaid
classDiagram
class ChartCalculator { +calculateBazi(date,hour,gender) }
ChartCalculator : resolveHourDz()
ChartCalculator : getYearGz()
ChartCalculator : getMonthGz()
ChartCalculator : getDayGz()
ChartCalculator : getHourGz()
ChartCalculator --> WuxingGanzhiKB : 词表/节气/五行 IRI
```

**3) 交互时序（sequenceDiagram：调用方与本原子/下游怎么协作）**
```mermaid
sequenceDiagram
participant U as Agent (calculate_bazi 工具)
participant C as ChartCalculator
U->>C: birth_date=1990-05-15, birth_hour=午时
C->>C: 排年月日时柱
C-->>U: bazi_result(four_pillars, day_master, wuxing_count…)
```

**4) 调用图（graph：本原子及其 import 的下游组合关系）**
```mermaid
graph TD
calculateBazi --> resolveHourDz
calculateBazi --> getYearGz
calculateBazi --> getMonthGz
calculateBazi --> getDayGz
calculateBazi --> getHourGz
getMonthGz --> seasonNodes
```

## 何时用

- 适用：模型拿到生辰后由确定性工具排盘，禁止 LLM 自行推算干支。
- 不适用：不推喜忌、不配珠、不做最终方案。

## 示例

输入 { birth_date:"1990-05-15", birth_hour:"午时", gender:"女" } → { type:"bazi_result", four_pillars:"…", day_master:"庚金", day_master_element:"金", month_branch_wuxing:"金", wuxing_count:{…} }。
