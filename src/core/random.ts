/** 可复现的种子随机 — mulberry32 + 种子生成 */

/** 8位hex种子 */
export function makeSeed(): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0].toString(16).padStart(8, '0').toUpperCase()
}

/** 字符串种子 → 32位整数(hash) */
export function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 PRNG: 同种子同序列 */
export function mulberry32(seedNum: number): () => number {
  let a = seedNum >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 用种子初始化的 Fisher-Yates 洗牌 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rng = mulberry32(hashSeed(seed))
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
