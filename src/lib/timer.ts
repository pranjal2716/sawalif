import { useEffect, useRef, useState } from 'preact/hooks';
import { bumpDay, type Activity } from './db';
import { dayKey } from './dates';

/** Time only counts while the window is visible and you've interacted in the last 2 minutes. */
let lastInteraction = Date.now();
const IDLE_MS = 120000;

export function markActive() {
  lastInteraction = Date.now();
}

if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
    window.addEventListener(ev, markActive, { passive: true });
  }
}

function isActive() {
  return document.visibilityState === 'visible' && Date.now() - lastInteraction < IDLE_MS;
}

/** Tracks active seconds for an activity and saves them to today's log. Returns seconds this run. */
export function useActivityTimer(activity: Activity, running = true): number {
  const [secs, setSecs] = useState(0);
  const pending = useRef(0);

  useEffect(() => {
    if (!running) return;
    markActive();
    const flush = () => {
      if (pending.current > 0) {
        const min = pending.current / 60;
        pending.current = 0;
        bumpDay(dayKey(), { [activity]: min } as any);
      }
    };
    const tick = setInterval(() => {
      if (isActive()) {
        pending.current += 1;
        setSecs(s => s + 1);
        if (pending.current >= 15) flush();
      }
    }, 1000);
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [activity, running]);

  return secs;
}

export function fmtClock(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
