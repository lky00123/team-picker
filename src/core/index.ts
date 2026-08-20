/** 分组入口 — 统一封装: 校验/去重/模式分发/结果组装 */
import type { GameSize, HistoryEntry, Mode, Player, Teams } from './types'
import { makeSeed } from './random'
import { dedupeNames, validateCount } from './assign'
import { pureRandom, balancedTeams, historyAwareTeams } from './modes'

export * from './types'
export * from './random'
export * from './assign'
export * from './modes'
export * from './winloss'

export interface GenerateOptions {
  mode: Mode
  size: GameSize
  /** 历史感知模式需要; 也可显式传入种子复现结果 */
  history?: HistoryEntry[]
  seed?: string
  /** 点名必拆对(仅历史模式生效): 硬约束两人不同队 */
  mustSplit?: [string, string][]
}

/** 分组主入口: 人数不足抛错(调用方提示), 正常返回 Teams */
export function generateTeams(players: Player[], opts: GenerateOptions): Teams {
  const pool = dedupeNames(players)
  const err = validateCount(pool.length, opts.size)
  if (err) throw new Error(err)

  const seed = opts.seed ?? makeSeed()
  let result
  switch (opts.mode) {
    case 'balanced':
      result = balancedTeams(pool, seed)
      break
    case 'history':
      result = historyAwareTeams(pool, seed, opts.history ?? [], { mustSplit: opts.mustSplit })
      break
    default:
      result = pureRandom(pool, seed)
  }
  return {
    red: result.red,
    blue: result.blue,
    note: result.note,
    seed,
    ts: Date.now(),
    mode: opts.mode,
  }
}

/** 历史 → 轻量条目(只存ID,省空间) */
export function toHistoryEntry(t: Teams): HistoryEntry {
  return {
    ts: t.ts,
    seed: t.seed,
    mode: t.mode,
    teamIds: [t.red.map((p) => p.id), t.blue.map((p) => p.id)],
  }
}
