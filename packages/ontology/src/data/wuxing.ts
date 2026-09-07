/**
 * BaziDIY ontology data — wuxing rule tables.
 * 五行元素/生克关系：单一事实源 = repo 根 kb/wuxing-ganzhi.ttl（经 ../kb/vocab.ts 绑定）。
 * 旺衰/喜忌判据规则（strength/favorable/unfavorable）：随规则原子独立维护（非 kb 词库层）。
 * 勿手改元素/生克；改 .ttl 后跑 `node tools/gen-kb.mjs`。
 * @module @bazidiy/ontology/data/wuxing
 */
/* oxlint-disable -- rule data literal */
import { elementOrder, generates as kbGenerates, restricts as kbRestricts } from '../kb/vocab.ts'

export const wuxing = {
  schema_version: 3,
  elements: [...elementOrder],
  generates: { ...kbGenerates },
  restricts: { ...kbRestricts },
  strength_rules: [
    {
      "id": "strong_same",
      "name": "月令同日主",
      "type": "same_as",
      "args": {
        "a": "day_master",
        "b": "month_branch"
      },
      "strength": "strong",
      "reason": "月令与日主同五行，日主得令而旺"
    },
    {
      "id": "strong_nurture",
      "name": "月令生日主",
      "type": "generates",
      "args": {
        "from": "month_branch",
        "to": "day_master"
      },
      "strength": "strong",
      "reason": "月令生扶日主，日主身旺"
    }
  ],
  favorable_rules: [
    {
      "id": "fav_strong",
      "name": "身旺喜克泄耗",
      "condition": {
        "strength": "strong"
      },
      "favorable_from": [
        "restricts",
        "generates"
      ],
      "include_self": false,
      "reason": "日主旺，喜克泄耗：财(我克)与食伤(我生)，自身比肩不算喜"
    },
    {
      "id": "fav_weak",
      "name": "身弱喜生扶",
      "condition": {
        "strength": "weak"
      },
      "favorable_from": [
        "generated_by"
      ],
      "include_self": true,
      "reason": "日主弱，喜生扶：印星(生我)与比劫(同我)"
    }
  ],
  unfavorable_rules: [
    {
      "id": "unfav_strong",
      "name": "身旺忌比劫印",
      "condition": {
        "strength": "strong"
      },
      "unfavorable_from": [
        "self",
        "generated_by"
      ],
      "reason": "日主旺，忌生扶：比劫(同我)与印星(生我)"
    },
    {
      "id": "unfav_weak",
      "name": "身弱忌官杀食伤",
      "condition": {
        "strength": "weak"
      },
      "unfavorable_from": [
        "restricted_by",
        "generates"
      ],
      "reason": "日主弱，忌克泄：官杀(克我)与食伤(我生)"
    }
  ]
} as const
