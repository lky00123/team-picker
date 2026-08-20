/** 胜负记录与替补轮换 — 纯逻辑 */
import type { HistoryEntry, Player, WinStat } from './types'

/** 按历史统计每人胜率与当前连败 */
export function winStats(history: HistoryEntry[], roster: Player[]): WinStat[] {
  const acc = new Map<string, { g: number; w: number; lastWin?: boolean; streak: number }>()
  const nameOf = new Map(roster.map((p) => [p.id, p.name]))
  for (const h of history) {
    if (h.winner == null) continue
    h.teamIds.forEach((team, side) => {
      const won = h.winner === side
      for (const id of team) {
        const a = acc.get(id) ?? { g: 0, w: 0, streak: 0 }
        a.g++
        if (won) a.w++
        // 连败统计: 同结果累计, 异结果清零重计
        if (a.lastWin === undefined) a.streak = won ? 1 : -1
        else if (a.lastWin === won) a.streak += won ? 1 : -1
        else a.streak = won ? 1 : -1
        a.lastWin = won
        acc.set(id, a)
      }
    })
  }
  return [...acc.entries()]
    .map(([id, a]) => ({
      id,
      name: nameOf.get(id) ?? '?',
      games: a.g,
      wins: a.w,
      rate: a.g ? a.w / a.g : 0,
      streak: a.streak,
    }))
    .sort((x, y) => y.rate - x.rate || x.streak - y.streak)
}

/** 替补轮换: 输的队里选一人下场, 替补第一人顶上(选败方streak最深者=背锅侠轮休) */
export function rotateBench(
  red: Player[],
  blue: Player[],
  bench: Player[],
  winner: 0 | 1,
  stats: WinStat[],
): { red: Player[]; blue: Player[]; bench: Player[]; note: string } {
  if (!bench.length) return { red, blue, bench, note: '无替补可轮换' }
  const losers = winner === 0 ? blue : red
  if (!losers.length) return { red, blue, bench, note: '' }

  // 败方里连败最深(或胜率最低)的下场
  const streakOf = (id: string) => stats.find((s) => s.id === id)?.streak ?? 0
  const out = [...losers].sort((a, b) => streakOf(b.id) - streakOf(a.id))[0]
  const [inn] = bench

  const newLosers = losers.filter((p) => p.id !== out.id)
  return {
    red: winner === 0 ? red : newLosers,
    blue: winner === 0 ? newLosers : blue,
    bench: [...bench.slice(1), out],
    note: `${inn.name} 上场换下 ${out.name}（败方轮休）`,
  }
}
