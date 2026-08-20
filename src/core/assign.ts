/** 人数边界处理 — 奇数/溢出/加人/减人 全覆盖 */
import type { GameSize, Player, SplitResult } from './types'

export function teamSize(size: GameSize): number {
  return parseInt(size[0], 10) // '4v4'→4, '5v5'→5
}

/** 校验人数是否可开局; 返回错误信息或 null=OK */
export function validateCount(count: number, size: GameSize): string | null {
  const n = teamSize(size)
  if (count < n * 2) return `人数不够：${size} 需要 ${n * 2} 人，当前 ${count} 人`
  return null
}

/**
 * 对半切分,处理边界:
 * - 偶数: 标准对半
 * - 奇数: 人少一队标记自由人说明(多的一队打多一人,常见5v4玩法)
 */
export function splitHalf(players: Player[], size: GameSize): SplitResult {
  const n = teamSize(size)
  const mid = Math.ceil(players.length / 2)
  const red = players.slice(0, mid)
  const blue = players.slice(mid)
  let note: string | undefined
  if (players.length % 2 === 1) {
    note = `奇数局 ${red.length}v${blue.length}：${red.length > blue.length ? '红' : '蓝'}队多一人当自由人`
  }
  return { red, blue, note }
}

/** 溢出处理: 超出 2n 的人进替补席(返回上场+替补) */
export function splitWithBench(players: Player[], size: GameSize): {
  playing: Player[]
  bench: Player[]
} {
  const cap = teamSize(size) * 2
  if (players.length <= cap) return { playing: players, bench: [] }
  return { playing: players.slice(0, cap), bench: players.slice(cap) }
}

/** 中途 +1: 新人插到较弱(总分低)且人少的一队 */
export function addPlayer(teams: { red: Player[]; blue: Player[] }, p: Player): { red: Player[]; blue: Player[]; note: string } {
  const sum = (arr: Player[]) => arr.reduce((s, x) => s + x.score, 0)
  const toRed =
    teams.red.length < teams.blue.length
      ? true
      : teams.blue.length < teams.red.length
        ? false
        : sum(teams.red) <= sum(teams.blue)
  const red = toRed ? [...teams.red, p] : teams.red
  const blue = toRed ? teams.blue : [...teams.blue, p]
  return { red, blue, note: `${p.name} 加入${toRed ? '红' : '蓝'}队` }
}

/** 中途 -1: 从所在队移除; 可选从另一队借最强者补齐 */
export function removePlayer(
  teams: { red: Player[]; blue: Player[] },
  playerId: string,
  borrow = true,
): { red: Player[]; blue: Player[]; note: string } {
  const inRed = teams.red.find((p) => p.id === playerId)
  const other = inRed ? teams.blue : teams.red
  const mine = inRed ? teams.red : teams.blue
  const remain = mine.filter((p) => p.id !== playerId)
  const name = (inRed ? teams.red : teams.blue).find((p) => p.id === playerId)?.name ?? ''
  let note = `${name} 离开${inRed ? '红' : '蓝'}队`
  let newOther = [...other]

  // 人数差>1 且允许借人: 从人多的队借实力分最接近均值者
  if (borrow && newOther.length - remain.length >= 2) {
    const target = Math.round(newOther.reduce((s, x) => s + x.score, 0) / newOther.length)
    let bi = 0
    let bd = Infinity
    newOther.forEach((p, i) => {
      const d = Math.abs(p.score - target)
      if (d < bd) { bd = d; bi = i }
    })
    const [borrowed] = newOther.splice(bi, 1)
    remain.push(borrowed)
    note += `，${borrowed.name} 借调补位`
  }
  return inRed
    ? { red: remain, blue: newOther, note }
    : { red: newOther, blue: remain, note }
}

/** 重名处理: 名字后加序号 */
export function dedupeNames(players: Player[]): Player[] {
  const seen = new Map<string, number>()
  return players.map((p) => {
    const n = (seen.get(p.name) ?? 0) + 1
    seen.set(p.name, n)
    return n > 1 ? { ...p, name: `${p.name}${n}` } : p
  })
}
