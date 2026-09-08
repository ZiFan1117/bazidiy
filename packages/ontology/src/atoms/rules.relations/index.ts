/**
 * 五行关系与派生辅助（规则原子共享）。
 * @module @bazidiy/ontology/atoms/rules/relations
 */
import { wuxing as wuxingData } from '../../data/wuxing.ts'

export interface WuxingRelations {
  elements: readonly string[]
  generates: Record<string, string>
  restricts: Record<string, string>
}

/** 从数据构建生克关系表。 */
export function loadRelations(): WuxingRelations {
  return {
    elements: wuxingData.elements,
    generates: wuxingData.generates,
    restricts: wuxingData.restricts,
  }
}

export type RelationName = 'self' | 'generates' | 'restricts' | 'generated_by' | 'restricted_by'

function generatedBy(rel: WuxingRelations, element: string): string | undefined {
  for (const [src, tgt] of Object.entries(rel.generates)) {
    if (tgt === element) return src
  }
  return undefined
}

function restrictedBy(rel: WuxingRelations, element: string): string | undefined {
  for (const [src, tgt] of Object.entries(rel.restricts)) {
    if (tgt === element) return src
  }
  return undefined
}

/** 沿关系取后继元素。 */
export function follows(rel: WuxingRelations, name: RelationName, element: string): string | undefined {
  switch (name) {
    case 'self': return element
    case 'generates': return rel.generates[element]
    case 'restricts': return rel.restricts[element]
    case 'generated_by': return generatedBy(rel, element)
    case 'restricted_by': return restrictedBy(rel, element)
    /* v8 ignore next -- closed union */
    default: return undefined
  }
}

/** 按来源关系列收集五行（去重、保序）。 */
export function deriveElements(rel: WuxingRelations, element: string, sources: readonly RelationName[]): string[] {
  const out: string[] = []
  for (const src of sources) {
    const v = follows(rel, src, element)
    if (v !== undefined && !out.includes(v)) out.push(v)
  }
  return out
}
