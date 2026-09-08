/**
 * 规则一致性自检原子（bazidiy.rules.consistency）。
 * 遍历 5×5 日主×月支，断言喜忌无交集；冲突以描述串列出。
 * @module @bazidiy/ontology/atoms/rules/consistency
 */
import { wuxing as wuxingData } from '../../data/wuxing.ts'
import { loadRelations } from '../rules.relations/index.ts'
import { judgeStrength } from '../rules.strength/index.ts'
import { chooseVerdict } from '../rules.verdict_choice/index.ts'

/** 全组合自检：返回冲突列表（空 = 一致）。 */
export function checkConsistency(): string[] {
  const rel = loadRelations()
  const errors: string[] = []
  for (const dm of rel.elements) {
    for (const mb of rel.elements) {
      const { strength } = judgeStrength(dm, mb)
      const v = chooseVerdict(strength, dm)
      const overlap = v.favorable.filter((e) => v.unfavorable.includes(e))
      if (overlap.length > 0) {
        errors.push(
          `${dm}@${mb}(${strength}) 喜忌重叠: favorable=${v.favorable.join('')} unfavorable=${v.unfavorable.join('')} 交集=${overlap.join('')}`,
        )
      }
    }
  }
  return errors
}

// 引用 data 模块以维持加载顺序/树摇一致（并作类型依据）
void wuxingData
