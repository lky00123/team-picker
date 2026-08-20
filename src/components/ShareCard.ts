/** 分享图生成: Canvas 画红蓝对战卡 → PNG dataURL → 下载/复制 */
import type { Teams } from '../core'

export function drawShareCard(teams: Teams, maxSize: string): string {
  const W = 750, H = 560
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!

  // 底
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#16181f')
  grad.addColorStop(1, '#0c0e13')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // 标题
  ctx.textAlign = 'center'
  ctx.fillStyle = '#f5c518'
  ctx.font = 'bold 34px "Microsoft YaHei", sans-serif'
  ctx.fillText(`⚔️ 海克斯大乱斗 · ${maxSize}`, W / 2, 66)

  // 对战区
  const teamBlock = (x: number, players: string[], color: string, label: string) => {
    ctx.fillStyle = color
    ctx.font = 'bold 26px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, x, 130)
    ctx.font = '22px "Microsoft YaHei", sans-serif'
    players.forEach((n, i) => {
      ctx.fillStyle = '#e8eaed'
      ctx.fillText(n, x, 180 + i * 40)
    })
  }
  teamBlock(W * 0.26, teams.red.map((p) => p.name), '#e5484d', '🔴 红队')
  teamBlock(W * 0.74, teams.blue.map((p) => p.name), '#7c9aff', '🔵 蓝队')

  // VS
  ctx.fillStyle = '#f5c518'
  ctx.font = 'bold 44px sans-serif'
  ctx.fillText('VS', W / 2, 300)

  // 底部信息
  ctx.fillStyle = '#9aa0a6'
  ctx.font = '18px "Microsoft YaHei", sans-serif'
  const t = new Date(teams.ts)
  ctx.fillText(
    `${t.getMonth() + 1}/${t.getDate()} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')} · 种子#${teams.seed}`,
    W / 2, H - 40,
  )

  return c.toDataURL('image/png')
}

export function downloadShareCard(dataUrl: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `分组_${Date.now()}.png`
  a.click()
}
