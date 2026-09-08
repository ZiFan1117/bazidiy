-- GENERATED — BaziDIY 五行/干支/节气 实例层 schema（契约见 ../ontology.yaml + wuxing_catalog.semantic.yaml）
CREATE TABLE IF NOT EXISTS elements (
  name       TEXT PRIMARY KEY,   -- 木/火/土/金/水
  generates  TEXT NOT NULL,      -- 生：源→目标
  restricts  TEXT NOT NULL       -- 克：源→目标
);

CREATE TABLE IF NOT EXISTS stems (
  name    TEXT PRIMARY KEY,      -- 天干 甲…癸
  ord     INTEGER NOT NULL,      -- 0..9
  element TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
  name    TEXT PRIMARY KEY,      -- 地支 子…亥
  ord     INTEGER NOT NULL,      -- 0..11
  element TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS seasons (
  name  TEXT PRIMARY KEY,        -- 节气名
  month INTEGER NOT NULL,
  day   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stems_element ON stems(element);
CREATE INDEX IF NOT EXISTS idx_branches_element ON branches(element);
