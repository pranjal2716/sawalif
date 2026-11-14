import { addDays, diffDays, fmtShort, parseDay, weekdayShort } from '../lib/dates';
import type { DayRow } from '../lib/db';
import { dayMinutes } from '../lib/stats';

const INK = '#18233b', MUTED = '#7b8597', GRID = '#e4e8ec', SEA = '#0e6f73', MADDER = '#a3302a';

/** Cumulative study hours against the plan line, from the start date to today. */
export function HoursVsPlan({ days, start, today, planPerDay }: { days: DayRow[]; start: string; today: string; planPerDay: number }) {
  const span = Math.max(14, diffDays(start, today) + 1);
  const from = addDays(today, -(span - 1));
  const byDate = new Map(days.map(d => [d.date, d]));
  let cum = 0;
  for (const d of days) if (d.date < from) cum += dayMinutes(d) / 60;
  const pts: { date: string; actual: number; plan: number }[] = [];
  for (let i = 0; i < span; i++) {
    const k = addDays(from, i);
    cum += dayMinutes(byDate.get(k)) / 60;
    const planned = Math.max(0, diffDays(start, k) + 1) * planPerDay;
    pts.push({ date: k, actual: cum, plan: k < start ? 0 : planned });
  }
  const W = 520, H = 220, L = 40, R = 16, T = 16, B = 30;
  const maxY = Math.max(1, ...pts.map(p => Math.max(p.actual, p.plan))) * 1.1;
  const x = (i: number) => L + (i / Math.max(1, span - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / maxY) * (H - T - B);
  const line = (key: 'actual' | 'plan') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const gap = last.actual - last.plan;
  const ticks = niceTicks(maxY);
  return (
    <figure style={{ margin: 0 }}>
      <div class="chart-title">{gap >= -0.05 ? `On plan: ${last.actual.toFixed(1)} hours studied` : `${Math.abs(gap).toFixed(1)} hours behind plan`}</div>
      <div class="chart-sub">Total hours since you started, against the plan</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Hours studied against plan">
        {ticks.map(t => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} />
            <text x={L - 6} y={y(t) + 4} text-anchor="end" font-size="11" fill={MUTED}>{fmtNum(t)}</text>
          </g>
        ))}
        <path d={line('plan')} fill="none" stroke={MUTED} stroke-width="1.5" stroke-dasharray="5 4" />
        <path d={line('actual')} fill="none" stroke={SEA} stroke-width="2.5" />
        <circle cx={x(span - 1)} cy={y(last.actual)} r="4" fill={SEA} />
        <text x={x(span - 1) - 6} y={y(last.plan) - 8} text-anchor="end" font-size="11" fill={MUTED}>plan</text>
        <text x={L} y={H - 8} font-size="11" fill={MUTED}>{fmtShort(from)}</text>
        <text x={W - R} y={H - 8} text-anchor="end" font-size="11" fill={MUTED}>today</text>
        <text x={L - 6} y={T - 4} text-anchor="end" font-size="11" fill={MUTED}>h</text>
      </svg>
    </figure>
  );
}

/** Study calendar: one square per day for the last 26 weeks. */
export function Heatmap({ byDate, today, planMinutes, start }: { byDate: Map<string, DayRow>; today: string; planMinutes: number; start: string }) {
  const weeks = 26;
  const dow = (parseDay(today).getDay() + 6) % 7; // Monday = 0
  const first = addDays(today, -(weeks - 1) * 7 - dow);
  const cell = 14, gapPx = 3, L = 30, T = 18;
  const W = L + weeks * (cell + gapPx), H = T + 7 * (cell + gapPx) + 4;
  const cells: any[] = [];
  const months: any[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const k = addDays(first, w * 7 + d);
      if (k > today) continue;
      const m = dayMinutes(byDate.get(k));
      const share = m / planMinutes;
      const fill = k < start ? '#f3f5f7' : m < 1 ? GRID : SEA;
      const op = m < 1 ? 1 : share >= 1 ? 1 : share >= 0.5 ? 0.65 : 0.35;
      cells.push(
        <rect key={k} x={L + w * (cell + gapPx)} y={T + d * (cell + gapPx)} width={cell} height={cell} rx="2" fill={fill} fill-opacity={op}>
          <title>{`${weekdayShort(k)} ${fmtShort(k)}: ${Math.round(m)} min`}</title>
        </rect>
      );
      if (d === 0) {
        const mo = parseDay(k).getMonth();
        if (mo !== lastMonth) {
          months.push(<text key={`m${k}`} x={L + w * (cell + gapPx)} y={11} font-size="11" fill={MUTED}>{fmtShort(k).split(' ')[1]}</text>);
          lastMonth = mo;
        }
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Study calendar for the last 26 weeks">
      {months}
      {['Mon', 'Wed', 'Fri'].map((t, i) => (
        <text key={t} x={0} y={T + (i * 2) * (cell + gapPx) + 11} font-size="10" fill={MUTED}>{t}</text>
      ))}
      {cells}
    </svg>
  );
}

/** Simple bars with an optional reference line. */
export function Bars({ data, refValue, refLabel, unit, highlightLast = false, labelEvery = 1 }: { data: { label: string; value: number }[]; refValue?: number; refLabel?: string; unit: string; highlightLast?: boolean; labelEvery?: number }) {
  const W = 520, H = 200, L = 34, R = 8, T = 14, B = 26;
  const maxY = Math.max(1, refValue ?? 0, ...data.map(d => d.value)) * 1.12;
  const bw = (W - L - R) / data.length;
  const y = (v: number) => T + (1 - v / maxY) * (H - T - B);
  const ticks = niceTicks(maxY);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Bars in ${unit}`}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={GRID} />
          <text x={L - 6} y={y(t) + 4} text-anchor="end" font-size="11" fill={MUTED}>{fmtNum(t)}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <g key={i}>
          <rect x={L + i * bw + bw * 0.18} y={y(d.value)} width={bw * 0.64} height={Math.max(0, H - B - y(d.value))} fill={highlightLast && i === data.length - 1 ? SEA : INK} fill-opacity={highlightLast && i !== data.length - 1 ? 0.75 : 1} rx="2">
            <title>{`${d.label}: ${Math.round(d.value)} ${unit}`}</title>
          </rect>
          {i % labelEvery === 0 && <text x={L + i * bw + bw / 2} y={H - 8} text-anchor="middle" font-size="11" fill={MUTED}>{d.label}</text>}
        </g>
      ))}
      {refValue != null && (
        <g>
          <line x1={L} x2={W - R} y1={y(refValue)} y2={y(refValue)} stroke={MADDER} stroke-dasharray="4 3" />
          <text x={W - R} y={y(refValue) - 5} text-anchor="end" font-size="11" fill={MADDER}>{refLabel}</text>
        </g>
      )}
    </svg>
  );
}

/** A thin progress meter with a label. */
export function Meter({ label, value, max, fmt }: { label: string; value: number; max: number; fmt: (v: number) => string }) {
  const p = Math.max(0, Math.min(1, value / max));
  return (
    <div title={`${label}: ${fmt(value)} of ${fmt(max)}`}>
      <div>{label}</div>
      <div class="meter"><i style={{ width: `${p * 100}%` }} /></div>
      <div class="tiny">{fmt(value)} / {fmt(max)}</div>
    </div>
  );
}

function niceTicks(max: number): number[] {
  const raw = max / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = 0; v <= max; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

function fmtNum(v: number) {
  return v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
}
