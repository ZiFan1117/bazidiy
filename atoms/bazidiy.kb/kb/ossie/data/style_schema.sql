-- GENERATED — BaziDIY 款式/槽位/约束/隔片径 实例层 schema（契约见 ../ontology.yaml + style_catalog.semantic.yaml）
CREATE TABLE IF NOT EXISTS styles (
  id   TEXT PRIMARY KEY,          -- 款式编号 B-01…
  name TEXT NOT NULL              -- 款式名
);

CREATE TABLE IF NOT EXISTS slots (
  style_id      TEXT NOT NULL REFERENCES styles(id),
  slot          INTEGER NOT NULL,       -- 槽位号（可负）
  role          TEXT NOT NULL,          -- main/body/spacer/wuxing
  min_dia       INTEGER,                -- 最小直径 mm（可空）
  max_dia       INTEGER,                -- 最大直径 mm（可空）
  allowed_variants TEXT NOT NULL,       -- JSON 数组，如 ["round","buddha"]
  PRIMARY KEY (style_id, slot)
);

CREATE TABLE IF NOT EXISTS style_constraints (
  style_id  TEXT NOT NULL REFERENCES styles(id),
  name      TEXT NOT NULL,
  type      TEXT NOT NULL,              -- diameter/spacer_map/same_bead…
  variables TEXT NOT NULL,              -- JSON 数组，如 ["v0","v2","v1"]
  params    TEXT,                       -- JSON 对象（可空）
  reason    TEXT,
  PRIMARY KEY (style_id, name)
);

CREATE TABLE IF NOT EXISTS spacer_map (
  body    INTEGER PRIMARY KEY,          -- 体珠直径 mm
  spacer  INTEGER NOT NULL              -- 对应隔片直径 mm
);
