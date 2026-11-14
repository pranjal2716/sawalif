/** Speech recognition (Edge/Chrome) and a lenient comparison against the target phrase. */

const Recognition: any =
  typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export const canRecognise = !!Recognition;

export function listenOnce(lang = 'ar-AE', timeoutMs = 7000): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!Recognition) return reject(new Error('Speech recognition is not available in this browser.'));
    const r = new Recognition();
    r.lang = lang;
    r.interimResults = false;
    r.maxAlternatives = 5;
    let done = false;
    const finish = (v: string[] | Error) => {
      if (done) return;
      done = true;
      try {
        r.stop();
      } catch {
        /* ignore */
      }
      v instanceof Error ? reject(v) : resolve(v);
    };
    r.onresult = (e: any) => {
      const alts: string[] = [];
      for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
      finish(alts);
    };
    r.onerror = (e: any) =>
      finish(new Error(e.error === 'not-allowed' ? 'Microphone access was blocked. Allow it in the address bar and try again.' : e.error === 'network' ? 'Speech check needs an internet connection in this browser.' : e.error === 'no-speech' ? 'No speech heard. Try again a little louder.' : `Speech check failed (${e.error}).`));
    r.onend = () => finish([]);
    try {
      r.start();
    } catch (err) {
      finish(err as Error);
    }
    setTimeout(() => finish([]), timeoutMs);
  });
}

export function normaliseArabic(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, '') // diacritics, tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/چ/g, 'ك')
    .replace(/گ/g, 'ق')
    .replace(/[^ء-ي]/g, '');
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function similarity(heard: string, target: string): number {
  const a = normaliseArabic(heard), b = normaliseArabic(target);
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

export type Verdict = 'match' | 'close' | 'miss' | 'silent';

export function judge(alternatives: string[], target: string): { verdict: Verdict; score: number } {
  if (!alternatives.length) return { verdict: 'silent', score: 0 };
  const score = Math.max(...alternatives.map(a => similarity(a, target)));
  return { verdict: score >= 0.75 ? 'match' : score >= 0.5 ? 'close' : 'miss', score };
}

export const verdictText: Record<Verdict, string> = {
  match: 'Sounds right.',
  close: 'Close. Listen once more and compare.',
  miss: "Didn't match. Speech recognition is weak on Gulf Arabic, so trust your ear too.",
  silent: 'Nothing was heard. Check your microphone and try again.'
};
