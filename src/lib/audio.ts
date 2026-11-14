/**
 * Playback priority: a native-speaker recording you saved > pre-generated neural MP3 > the
 * browser's own Arabic voice (Edge has Microsoft's UAE voices built in).
 */
import { db } from './db';

let index: Set<string> | null = null;
let indexPromise: Promise<Set<string>> | null = null;

export function loadAudioIndex(): Promise<Set<string>> {
  if (index) return Promise.resolve(index);
  if (!indexPromise) {
    indexPromise = fetch(`${import.meta.env.BASE_URL}audio/index.json`, { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : { files: {} }))
      .catch(() => ({ files: {} }))
      .then((j: any) => (index = new Set(Object.keys(j.files ?? {}))));
  }
  return indexPromise;
}

// ---------- browser voices ----------
let voices: SpeechSynthesisVoice[] = [];
function refreshVoices() {
  try {
    voices = window.speechSynthesis?.getVoices() ?? [];
  } catch {
    voices = [];
  }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

const FEMALE = /fatima|hala|zariyah|salma|laila|amina|mouna|noura|amany|rana|sana|female/i;
const MALE = /hamdan|naayf|naif|shakir|fahed|hamed|bassel|taim|moaz|omar|male/i;

export function arabicVoices(): SpeechSynthesisVoice[] {
  refreshVoices();
  return voices.filter(v => v.lang?.toLowerCase().startsWith('ar'));
}

export function pickVoice(gender: 'f' | 'm'): SpeechSynthesisVoice | null {
  const ar = arabicVoices();
  if (!ar.length) return null;
  const rank = (v: SpeechSynthesisVoice) => {
    let s = 0;
    const lang = v.lang.toLowerCase();
    if (lang === 'ar-ae') s += 100;
    else if (['ar-kw', 'ar-qa', 'ar-bh', 'ar-om', 'ar-sa'].includes(lang)) s += 60;
    else if (lang === 'ar-iq') s += 50;
    if (/natural|online/i.test(v.name)) s += 20;
    if ((gender === 'f' ? FEMALE : MALE).test(v.name)) s += 30;
    return s;
  };
  return [...ar].sort((a, b) => rank(b) - rank(a))[0];
}

export function voiceStatus(): { mp3: number; browser: string | null } {
  const v = pickVoice('f');
  return { mp3: index?.size ?? 0, browser: v ? `${v.name} (${v.lang})` : null };
}

// ---------- playback ----------
let current: HTMLAudioElement | null = null;
let alt = 0;

export function stop() {
  if (current) {
    current.pause();
    current = null;
  }
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

function playUrl(url: string, rate: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const a = new Audio(url);
    a.playbackRate = rate;
    current = a;
    a.onended = () => resolve();
    a.onerror = () => reject(new Error('audio failed'));
    a.play().catch(reject);
  });
}

function speak(text: string, gender: 'f' | 'm', rate: number): Promise<void> {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(gender);
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'ar-AE';
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
    // Chrome can stall long utterances; resolve after a generous timeout.
    setTimeout(resolve, 2500 + text.length * 250);
  });
}

export interface PlayOpts {
  voice?: 'both' | 'f' | 'm';
  rate?: number;
}

/** Play a course item. Returns when playback ends. */
export async function playItem(item: { id: string; ar: string }, opts: PlayOpts = {}): Promise<void> {
  stop();
  const rate = opts.rate ?? 1;
  const native = await db.recordings.get(item.id);
  if (native) {
    const url = URL.createObjectURL(native.blob);
    try {
      return await playUrl(url, rate);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const pref = opts.voice ?? 'both';
  const gender: 'f' | 'm' = pref === 'both' ? (alt++ % 2 === 0 ? 'f' : 'm') : pref;
  return playKey(`${item.id}-${gender}`, item.ar, gender, rate);
}

export async function playLine(dialogueId: string, idx: number, line: { ar: string; voice: 'f' | 'm' }, rate = 1) {
  stop();
  return playKey(`${dialogueId}-${idx}`, line.ar, line.voice, rate);
}

export async function playText(text: string, gender: 'f' | 'm' = 'f', rate = 1) {
  stop();
  return speak(text, gender, rate);
}

async function playKey(key: string, text: string, gender: 'f' | 'm', rate: number) {
  const idx = await loadAudioIndex();
  if (idx.has(key)) {
    try {
      return await playUrl(`${import.meta.env.BASE_URL}audio/${key}.mp3`, rate);
    } catch {
      /* fall through to the browser voice */
    }
  }
  return speak(text, gender, rate * 0.95);
}

/** Rough duration of a phrase in ms, for timing recordings. */
export function estimateMs(text: string): number {
  return 900 + text.length * 110;
}
