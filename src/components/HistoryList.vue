<script setup lang="ts">
/** 历史列表: 最近对局回顾 */
import { computed } from 'vue'
import type { HistoryEntry, Player } from '../core'

const props = defineProps<{ history: HistoryEntry[]; roster: Player[] }>()
defineEmits<{ (e: 'clear'): void }>()

const recent = computed(() => [...props.history].reverse().slice(0, 10))
const nameOf = (id: string) => props.roster.find((p) => p.id === id)?.name ?? '?'
const time = (ts: number) =>
  new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <details v-if="history.length" class="card" style="margin-top:14px">
    <summary style="cursor:pointer; font-size:14px">
      📜 对局历史 ({{ history.length }})
      <button class="btn-danger" style="float:right" @click="$emit('clear')">清空</button>
    </summary>
    <div v-for="(h, i) in recent" :key="h.ts"
      style="padding:8px 0; border-bottom:1px solid #2a2e37; font-size:12px">
      <span style="color:var(--text-dim)">{{ i === 0 ? '⏱ ' : '' }}{{ time(h.ts) }}</span>
      <span style="color:var(--text-dim)"> #{{ h.seed }}</span>
      <div style="margin-top:4px">
        <span style="color:var(--red)">🔴{{ h.teamIds[0].map(nameOf).join(' ') }}</span>
        <span style="color:var(--text-dim)"> vs </span>
        <span style="color:#7c9aff">🔵{{ h.teamIds[1].map(nameOf).join(' ') }}</span>
      </div>
    </div>
  </details>
</template>
