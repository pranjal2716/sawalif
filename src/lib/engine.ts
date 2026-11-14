/**
 * Deadline engine: projects when each milestone will be reached.
 *
 * Date = today + max(D_hours, D_words, D_listen, D_speak)
 * "On plan" uses the planned daily time from today on; "at your pace" scales it by
 * the share of planned time actually done over the last 28 days (blended with a 0.85
 * prior while there is less than 28 days of history). Missed days in long gaps cost
 * extra: 1.1x for gaps of 4-14 days, 1.2x beyond.
 */
import { addDays, diffDays } from './dates';

export interface Milestone {
  id: string;
  name: string;
  level: string;
  hours: number;
  hoursLow: number;
  hoursHigh: number;
  words: number;
  listen: number;
  speak: number;
  cando: string[];
}

export interface DayMinutes {
  date: string;
  cards: number;
  listening: number;
  shadowing: number;
  speaking: number;
  ai: number;
  reallife: number;
  newCards?: number;
}

export interface Plan {
  startDate: string;
  minutesPerDay: number;
  daysPerWeek: number;
}

export interface Split {
  cards: number;
  listening: number;
  shadowing: number;
  speaking: number;
  newPerDay: number;
}

/** Daily time split by plan size (Nation's four strands, flashcards capped near 40%). */
export function splitFor(minutes: number): Split {
  const table: [number, Split][] = [
    [20, { cards: 8, listening: 6, shadowing: 3, speaking: 3, newPerDay: 5 }],
    [30, { cards: 11, listening: 9, shadowing: 5, speaking: 5, newPerDay: 7 }],
    [45, { cards: 14, listening: 14, shadowing: 7, speaking: 10, newPerDay: 9 }],
    [60, { cards: 17, listening: 20, shadowing: 10, speaking: 13, newPerDay: 11 }]
  ];
  let best = table[0];
  for (const row of table) if (Math.abs(row[0] - minutes) < Math.abs(best[0] - minutes)) best = row;
  const scale = minutes / best[0];
  const s = best[1];
  return {
    cards: Math.round(s.cards * scale),
    listening: Math.round(s.listening * scale),
    shadowing: Math.round(s.shadowing * scale),
    speaking: Math.max(1, Math.round(s.speaking * scale)),
    newPerDay: Math.max(2, Math.round(s.newPerDay * scale))
  };
}

// ---- credit rules (minutes -> hours toward each counter) ----
export function studyHours(d: DayMinutes): number {
  return (d.cards + d.listening + d.shadowing + d.speaking + d.ai + 0.5 * d.reallife) / 60;
}
export function listenHours(d: DayMinutes): number {
  return (d.listening + 0.5 * d.shadowing + 0.1 * d.cards + 0.5 * d.reallife) / 60;
}
export function speakHours(d: DayMinutes): number {
  return (d.speaking + d.ai + 0.5 * d.shadowing + 0.5 * d.reallife) / 60;
}

export interface PlanRates {
  hours: number; // per calendar day
  listen: number;
  speak: number;
  words: number;
}

export function planRates(plan: Plan): PlanRates {
  const s = splitFor(plan.minutesPerDay);
  const perDay = plan.daysPerWeek / 7;
  const day: DayMinutes = { date: '', cards: s.cards, listening: s.listening, shadowing: s.shadowing, speaking: s.speaking, ai: 0, reallife: 0 };
  const total = s.cards + s.listening + s.shadowing + s.speaking;
  const k = plan.minutesPerDay / total; // keep the total equal to the plan
  return {
    hours: (plan.minutesPerDay / 60) * perDay,
    listen: listenHours(day) * k * perDay,
    speak: speakHours(day) * k * perDay,
    words: s.newPerDay * perDay
  };
}

/** Words are counted "known" ~a month after they are introduced (recall interval >= 21 days). */
export const WORD_LAG_DAYS = 30;

export interface Progress {
  hours: number;
  listen: number;
  speak: number;
  known: number;
}

export function totals(days: DayMinutes[]): Omit<Progress, 'known'> {
  let hours = 0, listen = 0, speak = 0;
  for (const d of days) {
    hours += studyHours(d);
    listen += listenHours(d);
    speak += speakHours(d);
  }
  return { hours, listen, speak };
}

export interface Countdown {
  hours: number;
  words: number;
  listen: number;
  speak: number;
  max: number;
  binding: 'hours' | 'words' | 'listen' | 'speak';
}

