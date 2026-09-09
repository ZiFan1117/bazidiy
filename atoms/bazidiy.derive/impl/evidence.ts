/**
 * 证据链构建器（bazidiy.derive 内部实现单元）。
 * 每步推导记录 {rule_id, input, output}，供 derive 结果逐条回放。
 * @module @bazidiy/ontology/atoms/derive/evidence
 */

/** 推导步骤里的单条证据（证据链节点）。 */
export interface EvidenceEntry {
  /** 命中的规则编号（R1–R14，见 bazidiy.rules）。 */
  rule_id: string
  /** 该步的输入摘要。 */
  input: string
  /** 该步的结论摘要。 */
  output: string
}

/** 证据链构建器：顺序追加，快照导出（内部数组不外泄）。 */
export class Evidence {
  private readonly entries: EvidenceEntry[] = []

  /**
   * 追加一条证据。
   * @param rule_id - 命中的规则编号。
   * @param input - 输入摘要。
   * @param output - 结论摘要。
   */
  add(rule_id: string, input: string, output: string): void {
    this.entries.push({ rule_id, input, output })
  }

  /**
   * 导出证据副本；调用方改动不影响内部状态。
   * @returns 按追加顺序排列的证据条目。
   */
  snapshot(): EvidenceEntry[] {
    return this.entries.map(e => ({ ...e }))
  }
}

/**
 * 便捷：把一组结论与命中的规则绑成一条证据。
 * @param ruleId - 命中的规则编号。
 * @param input - 输入摘要。
 * @param outputs - 结论列表，以顿号连接；空列表记 `(无)`。
 * @returns 单条证据条目。
 */
export function chain(ruleId: string, input: string, outputs: readonly string[]): EvidenceEntry {
  return { rule_id: ruleId, input, output: outputs.join('、') || '(无)' }
}
