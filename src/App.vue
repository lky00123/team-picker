<script setup lang="ts">
/**
 * 海克斯大乱斗·分队器 — 主组件
 * 数据流: roster/history ↔ 后端(FastAPI) ↔ localStorage兜底(后端不可用时)
 */
import { ref, computed, onMounted, watch } from 'vue'
import {
  generateTeams, toHistoryEntry, addPlayer, removePlayer,
  teamSize, splitWithBench, dedupeNames,
} from './core'
import type { Player, Teams, HistoryEntry, Mode, GameSize } from './core'
import ResultBoard from './components/ResultBoard.vue'
import HistoryList from './components/HistoryList.vue'
import WinStats from './components/WinStats.vue'
import { drawShareCard, downloadShareCard } from './components/ShareCard'
import { rotateBench, winStats } from './core'

// ---------- 状态 ----------
const roster = ref<Player[]>([])          // 全部名单
const selected = ref<Set<string>>(new Set()) // 勾选上场
const size = ref<GameSize>('5v5')
const mode = ref<Mode>('pure')
const scoreOn = ref(false)                // 实力分开关
const mustSplit = ref<[string, string][]>([]) // 点名必拆对
const result = ref<Teams | null>(null)
const history = ref<HistoryEntry[]>([])
const bench = ref<Player[]>([])           // 溢出替补
const newName = ref('')
const newScore = ref(5)
const pwd = ref('')                       // 后端口令
const pwdInput = ref('')
const online = ref(true)                  // 后端是否可用
const toast = ref('')

const SIZES: GameSize[] = ['2v2', '3v3', '4v4', '5v5']
const MODES: { v: Mode; label: string; desc: string }[] = [
  { v: 'pure', label: '纯随机', desc: '图一乐,手气定生死' },
  { v: 'balanced', label: '实力均衡', desc: '大神新手均匀配,有来有回' },
  { v: 'history', label: '轮换拆散', desc: '上局同队的这局优先拆开' },
]

// ---------- 派生 ----------
const chosen = computed(() => roster.value.filter((p) => selected.value.has(p.id)))
const need = computed(() => teamSize(size.value) * 2)
const canGo = computed(() => chosen.value.length >= need.value && !animating.value)

// ---------- 持久化 ----------
const API = {
  async load(): Promise<{ roster?: Player[]; history?: HistoryEntry[] } | null> {
    try {
      const r = await fetch('/api/data')
      if (!r.ok) throw new Error()
      online.value = true
      return await r.json()
    } catch {
      online.value = false
      return null
    }
  },
  async save(): Promise<boolean> {
    try {
      const r = await fetch('/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pwd: pwd.value,
          roster: roster.value,
          history: history.value.slice(-50),
        }),
      })
      online.value = r.ok
      return r.ok
    } catch {
      online.value = false
      return false
    }
  },
}

function lsLoad() {
  try {
    const raw = localStorage.getItem('team-picker')
    if (raw) {
      const d = JSON.parse(raw)
      roster.value = d.roster ?? []
      history.value = d.history ?? []
      // 恢复上次配置(规模/模式/勾选)
      if (d.size) size.value = d.size
      if (d.mode) mode.value = d.mode
      if (d.selectedIds?.length) selected.value = new Set(d.selectedIds)
    }
  } catch { /* 忽略 */ }
}
watch([roster, history, selected, size, mode], () => {
  localStorage.setItem('team-picker', JSON.stringify({
    roster: roster.value,
    history: history.value,
    size: size.value,
    mode: mode.value,
    selectedIds: [...selected.value],
  }))
}, { deep: true })

onMounted(async () => {
  lsLoad() // 先本地,秒开
  const remote = await API.load()
  if (remote && (remote.roster?.length || remote.history?.length)) {
    roster.value = remote.roster ?? []
    history.value = remote.history ?? []
  }
  say(online.value ? '云端同步 ✓' : '本地模式(后端未连)')
})

