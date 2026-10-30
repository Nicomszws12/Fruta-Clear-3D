/**
 * tileFlight — #2 "Ficha vuela a la bandeja".
 *
 * Clones the tapped board tile's face, positions it fixed over the original
 * and animates translate+scale toward the target tray slot (~220ms) so the
 * brain connects the tap with the reward. Resolves when the flight ends.
 *
 * Relies on DOM hooks:
 *  - Board tile:  [data-tile-id="<id>"] containing .tile-face
 *  - Tray slots:  .tray-slots > .tray-slot (filled + empty, in visual order)
 */
import type { Tile } from './types';

export const TILE_FLIGHT_MS = 220;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const escapeAttr = (val: string) =>
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(val) : val;

export function animateTileFlight(tile: Tile, targetSlotIndex: number): Promise<void> {
  return new Promise(resolve => {
    if (typeof document === 'undefined' || prefersReducedMotion()) {
      resolve();
      return;
    }

    const src = document.querySelector<HTMLElement>(`[data-tile-id="${escapeAttr(tile.id)}"]`);
    const face = src?.querySelector<HTMLElement>('.tile-face');
    const slots = document.querySelectorAll<HTMLElement>('.tray-slots > .tray-slot');
    const dst = slots[Math.min(targetSlotIndex, slots.length - 1)];

    if (!src || !face || !dst || typeof face.animate !== 'function') {
      resolve();
      return;
    }

    const s = face.getBoundingClientRect();
    const d = dst.getBoundingClientRect();
    if (s.width === 0 || d.width === 0) {
      resolve();
      return;
    }

    const clone = face.cloneNode(true) as HTMLElement;
    clone.querySelector('.blocked-lock-overlay')?.remove();
    clone.classList.add('tile-flight-clone');
    clone.style.setProperty('--tile-size', `${s.width}px`);
    clone.style.setProperty('--tile-z', '0');
    Object.assign(clone.style, {
      position: 'fixed',
      left: `${s.left}px`,
      top: `${s.top}px`,
      width: `${s.width}px`,
      height: `${s.height}px`,
      margin: '0',
      zIndex: '9500',
      pointerEvents: 'none',
      transformOrigin: '0 0',
      willChange: 'transform',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(clone);

    const scale = d.width / s.width;
    const dx = d.left - s.left;
    const dy = d.top - s.top;
    // Slight upward arc at the midpoint for a "toss" feel
    const midX = dx * 0.5;
    const midY = dy * 0.5 - Math.min(60, Math.abs(dy) * 0.18);
    const midScale = 1 + (scale - 1) * 0.5 + 0.08;

    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clone.remove();
      resolve();
    };

    try {
      const anim = clone.animate(
        [
          { transform: 'translate(0px, 0px) scale(1)' },
          { transform: `translate(${midX}px, ${midY}px) scale(${midScale})`, offset: 0.5 },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        ],
        { duration: TILE_FLIGHT_MS, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'forwards' },
      );
      anim.onfinish = done;
      anim.oncancel = done;
    } catch {
      done();
      return;
    }

    // Failsafe: never leave input locked if the animation is throttled
    setTimeout(done, TILE_FLIGHT_MS + 180);
  });
}

