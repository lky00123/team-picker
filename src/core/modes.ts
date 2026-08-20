/** 三种分组模式实现 */
import type { HistoryEntry, Player, SplitResult } from './types'
import { seededShuffle, mulberry32, hashSeed } from './random'
import { splitHalf } from './assign'

/** 模式1: 纯随机 — 洗牌对半 */
export function pureRandom(players: Player[], seed: string): SplitResult {
  return splitHalf(seededShuffle(players, seed), '4v4') // size仅影响note,对半切分与size无关
}

/** 模式2: 实力均衡 — 蛇形发牌 + 分差超阈值时暴力搜最优交换 */
export function balancedTeams(players: Player[], seed: string, threshold = 1.5): SplitResult {
  // 先洗牌再排序: 同分的人顺序也随机,避免总是同样搭配
  const shuffled = seededShuffle(players, seed)
  const sorted = [...shuffled].sort((a, b) => b.score - a.score)

  // 蛇形: 强弱交错发牌
  const t1: Player[] = []
  const t2: Player[] = []
  sorted.forEach((p, i) => {
    const turn = Math.floor(i / 2) % 2 === 0
    // 偶数排i%4<2进t1... 标准蛇形: 排序后 1,4,5,8 / 2,3,6,7
    if (i % 4 === 0 || i % 4 === 3) t1.push(p)
    else t2.push(p)
  })

  const sum = (arr: Player[]) => arr.reduce((s, x) => s + x.score, 0)
  let diff = Math.abs(sum(t1) - sum(t2))
  let best = { red: t1, blue: t2 }

  if (diff > threshold && players.length <= 12) {
    // 暴力: 尝试所有一对一交换,取分差最小(人数≤12最多36对交换,瞬间完成)
    let bestDiff = diff
    for (let i = 0; i < best.red.length; i++) {
      for (let j = 0; j < best.blue.length; j++) {
        const r = [...best.red]
        const b = [...best.blue]
        ;[r[i], b[j]] = [b[j], r[i]]
        const d = Math.abs(sum(r) - sum(b))
        if (d < bestDiff) {
          bestDiff = d
          best = { red: r, blue: b }
        }
      }
    }
    diff = bestDiff
  }

  return { ...best, note: diff <= threshold ? `两队实力差 ${diff.toFixed(1)} 分` : undefined }
}

/**
 * 模式3: 历史感知 — 蒙特卡洛采样,代价函数综合:
 *   同队历史罚: 每对人过去 N 局里同队累计 streak 次数, 罚 6*streak
 *     (连续同队越多越要拆; 鸽笼决定了单局必有前队友重聚, 但"总是那俩"会被压制)
 *   实力失衡 → 罚 1/分
 * 采样3000次取代价最低; cost=0 提前收工
 */
export function historyAwareTeams(
  players: Player[],
  seed: string,
  history: HistoryEntry[],
  opts: {
    samples?: number
    sameTeamPenalty?: number
    balancePenalty?: number
    /** 点名必拆的对 [idA, idB][]: 硬约束,两人必不同队 */
    mustSplit?: [string, string][]
  } = {},
): SplitResult {
  const { samples = 3000, sameTeamPenalty = 6, balancePenalty = 1, mustSplit = [] } = opts
  const mustSplitSet = new Set(mustSplit.map(([a, b]) => pairKey(a, b)))
  // 每对人的累计同队次数(最近5局)
  const recent = history.slice(-5)
  const samePairCount = new Map<string, number>()
  for (const h of recent) {
    for (const ids of h.teamIds) {
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const k = pairKey(ids[i], ids[j])
          samePairCount.set(k, (samePairCount.get(k) ?? 0) + 1)
        }
    }
  }
  // 上局同队的对(单独集合, 用于重聚数判据)
  const lastPair = new Set<string>()
  if (recent.length > 0) {
    for (const ids of recent[recent.length - 1].teamIds)
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++)
          lastPair.add(pairKey(ids[i], ids[j]))
  }
  const sum = (arr: Player[]) => arr.reduce((s, x) => s + x.score, 0)

  const rng = mulberry32(hashSeed(seed))
  let best: SplitResult | null = null
  let bestCost = Infinity
  let bestReunion = Infinity
  /** 最近一局是第几条历史(用于识别"上一局同队") */

  for (let s = 0; s < samples; s++) {
    // 用独立RNG洗牌(不污染外部种子序列)
    const arr = [...players]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    const mid = Math.ceil(arr.length / 2)
    const red = arr.slice(0, mid)
    const blue = arr.slice(mid)

    let cost = 0
    let lastReunion = 0 // 上局同队对的重聚数(第一优先级: 越少越好)
    let violated = false // 点名必拆约束
    for (const team of [red, blue])
      for (let i = 0; i < team.length; i++)
        for (let j = i + 1; j < team.length; j++) {
          const key = pairKey(team[i].id, team[j].id)
          if (mustSplitSet.has(key)) { violated = true; continue }
          const c = samePairCount.get(key) ?? 0
          if (c > 0) cost += sameTeamPenalty * c * c // 1次罚6, 连2次罚24, 连3局罚54
          if (lastPair.has(key)) lastReunion++
        }
    if (violated) continue // 违反硬约束的采样直接丢弃
    // 失衡罚
    cost += Math.abs(sum(red) - sum(blue)) * balancePenalty

    // 三级字典序: ①上局重聚对数最少 ②总罚最少 ③(隐含)分差小
    // ①是用户体验核心: "上局一起打的这局先拆开", 鸽笼拆不完也拆最多的
    const better =
      lastReunion < bestReunion ||
      (lastReunion === bestReunion && cost < bestCost)
    if (better) {
      bestCost = cost
      bestReunion = lastReunion
      best = { red, blue }
      if (lastReunion === 0 && cost === 0) break
    }
  }
  return best ?? pureRandom(players, seed)
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}
