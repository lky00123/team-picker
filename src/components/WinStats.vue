<script setup lang="ts">
/** 胜率面板: 每人场次/胜率/连败徽章 */
import { computed } from 'vue'
import { winStats } from '../core'
import type { HistoryEntry, Player } from '../core'

const props = defineProps<{ history: HistoryEntry[]; roster: Player[] }>()
const stats = computed(() => winStats(props.history, props.roster).filter((s) => s.games > 0))
</script>

<template>
  <details v-if="stats.length" class="card" style="margin-top:14px">
    <summary style="cursor:pointer; font-size:14px">🏆 胜率榜</summary>
    <div style="margin-top:10px">
      <div v-for="s in stats" :key="s.id"
        style="display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.05); font-size:13px">
        <span style="flex:1">{{ s.name }}</span>
        <span style="color:var(--text-dim); width:60px; text-align:right">{{ s.games }}场</span>
        <span :style="{ color: s.rate >= .5 ? 'var(--accent)' : 'var(--text-dim)', width: '52px', 'text-align': 'right' }">
          {{ (s.rate * 100).toFixed(0) }}%
        </span>
        <span v-if="s.streak <= -2" style="color:var(--red); font-size:11px">{{ -s.streak }}连败</span>
        <span v-else-if="s.streak >= 2" style="color:#4cc38a; font-size:11px">{{ s.streak }}连胜</span>
        <span v-else style="width:36px"></span>
      </div>
    </div>
  </details>
</template>
