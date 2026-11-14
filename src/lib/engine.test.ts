import { describe, it, expect } from 'vitest';
import { project, planRates, adherence, splitFor, type Milestone, type DayMinutes } from './engine';
import { addDays } from './dates';

const M2hoursOnly: Milestone = { id: 'm2', name: 'Basic', level: 'A2', hours: 350, hoursLow: 250, hoursHigh: 450, words: 0, listen: 0, speak: 0, cando: [] };
const start = '2026-11-16';
const plan45 = { startDate: start, minutesPerDay: 45, daysPerWeek: 7 };

function studied(from: string, n: number, minutes: number, skip: (i: number) => boolean = () => false): DayMinutes[] {
  const out: DayMinutes[] = [];
  for (let i = 0; i < n; i++) {
    if (skip(i)) continue;
    // put all minutes in "cards" for simplicity: studyHours counts them 1:1
    out.push({ date: addDays(from, i), cards: minutes, listening: 0, shadowing: 0, speaking: 0, ai: 0, reallife: 0 });
  }
  return out;
}

describe('deadline engine', () => {
  it('baseline: 45 min/day, every day, 350 h -> 26 Feb 2028 (467 days)', () => {
    const p = project(M2hoursOnly, plan45, [], 0, start);
    expect(p.baseline).toBe('2028-02-26');
    expect(p.onPlan).toBe('2028-02-26');
    expect(p.slipDays).toBe(0);
  });

  it('following the plan exactly keeps the date fixed', () => {
    const today = addDays(start, 30);
    const p = project(M2hoursOnly, plan45, studied(start, 30, 45), 0, today);
    expect(p.onPlan).toBe('2028-02-26');
    expect(p.slipDays).toBe(0);
  });

  it('one 7-day break costs about 8 days', () => {
    const today = addDays(start, 30);
    const days = studied(start, 30, 45, i => i >= 10 && i < 17);
    const p = project(M2hoursOnly, plan45, days, 0, today);
    expect(p.onPlan).toBe('2028-03-05');
    expect(p.slipDays).toBe(8);
  });

  it('5 of 7 days moves the pace date to about 30 Aug 2028', () => {
    // a long history at 5/7 adherence: pace scale = 5/7
    const today = addDays(start, 28);
    const days = studied(start, 28, 45, i => i % 7 >= 5);
    const a = adherence(days, plan45, today);
    expect(a).toBeCloseTo(5 / 7, 2);
    const p = project(M2hoursOnly, plan45, days, 0, today);
    // remaining hours at pace from day 28: (350 - 20*0.75) / (0.75*5/7) = 625.33 days
    expect(p.atPace).toBe(addDays(today, 626));
  });

  it('20 min/day to everyday conversation (700 h) is about August 2032', () => {
    const M3: Milestone = { id: 'm3', name: 'Everyday', level: 'B1', hours: 700, hoursLow: 550, hoursHigh: 850, words: 2750, listen: 280, speak: 100, cando: [] };
    const plan20 = { startDate: '2026-11-14', minutesPerDay: 20, daysPerWeek: 7 };
    const p = project(M3, plan20, [], 0, '2026-11-14');
    expect(p.baseline.startsWith('2032-0')).toBe(true);
    expect(p.binding).toBe('hours');
    expect(p.low < p.baseline && p.baseline < p.high).toBe(true);
  });

  it('split for 20 minutes adds up to 20', () => {
    const s = splitFor(20);
    expect(s.cards + s.listening + s.shadowing + s.speaking).toBe(20);
    expect(planRates({ startDate: start, minutesPerDay: 20, daysPerWeek: 7 }).hours).toBeCloseTo(1 / 3, 5);
  });
});