export function countdown(m: Milestone, p: Progress, r: PlanRates, scale = 1, hoursTarget = m.hours): Countdown {
  const ratio = hoursTarget / m.hours;
  const safe = (x: number) => (x > 0 ? x : 1e-9);
  const dh = Math.max(0, hoursTarget - p.hours) / safe(r.hours * scale);
  const remainingWords = Math.max(0, m.words * ratio - p.known);
  const dw = remainingWords > 0 ? remainingWords / safe(r.words * scale) + WORD_LAG_DAYS : 0;
  const dl = Math.max(0, m.listen * ratio - p.listen) / safe(r.listen * scale);
  const ds = Math.max(0, m.speak * ratio - p.speak) / safe(r.speak * scale);
  const parts = { hours: dh, words: dw, listen: dl, speak: ds };
  let binding: Countdown['binding'] = 'hours';
  for (const k of Object.keys(parts) as Countdown['binding'][]) if (parts[k] > parts[binding]) binding = k;
  return { ...parts, max: parts[binding], binding };
}

/** Extra days owed for long gaps: (factor - 1) x missed days, per run of zero-study days. */
export function gapSurcharge(days: DayMinutes[], plan: Plan, today: string): number {
  const studied = new Set(days.filter(d => studyHours(d) * 60 >= 1).map(d => d.date));
  const expected = plan.daysPerWeek / 7;
  let extra = 0;
  let run = 0;
  const close = () => {
    if (run > 14) extra += 0.2 * run * expected;
    else if (run > 3) extra += 0.1 * run * expected;
    run = 0;
  };
  for (let k = plan.startDate; k < today; k = addDays(k, 1)) {
    if (studied.has(k)) close();
    else run++;
  }
  close();
  return extra;
}

/** Share of planned study time actually done over the trailing window (completed days only). */
export function adherence(days: DayMinutes[], plan: Plan, today: string, window = 28, prior = 0.85): number {
  const elapsed = Math.max(0, Math.min(window, diffDays(plan.startDate, today)));
  if (elapsed === 0) return prior;
  const from = addDays(today, -elapsed);
  let done = 0;
  for (const d of days) if (d.date >= from && d.date < today) done += studyHours(d);
  const planned = (plan.minutesPerDay / 60) * (plan.daysPerWeek / 7) * elapsed;
  const observed = Math.min(1.5, done / planned);
  return (elapsed * observed + (window - elapsed) * prior) / window;
}

export interface Projection {
  milestone: Milestone;
  baseline: string; // date if the plan had been followed from the start
  onPlan: string; // if the plan is followed from today
  atPace: string; // at the recent pace
  low: string; // optimistic (low hour estimate, on plan)
  high: string; // pessimistic (high hour estimate, at pace)
  slipDays: number; // onPlan - baseline (positive = later)
  binding: Countdown['binding'];
  reached: boolean;
  progress: Progress;
  adherence: number;
}

export function project(m: Milestone, plan: Plan, days: DayMinutes[], known: number, today: string): Projection {
  const r = planRates(plan);
  const t = totals(days);
  const progress: Progress = { ...t, known };
  const zero: Progress = { hours: 0, listen: 0, speak: 0, known: 0 };

  const base = countdown(m, zero, r);
  const baseline = addDays(plan.startDate, Math.ceil(base.max - 1e-9));

  const reached = progress.hours >= m.hours && progress.known >= m.words && progress.listen >= m.listen && progress.speak >= m.speak;
  const surcharge = gapSurcharge(days, plan, today);
  const a = adherence(days, plan, today);

  const plain = countdown(m, progress, r);
  const up = (x: number) => Math.ceil(x - 1e-9);
  const onPlan = reached ? today : addDays(today, up(plain.max + surcharge));
  const pace = countdown(m, progress, r, Math.max(0.05, a));
  const atPace = reached ? today : addDays(today, up(pace.max + surcharge / Math.max(0.05, a)));
  const lowC = countdown(m, progress, r, 1, m.hoursLow);
  const highC = countdown(m, progress, r, Math.max(0.05, a), m.hoursHigh);

  return {
    milestone: m,
    baseline,
    onPlan,
    atPace,
    low: reached ? today : addDays(today, up(lowC.max + surcharge)),
    high: reached ? today : addDays(today, up(highC.max + surcharge / Math.max(0.05, a))),
    slipDays: diffDays(baseline, onPlan),
    binding: pace.binding,
    reached,
    progress,
    adherence: a
  };
}
