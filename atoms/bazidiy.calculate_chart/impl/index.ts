/**
 * 确定性八字排盘 — 纯日历数学（公历 → 四柱 + 五行统计）。
 * 天干/地支/五行/节气 = 本体单一事实源 kb/wuxing-ganzhi.ttl 的绑定（src/kb/vocab.ts）。
 * @module @bazidiy/ontology/bazi
 */

import { STEM_NAMES, BRANCH_NAMES, STEM_ELEMENT, BRANCH_ELEMENT, seasons as JIE_QI } from '../kb/vocab.ts'

/** 运算表（属本操作内部算法，非词库）：时辰→时支、年上起月、日上起时。区间为 [起, 止) 两小时。 */
const HOUR_DZ: Array<[number, number, number]> = [
  [23, 0, 0], [1, 3, 1], [3, 5, 2], [5, 7, 3], [7, 9, 4],
  [9, 11, 5], [11, 13, 6], [13, 15, 7], [15, 17, 8], [17, 19, 9],
  [19, 21, 10], [21, 23, 11],
]

const HOUR_NAMES: Record<string, number> = {
  子时: 0, 丑时: 1, 寅时: 2, 卯时: 3, 辰时: 4,
  巳时: 5, 午时: 6, 未时: 7, 申时: 8, 酉时: 9,
  戌时: 10, 亥时: 11,
}

const WU_HU_DUN = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]
const WU_SHU_DUN = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]

function getDayGz(dt: Date): [number, number] {
  const base = Date.UTC(1900, 0, 1)
  const days = Math.floor((dt.getTime() - base) / 86400000)
  return [((days % 10) + 10) % 10, ((10 + days) % 12 + 12) % 12]
}

function getMonthGz(month: number, day: number, yearG: number): [number, number] {
  let solarMonth = month
  for (const s of JIE_QI) {
    if (month === s.month && day < s.day) {
      solarMonth = month - 1
      break
    }
  }
  const lunarMonth = ((solarMonth - 2) % 12 + 12) % 12 + 1
  const dzIdx = (lunarMonth + 1) % 12
  const tgIdx = ((WU_HU_DUN[yearG] ?? 0) + dzIdx - 1) % 10
  return [tgIdx, dzIdx]
}

function getYearGz(year: number): [number, number] {
  const offset = ((year - 1984) % 60 + 60) % 60
  return [offset % 10, offset % 12]
}

function getHourGz(hourDz: number, dayTg: number): [number, number] {
  const tgIdx = ((WU_SHU_DUN[dayTg] ?? 0) + hourDz) % 10
  return [tgIdx, hourDz]
}

function resolveHourDz(hour: string): number {
  const named = HOUR_NAMES[hour]
  if (named !== undefined) return named
  const h = Number.parseInt(hour, 10)
  if (Number.isNaN(h)) return 0
  for (const [start, end, dz] of HOUR_DZ) {
    if ((start <= h && h < end) || (start === 23 && (h >= 23 || h < 1))) return dz
  }
  return 0
}

function lookupWuxing(tgName: string, dzName: string): [string, string] {
  return [STEM_ELEMENT[tgName] ?? '', BRANCH_ELEMENT[dzName] ?? '']
}

export interface BaziResult {
  type: 'bazi_result'
  four_pillars: string
  day_master: string
  day_master_element: string
  wuxing_count: Record<string, number>
  wuxing_details: Array<{
    柱: string
    天干: string
    天干五行: string
    地支: string
    地支五行: string
  }>
  month_branch: string
  month_branch_wuxing: string
}

/**
 * 公历 → 四柱八字 + 五行统计。
 * @param birthDate "1990-05-15"
 * @param birthHour 时辰名（"午时"）或 0-23 数字字符串
 * @param gender 男/女（暂不影响排盘）
 */
export function calculateBazi(birthDate: string, birthHour: string, gender: string): BaziResult {
  void gender
  const parts = birthDate.split('-').map(Number)
  const y = parts[0] ?? 0
  const m = parts[1] ?? 0
  const d = parts[2] ?? 0
  const dt = new Date(Date.UTC(y, m - 1, d))
  const hourDz = resolveHourDz(birthHour)

  const [yearTg, yearDz] = getYearGz(y)
  const yearStem = STEM_NAMES[yearTg] ?? ''
  const yearBranch = BRANCH_NAMES[yearDz] ?? ''
  const yearPillar = yearStem + yearBranch

  const [monthTg, monthDz] = getMonthGz(m, d, yearTg)
  const monthStem = STEM_NAMES[monthTg] ?? ''
  const monthBranch = BRANCH_NAMES[monthDz] ?? ''
  const monthPillar = monthStem + monthBranch

  const [dayTg, dayDz] = getDayGz(dt)
  const dayStem = STEM_NAMES[dayTg] ?? ''
  const dayBranch = BRANCH_NAMES[dayDz] ?? ''
  const dayPillar = dayStem + dayBranch

  const [hourTg] = getHourGz(hourDz, dayTg)
  const hourStem = STEM_NAMES[hourTg] ?? ''
  const hourPillar = hourStem + (BRANCH_NAMES[hourDz] ?? '')

  const fourPillars = `${yearPillar} ${monthPillar} ${dayPillar} ${hourPillar}`

  const [dayTgWx] = lookupWuxing(dayStem, dayBranch)
  const dayMasterElement = dayTgWx
  const dayMaster = `${dayStem}${dayMasterElement}`

  const monthBranchWx = BRANCH_ELEMENT[monthBranch] ?? ''

  const pillars = [
    { 天干: yearStem, 地支: yearBranch, 柱: '年' },
    { 天干: monthStem, 地支: monthBranch, 柱: '月' },
    { 天干: dayStem, 地支: dayBranch, 柱: '日' },
    { 天干: hourStem, 地支: BRANCH_NAMES[hourDz] ?? '', 柱: '时' },
  ]

  const wuxingCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
  const wuxingDetails: BaziResult['wuxing_details'] = []
  for (const p of pillars) {
    const [tgWx, dzWx] = lookupWuxing(p.天干, p.地支)
    wuxingCount[tgWx] = (wuxingCount[tgWx] ?? 0) + 1
    wuxingCount[dzWx] = (wuxingCount[dzWx] ?? 0) + 1
    wuxingDetails.push({ 柱: p.柱, 天干: p.天干, 天干五行: tgWx, 地支: p.地支, 地支五行: dzWx })
  }

  return {
    type: 'bazi_result',
    four_pillars: fourPillars,
    day_master: dayMaster,
    day_master_element: dayMasterElement,
    wuxing_count: wuxingCount,
    wuxing_details: wuxingDetails,
    month_branch: monthBranch,
    month_branch_wuxing: monthBranchWx,
  }
}
