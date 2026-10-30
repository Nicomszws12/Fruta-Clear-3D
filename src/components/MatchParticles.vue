<script setup lang="ts">
/**
 * MatchParticles — Ola 3: 6–8 fruit/star sprites that rise from the trio
 * when a match pops in the tray. Cheap (pure CSS animations) but premium feel.
 */
import { ref, watch, nextTick, onUnmounted } from 'vue';
import type { MatchBurst } from '../composables/useGameState';
import { getAssetByKey } from '../game/tileAssets';

const props = defineProps<{
  burst: MatchBurst | null;
}>();

interface Particle {
  id: string;
  kind: 'fruit' | 'star';
  imagePath?: string;
  emoji?: string;
  style: Record<string, string>;
}

const particles = ref<Particle[]>([]);
const timers = new Set<ReturnType<typeof setTimeout>>();
const PARTICLE_LIFETIME_MS = 950;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const escapeAttr = (val: string) =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(val) : val;

const spawn = (burst: MatchBurst) => {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;

  const rects = burst.tileIds
    .map(id => document.querySelector<HTMLElement>(`[data-tray-tile-id="${escapeAttr(id)}"]`))
    .filter((el): el is HTMLElement => !!el)
    .map(el => el.getBoundingClientRect());
  if (rects.length === 0) return;

  const cx = rects.reduce((acc, r) => acc + r.left + r.width / 2, 0) / rects.length;
  const cy = rects.reduce((acc, r) => acc + r.top + r.height / 2, 0) / rects.length;
  const spread = Math.max(40, (rects[rects.length - 1].right - rects[0].left) / 2);

  const asset = getAssetByKey(burst.type);
  const count = 8;
  const batch: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const isStar = i % 3 === 2; // ~1/3 stars, rest fruit
    const size = isStar ? rand(16, 24) : rand(20, 30);
    batch.push({
      id: `${burst.id}-${i}`,
      kind: isStar ? 'star' : 'fruit',
      imagePath: isStar ? undefined : asset.imagePath,
      emoji: isStar ? undefined : asset.emoji,
      style: {
        left: `${cx + rand(-spread, spread) * 0.6 - size / 2}px`,
        top: `${cy - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size * 0.9}px`,
        '--dx': `${rand(-spread, spread)}px`,
        '--dy': `${rand(-170, -95)}px`,
        '--rot': `${rand(-200, 200)}deg`,
        animationDelay: `${Math.round(rand(0, 90))}ms`,
      },
    });
  }

  particles.value = [...particles.value, ...batch];
  const ids = new Set(batch.map(p => p.id));
  const t = setTimeout(() => {
    particles.value = particles.value.filter(p => !ids.has(p.id));
    timers.delete(t);
  }, PARTICLE_LIFETIME_MS + 120);
  timers.add(t);
};

watch(
  () => props.burst?.id,
  async id => {
    if (!id || !props.burst) return;
    const burst = props.burst;
    await nextTick();
    spawn(burst);
  },
);

onUnmounted(() => {
  timers.forEach(t => clearTimeout(t));
  timers.clear();
});
</script>

<template>
  <Teleport to="body">
    <div class="match-particles-layer" aria-hidden="true">
      <div
        v-for="p in particles"
        :key="p.id"
        class="match-particle"
        :class="`kind-${p.kind}`"
        :style="p.style"
      >
        <img v-if="p.kind === 'star'" src="/assets/ui/Yellow/Double/star.png" alt="" />
        <img v-else-if="p.imagePath" :src="p.imagePath" alt="" />
        <span v-else>{{ p.emoji }}</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.match-particles-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9400;
  overflow: hidden;
}

.match-particle {
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  will-change: transform, opacity;
  animation: particleRise 0.95s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
  opacity: 0;
}

.match-particle img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.match-particle.kind-star {
  filter: drop-shadow(0 0 6px rgba(250, 204, 21, 0.9));
}

.match-particle.kind-fruit {
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.25));
}

@keyframes particleRise {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0.4) rotate(0deg);
  }
  15% {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.2), calc(var(--dy) * 0.25)) scale(1.15) rotate(calc(var(--rot) * 0.2));
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) scale(0.7) rotate(var(--rot));
  }
}
</style>

