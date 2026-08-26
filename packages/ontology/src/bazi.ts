/**
 * 确定性八字排盘 — 纯日历数学（公历 → 四柱 + 五行统计）。
 * @module @bazidiy/ontology/bazi
 */

const TIAN_GAN = '甲乙丙丁戊己庚辛壬癸'
const DI_ZHI = '子丑寅卯辰巳午未申酉戌亥'
const WX_TG = '木木火火土土金金水水'
const WX_DZ = '水土木木土火火土金金土水'

/** 节气月分界（简化版）。 */
const JIE_QI: Array<[string, number, number]> = [
  ['立春', 2, 4], ['惊蛰', 3, 6], ['清明', 4, 5], ['立夏', 5, 6],
  ['芒种', 6, 6], ['小暑', 7, 7], ['立秋', 8, 7], ['白露', 9, 8],
  ['寒露', 10, 8], ['立冬', 11, 7], ['大雪', 12, 7], ['小寒', 1, 6],
]

const HOUR_DZ: Array<[number, number, number]> = [
  [23, 0, 0], [1, 2, 1], [3, 4, 2], [5, 6, 3], [7, 8, 4],
  [9, 10, 5], [11, 12, 6], [13, 14, 7], [15, 16, 8], [17, 18, 9],
  [19, 20, 10], [21, 22, 11],
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
  for (const [, m, d] of JIE_QI) {
    if (month === m && day < d) {
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
  const tgIdx = TIAN_GAN.indexOf(tgName)
  const dzIdx = DI_ZHI.indexOf(dzName)
  return [tgIdx >= 0 ? WX_TG.charAt(tgIdx) : '', dzIdx >= 0 ? WX_DZ.charAt(dzIdx) : '']
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
  const yearPillar = TIAN_GAN.charAt(yearTg) + DI_ZHI.charAt(yearDz)

  const [monthTg, monthDz] = getMonthGz(m, d, yearTg)
  const monthPillar = TIAN_GAN.charAt(monthTg) + DI_ZHI.charAt(monthDz)

  const [dayTg, dayDz] = getDayGz(dt)
  const dayPillar = TIAN_GAN.charAt(dayTg) + DI_ZHI.charAt(dayDz)

  const [hourTg] = getHourGz(hourDz, dayTg)
  const hourPillar = TIAN_GAN.charAt(hourTg) + DI_ZHI.charAt(hourDz)

  const fourPillars = `${yearPillar} ${monthPillar} ${dayPillar} ${hourPillar}`

  const dayTgName = TIAN_GAN.charAt(dayTg)
  const dayDzName = DI_ZHI.charAt(dayDz)
  const [dayTgWx] = lookupWuxing(dayTgName, dayDzName)
  const dayMasterElement = dayTgWx
  const dayMaster = `${dayTgName}${dayMasterElement}`

  const monthDzName = DI_ZHI.charAt(monthDz)
  const monthBranchWx = WX_DZ.charAt(monthDz)

  const pillars = [
    { 天干: TIAN_GAN.charAt(yearTg), 地支: DI_ZHI.charAt(yearDz), 柱: '年' },
    { 天干: TIAN_GAN.charAt(monthTg), 地支: DI_ZHI.charAt(monthDz), 柱: '月' },
    { 天干: TIAN_GAN.charAt(dayTg), 地支: DI_ZHI.charAt(dayDz), 柱: '日' },
    { 天干: TIAN_GAN.charAt(hourTg), 地支: DI_ZHI.charAt(hourDz), 柱: '时' },
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
    month_branch: monthDzName,
    month_branch_wuxing: monthBranchWx,
  }
}
