/**
 * BaziDIY ontology data — beads catalog.
 * 珠子库权威源：kb/ossie（Apache Ossie：bead.ontology.yaml + bead_catalog.semantic.yaml + data/*.sql）。
 * 本文件只是把由 SQLite 生成的只读绑定（../kb/beadCatalog.ts）再导出；改数据请改 kb/ossie/data/*.sql 后跑
 * `node tools/gen-ossie-db.mjs && node tools/gen-bindings.mjs`。
 * @module @bazidiy/ontology/data/beads
 */
export { beads } from '../kb/beadCatalog.ts'
