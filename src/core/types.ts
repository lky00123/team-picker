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
}

export interface SplitResult {
  red: Player[]
  blue: Player[]
  note?: string
}