function say(msg: string) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 2000)
}

// ---------- 名单管理 ----------
function addManually() {
  const name = newName.value.trim()
  if (!name) return
  const p: Player = { id: uid(), name, score: scoreOn.value ? clamp(newScore.value) : 5 }
  roster.value.push(p)
  selected.value.add(p.id)
  newName.value = ''
}
function importNames() {
  const text = prompt('粘贴名单,每行一个名字(可选"名字,分数"):')
  if (!text) return
  let n = 0
  for (const line of text.split(/[\n,，]+/).map((s) => s.trim()).filter(Boolean)) {
    const m = line.match(/^(.+?)[\s,，]+([1-9]|10)$/)
    const p: Player = { id: uid(), name: m ? m[1] : line, score: m ? parseInt(m[2]) : 5 }
    roster.value.push(p)
    selected.value.add(p.id)
    n++
  }
  say(`导入 ${n} 人`)
}
function removeMan(id: string) {
  roster.value = roster.value.filter((p) => p.id !== id)
  selected.value.delete(id)
  mustSplit.value = mustSplit.value.filter(([a, b]) => a !== id && b !== id)
}
function toggleSel(id: string) {
  const s = selected.value
  if (s.has(id)) s.delete(id); else s.add(id)
  selected.value = new Set(s) // 触发响应
}
function setScore(id: string, v: number) {
  const p = roster.value.find((x) => x.id === id)
  if (p) p.score = clamp(v)
}
function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}
function clamp(v: number) { return Math.max(1, Math.min(10, Math.round(v) || 5)) }

// ---------- 必拆对 ----------
const splitPickA = ref('')
const splitPickB = ref('')
function addMustSplit() {
  const a = splitPickA.value, b = splitPickB.value
  if (!a || !b || a === b) { say('选两个不同的人'); return }
  mustSplit.value.push([a, b])
  splitPickA.value = splitPickB.value = ''
}
function delMustSplit(i: number) { mustSplit.value.splice(i, 1) }

// ---------- 分组 ----------
const animating = ref(false)
function go() {
  if (!canGo.value) return
  const players = dedupeNames(chosen.value)
  const { playing, bench: b } = splitWithBench(players, size.value)
  bench.value = b
  try {
    const teams = generateTeams(playing, {
      mode: mode.value,
      size: size.value,
      history: history.value,
      ...(mode.value === 'history' && mustSplit.value.length
        ? { mustSplit: mustSplit.value }
        : {}),
    })
    result.value = teams
    history.value.push(toHistoryEntry(teams))
    API.save()
    animating.value = true
    setTimeout(() => (animating.value = false), 2200)
  } catch (e) {
    say((e as Error).message)
  }
}

// ---------- 中途加减人 ----------
function joinOne(id: string) {
  if (!result.value) return
  const p = roster.value.find((x) => x.id === id)
  if (!p) return
  const r = addPlayer({ red: result.value.red, blue: result.value.blue }, p)
  result.value = { ...result.value, red: r.red, blue: r.blue, note: r.note }
  selected.value.add(id)
}
function leaveOne(id: string) {
  if (!result.value) return
  const r = removePlayer({ red: result.value.red, blue: result.value.blue }, id)
  result.value = { ...result.value, red: r.red, blue: r.blue, note: r.note }
  selected.value.delete(id)
}
function benchIn(p: Player) { joinOne(p.id) }

// ---------- 结果微调 ----------
function swapPlayer(id: string) {
  if (!result.value) return
  const { red, blue } = result.value
  const inRed = red.some((x) => x.id === id)
  const mover = (inRed ? red : blue).find((x) => x.id === id)!
  const newRed = inRed ? red.filter((x) => x.id !== id) : [...red, mover]
  const newBlue = inRed ? [...blue, mover] : blue.filter((x) => x.id !== id)
  result.value = { ...result.value, red: newRed, blue: newBlue, note: '已手动调整(种子失效)' }
}

