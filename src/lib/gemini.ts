/** Google Gemini (free tier) as a role-play partner. The key stays on this PC. */

const API = 'https://generativelanguage.googleapis.com/v1beta';

export interface ModelInfo { name: string; displayName: string }

export async function listModels(key: string): Promise<ModelInfo[]> {
  const r = await fetch(`${API}/models?pageSize=1000`, { headers: { 'x-goog-api-key': key } });
  if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'Google rejected this key. Check it in Google AI Studio.' : `Google returned an error (${r.status}).`);
  const j = await r.json();
  return (j.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .filter((m: any) => /gemini/i.test(m.name) && !/image|tts|audio|embed|live|vision|robotics|computer/i.test(m.name))
    .map((m: any) => ({ name: String(m.name).replace(/^models\//, ''), displayName: m.displayName ?? m.name }));
}

function version(name: string): number {
  const m = name.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

/** Newest "flash" model that is not a preview/experimental build, else newest flash, else first. */
export function pickDefaultModel(models: ModelInfo[]): string {
  const flash = models.filter(m => /flash/i.test(m.name));
  const stable = flash.filter(m => !/preview|exp|lite/i.test(m.name));
  const pool = stable.length ? stable : flash.length ? flash : models;
  return [...pool].sort((a, b) => version(b.name) - version(a.name))[0]?.name ?? '';
}

export interface Turn { role: 'user' | 'model'; text: string }

export interface PartnerReply {
  ar: string;
  tr: string;
  en: string;
  heard?: string;
  tip?: string;
  suggest?: string;
}

export const SCENARIOS = [
  { id: 'cafe', title: 'Ordering karak', setup: 'You are a cafeteria worker in Dubai. He wants to order a drink and snack, then pay.' },
  { id: 'taxi', title: 'Taxi ride', setup: 'You are a taxi driver in Dubai. Ask where he is going, chat about traffic, and he gives directions.' },
  { id: 'colleague', title: 'Colleague small talk', setup: 'You are an Emirati colleague at the office. Greet him, ask how he is, chat about work and the weekend.' },
  { id: 'souk', title: 'Bargaining at the souk', setup: 'You are a shopkeeper in the souk. He asks prices and bargains; you start high and give a small discount.' },
  { id: 'meet', title: 'Meeting someone new', setup: 'You meet him at a business event. Exchange names, where you are from, and what work you do.' },
  { id: 'free', title: 'Free chat', setup: 'You are a friendly Emirati neighbour. Chat about anything simple he brings up.' }
];

export function systemPrompt(setup: string, knownWords: string[]): string {
  return [
    'You are a friendly Emirati Arabic conversation partner for Pranjal, an English speaker from India who lives in Dubai and is a beginner.',
    'He is learning SPOKEN Gulf/Emirati Arabic by ear and cannot read Arabic script.',
    `Role-play: ${setup}`,
    'Rules:',
    '- Speak only Gulf/Emirati dialect (e.g. shlonak, shu, wain, abi, zain, wayid, al7een, baachir, hni, mub). Never Modern Standard, Egyptian or Levantine forms.',
    '- One short sentence per turn, at most about 10 words, common everyday words. Ask him simple questions so he has to answer.',
    `- He already knows words like: ${knownWords.slice(0, 80).join(', ') || 'basic greetings'}.`,
    'Spelling system for Latin letters: 3 = ع, 7 = ح, kh = خ, gh = غ, g = ق (as Gulf speakers say it), ch where Emiratis say ch, \' = ء, aa/ee/oo for long vowels. Plain lowercase otherwise.',
    'He may write in Latin letters, in English, or in Arabic script produced by speech recognition (which is often wrong; guess what he meant).',
    'Always answer with JSON only, with these keys:',
    '"ar": your line in Arabic script, spelled the way it is pronounced in Emirati dialect;',
    '"tr": the same line in Latin letters using the spelling system;',
    '"en": a natural English translation;',
    '"heard": your best Latin-letter spelling of what he just said (empty string on the first turn);',
    '"tip": one short English coaching note on his last message: a correction or a more natural Gulf way to say it, or brief praise (max 20 words; empty on the first turn);',
    '"suggest": one short Latin-letter reply he could say next.',
    'Stay in character except inside "tip".'
  ].join('\n');
}

export async function partnerTurn(key: string, model: string, system: string, history: Turn[]): Promise<PartnerReply> {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: (history.length ? history : [{ role: 'user', text: '(Start the conversation.)' }]).map(t => ({ role: t.role, parts: [{ text: t.text }] })),
    generationConfig: { responseMimeType: 'application/json', temperature: 0.8, maxOutputTokens: 400 }
  };
  const r = await fetch(`${API}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body)
  });
  if (r.status === 429) throw new Error("You've hit today's free limit for this model. Try again later or pick another model in Settings.");
  if (!r.ok) throw new Error(`Google returned an error (${r.status}). Check your key and model in Settings.`);
  const j = await r.json();
  const text: string = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? '';
  const clean = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try {
    const parsed = JSON.parse(clean);
    return { ar: parsed.ar ?? '', tr: parsed.tr ?? '', en: parsed.en ?? '', heard: parsed.heard ?? '', tip: parsed.tip ?? '', suggest: parsed.suggest ?? '' };
  } catch {
    throw new Error('The reply came back in an unexpected format. Send your message again.');
  }
}
