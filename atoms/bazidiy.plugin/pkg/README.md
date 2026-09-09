# @bazidiy/ontology

BaziDIY ontology plugin: deterministic wuxing/bead/style rules exposed as model-facing dsh tools. No LLM calls inside `execute` — the rules derive 旺衰/喜用神/珠子匹配/款式方案 from data only.

## Tools

| Tool | Input | Output `type` |
|------|-------|---------------|
| `calculate_bazi` | `birth_date`, `birth_hour`, `gender` | `bazi_result` |
| `propose_designs` | `bead_ids?`, `wrist_size?`, `day_master_element`, `month_branch_wuxing` | `design_proposal` |
| `generate_design` | `style_name`, `beads`, `wrist_size?`, `summary`, `rationale` | `design_result` |
| `save_design` | `style_name`, `slots`, `wrist_size`, `summary`, `rationale` | `design_saved` |
| `load_design` | — | `design_loaded` |
| `beads_derive` | `birth_date`, `birth_hour`, `wrist_cm`, `bead_ids?`, `style_ids?` | `derive_result` |
| `beads_rules` | — | `rules_result` |

## Data

The bead/wuxing/style bindings are generated from `atoms/bazidiy.kb/kb/ossie` (Apache Ossie, schema v3, hardness removed); regenerate with `node atoms/bazidiy.kb/tools/gen-bindings.mjs`. The ontology export `atoms/bazidiy.kb/kb/beads-v2.ttl` is the OWL view of the same data.

## Model Experience

### What the model sees

Seven tool schemas. `calculate_bazi` returns `day_master_element` / `month_branch_wuxing` which the model passes straight into `propose_designs`. `propose_designs` returns `favorable` / `unfavorable` / `designs` that the model quotes verbatim. `generate_design` validates bead names are full names (no abbreviations). `save_design` persists the settled design per session id; `load_design` restores it in the same session. `beads_derive` runs the whole chain in one call and returns an R1–R14 evidence chain plus `ok:false` + `reason` for out-of-domain input; `beads_rules` lists the R1–R14 constraints before the model derives anything.

### Token effect

Schema cost per request where the tools are visible; result tokens are data-dependent.

### KV Cache effect

Prefix-stable while the tool definitions and visibility are unchanged.

## Known Limitations and Deferred Work

- `calculate_bazi` ignores `gender`; 节气 uses a simplified month boundary (same as the v8 reference).
- `generate_design` validates bead names but not that the `style_name`/`beads` sequence came from `propose_designs` — the prompt constrains this, not the tool.
- `save_design`/`load_design` key by the calling agent's session id; a design is only reachable from the session that saved it.
