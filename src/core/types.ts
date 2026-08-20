/** 核心类型定义 — 与 UI 解耦的纯逻辑层 */

export interface Player {
  /** 唯一ID(稳定,重名靠它区分) */
  id: string
  /** 显示名 */
  name: string
  /** 实力分 1-10, 默认5 */
  score: number
}

export type Mode = 'pure' | 'balanced' | 'history'

export type GameSize = '2v2' | '3v3' | '4v4' | '5v5'

/** 一局分组结果 */
export interface Teams {
  red: Player[]
  blue: Player[]
  /** 奇数局: 人少一队的自由人说明(如"蓝队4人,红队自由人") */
  note?: string
  /** 本局随机种子(可验证复现) */
  seed: string
  /** 分组时刻 */
  ts: number
  mode: Mode
}

/** 对局历史条目(轻量,只存必要信息) */
export interface HistoryEntry {
  ts: number
  seed: string
  mode: Mode
  /** [ [redIds], [blueIds] ] */
  teamIds: [string[], string[]]
  /** 胜方: 0=红 1=蓝 null=未记录/平 */
  winner?: 0 | 1 | null
}

/** 胜负统计结果 */
export interface WinStat {
  id: string
  name: string
  games: number
  wins: number
  rate: number
  streak: number // 当前连败(负数=连胜)
}

export interface SplitResult {
  red: Player[]
  blue: Player[]
  note?: string
}
