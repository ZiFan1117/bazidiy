/**
 * BaziDIY ontology data — style library.
 * 款式权威源：kb/ossie（Apache Ossie：ontology.yaml + style_catalog.semantic.yaml + data/style_*.sql）。
 * 本文件只是把由 SQLite 生成的只读绑定（../kb/styleLibrary.ts）再导出；改数据请改 kb/ossie/data/style_*.sql 后跑
 * `node tools/gen-ossie-db.mjs && node tools/gen-bindings.mjs`。
 * @module @bazidiy/ontology/data/styles
 */
export { styles } from '../atoms/kb/styleLibrary.ts'
