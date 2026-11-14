import { useEffect, useState } from 'preact/hooks';
import { db } from './db';
import { dayKey } from './dates';
import type { Milestone } from './engine';

// ---------------- content ----------------
export interface Item { id: string; en: string; tr: string; ar: string; note?: string; module: string }
export interface Line { who: string; voice: 'f' | 'm'; tr: string; ar: string; en: string }
export interface Question { q: string; options: string[]; answer: number }
export interface Dialogue { id: string; module: string; title: string; setting: string; lines: Line[]; questions: Question[] }
export interface Module { id: string; title: string; blurb: string; items: Item[] }
export interface Course {
  version: number;
  spelling: [string, string, string, string][];
  modules: Module[];
  dialogues: Dialogue[];
  milestones: Milestone[];
  items: Item[]; // flattened, in teaching order
  byId: Map<string, Item>;
}

let coursePromise: Promise<Course> | null = null;

export function loadCourse(): Promise<Course> {
  if (!coursePromise) {
    coursePromise = fetch(`${import.meta.env.BASE_URL}content/course.json`)
      .then(r => r.json())
      .then((raw: any) => {
        const modules: Module[] = raw.modules.map((m: any) => ({ ...m, items: m.items.map((i: any) => ({ ...i, module: m.id })) }));
        const items = modules.flatMap(m => m.items);
        return { ...raw, modules, items, byId: new Map(items.map(i => [i.id, i])) } as Course;
      });
  }
  return coursePromise;
}

export function useCourse(): Course | null {
  const [c, setC] = useState<Course | null>(null);
  useEffect(() => {
    loadCourse().then(setC);
  }, []);
  return c;
}

// ---------------- settings ----------------
export interface Settings {
  startDate: string;
  minutesPerDay: number;
  daysPerWeek: number;
  target: string;
  voice: 'both' | 'f' | 'm';
  rate: number;
  spelling: 'after' | 'always';
  geminiKey: string;
  geminiModel: string;
  retention: number;
  onboarded: boolean;
}

export const defaultSettings = (): Settings => ({
  startDate: dayKey(),
  minutesPerDay: 20,
  daysPerWeek: 7,
  target: 'm3',
  voice: 'both',
  rate: 1,
  spelling: 'after',
  geminiKey: '',
  geminiModel: '',
  retention: 0.9,
  onboarded: false
});

let settingsCache: Settings | null = null;

export async function getSettings(): Promise<Settings> {
  if (settingsCache) return settingsCache;
  const row = await db.kv.get('settings');
  settingsCache = { ...defaultSettings(), ...(row?.value ?? {}) };
  if (!row) await db.kv.put({ key: 'settings', value: settingsCache });
  return settingsCache!;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await getSettings();
  settingsCache = { ...cur, ...patch };
  await db.kv.put({ key: 'settings', value: settingsCache });
  window.dispatchEvent(new CustomEvent('sawalif:settings'));
  return settingsCache;
}

export function useSettings(): [Settings | null, (p: Partial<Settings>) => Promise<void>] {
  const [s, setS] = useState<Settings | null>(settingsCache);
  useEffect(() => {
    let alive = true;
    const load = () => getSettings().then(v => alive && setS({ ...v }));
    load();
    window.addEventListener('sawalif:settings', load);
    return () => {
      alive = false;
      window.removeEventListener('sawalif:settings', load);
    };
  }, []);
  return [s, async p => { setS({ ...(await saveSettings(p)) }); }];
}

/** Re-render when study progress changes. */
export function useProgressTick(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const f = () => setN(x => x + 1);
    window.addEventListener('sawalif:progress', f);
    return () => window.removeEventListener('sawalif:progress', f);
  }, []);
  return n;
}
