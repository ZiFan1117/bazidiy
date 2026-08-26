/**
 * BaziDIY ontology data —?the single source of truth for the deterministic rules.
 * Generated from backend/ontology/data (schema v3, hardness removed).
 * Do not hand-edit; edit the JSON source and regenerate.
 * @module @bazidiy/ontology/data
 */
/* oxlint-disable -- generated literal data, not hand-written logic */
export const wuxing = {
  "schema_version": 3,
  "elements": [
    "木",
    "火",
    "土",
    "金",
    "水"
  ],
  "generates": {
    "木": "火",
    "火": "土",
    "土": "金",
    "金": "水",
    "水": "木"
  },
  "restricts": {
    "木": "土",
    "土": "水",
    "水": "火",
    "火": "金",
    "金": "木"
  },
  "strength_rules": [
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
  "favorable_rules": [
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
  "unfavorable_rules": [
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
