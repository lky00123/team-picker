<script setup lang="ts">
/** 结果面板: 红蓝两队 + 翻牌动画 + 种子徽章 + 手动微调 */
import { computed } from 'vue'
import type { Player, Teams } from '../core'

const props = defineProps<{ result: Teams; animating: boolean; scoreOn?: boolean }>()
defineEmits<{ (e: 'swap', id: string): void; (e: 'join', id: string): void; (e: 'leave', id: string): void }>()

const allIds = computed(() => new Set([...props.result.red, ...props.result.blue].map((p) => p.id)))

const score = (arr: Player[]) => arr.reduce((s, p) => s + p.score, 0)
</script>

<template>
  <div class="card" style="margin-top:14px">
    <p v-if="result.note" style="text-align:center; font-size:12px; color:var(--accent); margin-bottom:10px">
      {{ result.note }}
    </p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
      <!-- 红队 -->
      <div style="background:rgba(229,72,77,.12); border:1px solid rgba(229,72,77,.4); border-radius:10px; padding:10px">
        <p style="color:var(--red); font-weight:700; margin-bottom:8px">
          🔴 红队 ({{ result.red.length }}<span v-if="scoreOn"> · {{ score(result.red) }}分</span>)
        </p>
        <div v-for="p in result.red" :key="p.id" class="member"
          :style="{ animationDelay: animating ? `${result.red.indexOf(p) * 150}ms` : '0ms' }"
          :class="{ flip: animating }">
          <span>{{ p.name }}</span>
          <span class="ops">
            <button class="mini" title="换到对面" @click="$emit('swap', p.id)">⇄</button>
            <button class="mini" title="离场" @click="$emit('leave', p.id)">−</button>
          </span>
        </div>
      </div>
      <!-- 蓝队 -->
      <div style="background:rgba(62,99,221,.12); border:1px solid rgba(62,99,221,.4); border-radius:10px; padding:10px">
        <p style="color:#7c9aff; font-weight:700; margin-bottom:8px">
          🔵 蓝队 ({{ result.blue.length }}<span v-if="scoreOn"> · {{ score(result.blue) }}分</span>)
        </p>
        <div v-for="p in result.blue" :key="p.id" class="member"
          :style="{ animationDelay: animating ? `${result.blue.indexOf(p) * 150}ms` : '0ms' }"
          :class="{ flip: animating }">
          <span>{{ p.name }}</span>
          <span class="ops">
            <button class="mini" title="换到对面" @click="$emit('swap', p.id)">⇄</button>
            <button class="mini" title="离场" @click="$emit('leave', p.id)">−</button>
          </span>
        </div>
      </div>
    </div>

    <!-- 种子徽章 -->
    <p style="text-align:center; margin-top:10px; font-size:11px; color:var(--text-dim)">
      种子 <code style="color:var(--accent)">#{{ result.seed }}</code> ·
      {{ new Date(result.ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }}
      · 同名单+种子可复现本局
    </p>
  </div>
</template>

<style scoped>
.member {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 8px; margin-bottom: 4px; border-radius: 6px;
  background: var(--card-2); font-size: 14px;
}
.member .ops { display: none; gap: 4px; }
.member:hover .ops { display: flex; }
.mini {
  background: transparent; color: var(--text-dim);
  font-size: 12px; padding: 2px 6px; border: 1px solid #3a3f4a; border-radius: 4px;
}
.flip { animation: flipIn .5s ease both; }
@keyframes flipIn {
  0% { transform: rotateX(90deg) translateY(-10px); opacity: 0; }
  100% { transform: rotateX(0) translateY(0); opacity: 1; }
}
</style>