// ---------- 胜负标记 + 替补轮换 ----------
function markWin(side: 0 | 1) {
  if (!result.value || !history.value.length) return
  history.value[history.value.length - 1].winner = side
  result.value = { ...result.value, note: side === 0 ? '🏆 红队胜' : '🏆 蓝队胜' }
  API.save()
  say(side === 0 ? '已记录: 红队胜' : '已记录: 蓝队胜')
}

function doRotateBench() {
  if (!result.value) return
  const last = history.value[history.value.length - 1]
  if (last?.winner == null) { say('先标记胜负再轮换'); return }
  const stats = winStats(history.value, roster.value)
  const r = rotateBench(result.value.red, result.value.blue, bench.value, last.winner, stats)
  result.value = { ...result.value, red: r.red, blue: r.blue, note: r.note }
  bench.value = r.bench
  say(r.note)
}

// ---------- 分享 ----------
function share() {
  if (!result.value) return
  downloadShareCard(drawShareCard(result.value, size.value))
  say('已生成分享图(查看下载)')
}

// ---------- 清理 ----------
function clearHistory() {
  if (confirm('清空全部对局历史(含胜负)?')) { history.value = []; API.save() }
}
</script>

<template>
  <h1 style="text-align:center; font-size:22px; padding:10px 0 4px">
    ⚔️ 海克斯大乱斗 · 分队器
  </h1>
  <p style="text-align:center; color:var(--text-dim); font-size:12px; margin-bottom:14px">
    {{ online ? '☁️ 云端同步' : '📴 本地模式' }} · 已选 {{ chosen.length }}/{{ need }} 人
  </p>

  <!-- 规模 -->
  <div class="card" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
    <span style="color:var(--text-dim); font-size:14px">规模</span>
    <button v-for="s in SIZES" :key="s" class="btn-ghost"
      :style="size===s ? 'background:var(--accent);color:#1a1d24;font-weight:700' : ''"
      @click="size=s">{{ s }}</button>
    <label style="margin-left:auto; font-size:13px; color:var(--text-dim); display:flex; align-items:center; gap:4px">
      <input type="checkbox" v-model="scoreOn" /> 💪实力分
    </label>
  </div>

  <!-- 名单池 -->
  <div class="card">
    <div style="display:flex; gap:8px; margin-bottom:10px">
      <input v-model="newName" placeholder="名字" style="flex:1" @keyup.enter="addManually" />
      <input v-if="scoreOn" v-model.number="newScore" type="number" min="1" max="10" style="width:64px" />
      <button class="btn-ghost" @click="addManually">＋</button>
      <button class="btn-ghost" @click="importNames">📋 粘贴</button>
    </div>
    <div v-if="!roster.length" style="color:var(--text-dim); font-size:13px; text-align:center; padding:16px 0">
      还没有名单，添加或粘贴一批 👆
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:8px">
      <div v-for="p in roster" :key="p.id"
        :style="{
          padding: '6px 10px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
          background: selected.has(p.id) ? 'var(--accent)' : 'var(--card-2)',
          color: selected.has(p.id) ? '#1a1d24' : 'var(--text)',
          display:'flex', gap:6, alignItems:'center',
        }"
        @click="toggleSel(p.id)">
        <span>{{ p.name }}</span>
        <input v-if="scoreOn" type="number" min="1" max="10" :value="p.score"
          style="width:44px; padding:2px 4px; font-size:12px"
          @click.stop @change="setScore(p.id, +(($event.target as HTMLInputElement).value))" />
        <span @click.stop="removeMan(p.id)" style="opacity:.6; font-size:11px">✕</span>
      </div>
    </div>
  </div>

  <!-- 模式 -->
  <div class="card">
    <div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap">
      <button v-for="m in MODES" :key="m.v" class="btn-ghost"
        :style="mode===m.v ? 'background:var(--accent);color:#1a1d24;font-weight:700':''"
        @click="mode=m.v">{{ m.label }}</button>
    </div>
    <p style="color:var(--text-dim); font-size:12px">{{ MODES.find(m=>m.v===mode)!.desc }}</p>

    <!-- 必拆对(轮换模式) -->
    <div v-if="mode==='history'" style="margin-top:10px; border-top:1px solid #2a2e37; padding-top:10px">
      <p style="font-size:12px; color:var(--text-dim); margin-bottom:6px">点名必拆(可选): 指定两人永不同队</p>
      <div style="display:flex; gap:6px; flex-wrap:wrap">
        <select v-model="splitPickA" style="flex:1; min-width:100px"><option value="">选人A</option>
          <option v-for="p in chosen" :key="p.id" :value="p.id">{{ p.name }}</option></select>
        <select v-model="splitPickB" style="flex:1; min-width:100px"><option value="">选人B</option>
          <option v-for="p in chosen" :key="p.id" :value="p.id">{{ p.name }}</option></select>
        <button class="btn-ghost" @click="addMustSplit">锁拆</button>
      </div>
      <div v-for="(pair, i) in mustSplit" :key="i" style="font-size:12px; color:var(--red); margin-top:4px">
        {{ roster.find(p=>p.id===pair[0])?.name }} ⇄ {{ roster.find(p=>p.id===pair[1])?.name }}
        <button class="btn-danger" @click="delMustSplit(i)">删</button>
      </div>
    </div>
  </div>

  <!-- 开分 -->
  <button class="btn-primary" :disabled="!canGo" @click="go">
    {{ chosen.length < need ? `还差 ${need - chosen.length} 人` : '⚡ 开始分组' }}
  </button>
  <p v-if="toast" style="text-align:center; color:var(--accent); font-size:13px; margin-top:8px">{{ toast }}</p>

  <!-- 替补 -->
  <div v-if="bench.length" class="card" style="margin-top:14px; border:1px dashed #3a3f4a">
    <p style="font-size:13px; color:var(--text-dim)">替补席({{ bench.length }}) — 点击临时上场:</p>
    <button v-for="p in bench" :key="p.id" class="btn-ghost" style="margin:4px 6px 0 0" @click="benchIn(p)">{{ p.name }} 上</button>
  </div>

  <!-- 结果 -->
  <ResultBoard v-if="result" :result="result" :animating="animating" :score-on="scoreOn"
    @swap="swapPlayer" @join="joinOne" @leave="leaveOne" />

  <!-- 胜负 + 轮换 + 分享 (有结果时显示) -->
  <div v-if="result" class="card" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:-6px">
    <button class="btn-ghost" style="flex:1; border:1px solid rgba(229,72,77,.5)" @click="markWin(0)">🔴 红胜</button>
    <button class="btn-ghost" style="flex:1; border:1px solid rgba(62,99,221,.5)" @click="markWin(1)">🔵 蓝胜</button>
    <button v-if="bench.length" class="btn-ghost" style="flex:1" @click="doRotateBench">🔄 替补轮换</button>
    <button class="btn-ghost" style="flex:1; border:1px solid rgba(245,197,24,.5)" @click="share">📤 分享图</button>
  </div>

  <!-- 胜率榜 -->
  <WinStats :history="history" :roster="roster" />

  <!-- 历史 -->
  <HistoryList :history="history" :roster="roster" @clear="clearHistory" />

  <!-- 口令(后端部署时用) -->
  <details class="card" style="margin-top:8px">
    <summary style="color:var(--text-dim); font-size:12px; cursor:pointer">⚙️ 同步口令(自部署时设置)</summary>
    <div style="display:flex; gap:8px; margin-top:8px">
      <input v-model="pwdInput" type="password" placeholder="编辑口令(留空=无)" style="flex:1" />
      <button class="btn-ghost" @click="pwd = pwdInput; API.save(); say('口令已存')">保存</button>
    </div>
  </details>
</template>
