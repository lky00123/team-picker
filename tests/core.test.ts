import { describe, it, expect } from 'vitest'
import {
  generateTeams, toHistoryEntry,
  pureRandom, balancedTeams, historyAwareTeams,
  validateCount, splitHalf, splitWithBench, addPlayer, removePlayer, dedupeNames,
  seededShuffle,
} from '../src/core'
import type { Player } from '../src/core'

const P = (id: string, score = 5): Player => ({ id, name: id, score })

const ten = ['a','b','c','d','e','f','g','h','i','j'].map((x) => P(x))

describe('种子随机', () => {
  it('同种子同结果', () => {
    expect(seededShuffle(ten, 'ABC123')).toEqual(seededShuffle(ten, 'ABC123'))
  })
  it('异种子结果大概率不同', () => {
    const s1 = seededShuffle(ten, 'AAA').map((p) => p.id).join()
    const s2 = seededShuffle(ten, 'BBB').map((p) => p.id).join()
    expect(s1).not.toEqual(s2)
  })
})

describe('人数校验与切分', () => {
  it('人数不够报错', () => {
    expect(validateCount(7, '4v4')).toContain('人数不够')
    expect(validateCount(8, '4v4')).toBeNull()
  })
  it('标准对半', () => {
    const r = splitHalf(ten, '5v5')
    expect(r.red).toHaveLength(5)
    expect(r.blue).toHaveLength(5)
  })
  it('奇数9人 → 5v4带说明', () => {
    const r = splitHalf(ten.slice(0, 9), '5v5')
    expect(r.red).toHaveLength(5)
    expect(r.blue).toHaveLength(4)
    expect(r.note).toContain('奇数局')
  })
  it('12人打5v5 → 10上场2替补', () => {
    const twelve = [...ten, P('k'), P('l')]
    const { playing, bench } = splitWithBench(twelve, '5v5')
    expect(playing).toHaveLength(10)
    expect(bench).toHaveLength(2)
  })
})

describe('重名', () => {
  it('自动加序号', () => {
    const r = dedupeNames([P('x', 5), P('x', 6)])
    expect(r[0].name).toBe('x')
    expect(r[1].name).toBe('x2')
  })
})

describe('模式1 纯随机', () => {
  it('全员恰好分完, 5+5', () => {
    const r = pureRandom(ten, 'S1')
    const ids = new Set([...r.red, ...r.blue].map((p) => p.id))
    expect(ids.size).toBe(10)
    expect(r.red).toHaveLength(5)
  })
  it('可复现: 同种子同结果', () => {
    expect(pureRandom(ten, 'S2')).toEqual(pureRandom(ten, 'S2'))
  })
})

describe('模式2 实力均衡', () => {
  it('悬殊阵容分差≤1', () => {
    const skewed = [P('g1',10),P('g2',9),P('g3',9),P('g4',8),P('g5',8),P('w1',2),P('w2',2),P('w3',1),P('w4',1),P('w5',3)]
    for (let i = 0; i < 20; i++) {
      const r = balancedTeams(skewed, `SD${i}`)
      const d = Math.abs(sum(r.red) - sum(r.blue))
      expect(d).toBeLessThanOrEqual(1)
    }
  })
  it('全员分完', () => {
    const r = balancedTeams(ten, 'S3')
    expect([...r.red, ...r.blue]).toHaveLength(10)
  })
})

describe('模式3 历史感知', () => {
  it('上局同队对重聚数达到鸽笼下界8(5v5最优混编)', () => {
    const hist = [{ ts: 1, seed: 'X', mode: 'pure' as const, teamIds: [['a','b','c','d','e'], ['f','g','h','i','j']] as [string[], string[]] }]
    for (let i = 0; i < 10; i++) {
      const r = historyAwareTeams(ten, `H${i}`, hist)
      const lastRed = new Set(['a','b','c','d','e'])
      let reunion = 0
      for (const team of [r.red, r.blue])
        for (let x = 0; x < team.length; x++)
          for (let y = x + 1; y < team.length; y++)
            if (lastRed.has(team[x].id) === lastRed.has(team[y].id)) reunion++
      expect(reunion).toBe(8) // 理论下界: 3+2混编
    }
  })
  it('mustSplit 点名必拆: 硬约束生效', () => {
    const hist = [{ ts: 1, seed: 'X', mode: 'pure' as const, teamIds: [['a','b','c','d','e'], ['f','g','h','i','j']] as [string[], string[]] }]
    for (let i = 0; i < 20; i++) {
      const r = historyAwareTeams(ten, `H${i}`, hist, { mustSplit: [['a', 'b']] })
      expect(sameTeam(r, 'a', 'b')).toBe(false)
    }
  })
  it('无历史时退化为可用分组', () => {
    const r = historyAwareTeams(ten, 'H0', [])
    expect([...r.red, ...r.blue]).toHaveLength(10)
  })
})

describe('中途加减人', () => {
  it('+1 进人少/较弱队', () => {
    const t = { red: [P('a', 5)], blue: [P('b', 5), P('c', 5)] }
    const r = addPlayer(t, P('n', 5))
    expect(r.red.map((p) => p.id)).toContain('n')
  })
  it('-1 借人补位', () => {
    const t = { red: [P('a', 5), P('b', 5)], blue: [P('c', 5), P('d', 5), P('e', 5)] }
    const r = removePlayer(t, 'a')
    expect(r.note).toContain('借调')
    expect(r.red).toHaveLength(2)
    expect(r.blue).toHaveLength(2)
  })
})

describe('主入口', () => {
  it('generateTeams 5v5 正常', () => {
    const t = generateTeams(ten, { mode: 'balanced', size: '5v5' })
    expect(t.seed).toHaveLength(8)
    expect(t.red).toHaveLength(5)
  })
  it('人数不足抛错', () => {
    expect(() => generateTeams(ten.slice(0, 6), { mode: 'pure', size: '4v4' })).toThrow('人数不够')
  })
  it('历史条目只存ID', () => {
    const t = generateTeams(ten, { mode: 'pure', size: '5v5', seed: 'ZZZZ1234' })
    const h = toHistoryEntry(t)
    expect(h.teamIds.flat()).toHaveLength(10)
    expect(h.seed).toBe('ZZZZ1234')
  })
})

function sum(arr: Player[]) { return arr.reduce((s, p) => s + p.score, 0) }
function sameTeam(r: { red: Player[]; blue: Player[] }, a: string, b: string) {
  const team = (arr: Player[]) => arr.some((p) => p.id === a) && arr.some((p) => p.id === b)
  return team(r.red) || team(r.blue)
}
