import { useEffect, useRef, useState } from 'preact/hooks';
import { db } from '../lib/db';
import { loadCourse, getSettings, type Settings } from '../lib/store';
import { SCENARIOS, systemPrompt, partnerTurn, type Turn, type PartnerReply } from '../lib/gemini';
import { playText, stop } from '../lib/audio';
import { canRecognise, listenOnce } from '../lib/speech';
import { useActivityTimer } from '../lib/timer';
import { PlayButton, Icon, Banner } from '../components/ui';

interface Msg { me: boolean; text?: string; reply?: PartnerReply; showEn?: boolean }

export function Partner({ onClose }: { onClose?: () => void }) {
  const [s, setS] = useState<Settings | null>(null);
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number] | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [history, setHistory] = useState<Turn[]>([]);
  const [system, setSystem] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useActivityTimer('ai', !!scenario);

  useEffect(() => {
    getSettings().then(setS);
    return () => stop();
  }, []);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [msgs.length]);

  if (!s) return <div class="panel">Loading…</div>;

  if (!s.geminiKey || !s.geminiModel) {
    return (
      <div class="panel stack">
        <h2>AI conversation partner</h2>
        <p>The partner uses Google's free Gemini service. Add your free key once in Settings and it stays on this PC.</p>
        <ol class="muted">
          <li>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Google AI Studio</a> and sign in with your Google account.</li>
          <li>Choose Create API key and copy it.</li>
          <li>Paste it in Settings, under AI partner, and press Load models.</li>
        </ol>
        <p class="tiny">Google may use free-tier chats to improve its products, so keep business details out of role-plays.</p>
        <div class="row">
          <a class="btn primary" href="#/settings">Open Settings</a>
          {onClose && <button class="btn" onClick={onClose}>Back</button>}
        </div>
      </div>
    );
  }

  const send = async (text: string, hist: Turn[], sys: string) => {
    setBusy(true);
    setErr('');
    try {
      const next = text ? [...hist, { role: 'user' as const, text }] : hist;
      if (text) setMsgs(m => [...m, { me: true, text }]);
      const reply = await partnerTurn(s.geminiKey, s.geminiModel, sys, next);
      setHistory([...next, { role: 'model', text: JSON.stringify({ ar: reply.ar, tr: reply.tr, en: reply.en }) }]);
      setMsgs(m => {
        const copy = [...m];
        // attach what the AI heard to your last message
        if (text && reply.heard) {
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, text: reply.heard };
        }
        return [...copy, { me: false, reply }];
      });
      setInput('');
      playText(reply.ar, 'f', s.rate * 0.95);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const start = async (sc: (typeof SCENARIOS)[number]) => {
    const c = await loadCourse();
    const listen = await db.cards.where('dir').equals('listen').toArray();
    const known = listen.map(r => c.byId.get(r.itemId)?.tr).filter(Boolean) as string[];
    const sys = systemPrompt(sc.setup, known);
    setScenario(sc);
    setSystem(sys);
    setMsgs([]);
    setHistory([]);
    send('', [], sys);
  };

  const speakIn = async () => {
    setListening(true);
    setErr('');
    try {
      const alts = await listenOnce('ar-AE', 9000);
      if (alts[0]) await send(alts[0], history, system);
      else setErr('Nothing was heard. Try again, or type it in English letters.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setListening(false);
    }
  };

  if (!scenario) {
    return (
      <div class="panel stack">
        <div class="spread">
          <h2>Choose a role-play</h2>
          {onClose && <button class="btn quiet" onClick={onClose}>Back to drills</button>}
        </div>
        <p class="muted">The partner speaks short Gulf Arabic lines. Answer by speaking, or type in English letters (or English if you're stuck).</p>
        <div class="chips">
          {SCENARIOS.map(sc => (
            <button key={sc.id} class="chip" onClick={() => start(sc)}>
              {sc.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div class="panel">
      <div class="spread" style={{ marginBottom: 16 }}>
        <h2>{scenario.title}</h2>
        <div class="row">
          <button class="btn quiet" onClick={() => setScenario(null)}>New role-play</button>
          {onClose && <button class="btn quiet" onClick={onClose}>Back to drills</button>}
        </div>
      </div>
      <div class="chat">
        {msgs.map((m, i) =>
          m.me ? (
            <div class="bubble me" key={i}>
              <div class="say">{m.text}</div>
            </div>
          ) : (
            <div class="bubble ai" key={i}>
              <div class="row">
                <PlayButton small onPlay={() => playText(m.reply!.ar, 'f', s.rate * 0.95)} />
                <div class="say">{m.reply!.tr}</div>
              </div>
              {m.showEn ? (
                <div class="muted">{m.reply!.en}</div>
              ) : (
                <button class="btn quiet small" onClick={() => setMsgs(ms => ms.map((x, j) => (j === i ? { ...x, showEn: true } : x)))}>
                  Show English
                </button>
              )}
              {m.reply!.tip && <div class="tip">{m.reply!.tip}</div>}
              {i === msgs.length - 1 && m.reply!.suggest && (
                <div class="row" style={{ marginTop: 8 }}>
                  <span class="tiny">You could say:</span>
                  <button class="chip" onClick={() => setInput(m.reply!.suggest!)}>{m.reply!.suggest}</button>
                </div>
              )}
            </div>
          )
        )}
        {busy && <div class="muted">…</div>}
        <div ref={end} />
      </div>
      {err && <div style={{ marginTop: 12 }}><Banner warn>{err}</Banner></div>}
      <form
        class="composer"
        onSubmit={e => {
          e.preventDefault();
          if (input.trim()) send(input.trim(), history, system);
        }}
      >
        {canRecognise && (
          <button type="button" class="btn primary" onClick={speakIn} disabled={busy || listening}>
            {Icon.mic} {listening ? 'Listening…' : 'Speak'}
          </button>
        )}
        <input type="text" placeholder="Or type in English letters, e.g. abi chaay karak" value={input} onInput={e => setInput((e.target as HTMLInputElement).value)} disabled={busy} />
        <button class="btn" type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
