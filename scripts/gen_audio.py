"""Generate MP3s for every phrase and dialogue line with Microsoft's UAE neural voices (edge-tts).

Runs in GitHub Actions. Only new or changed text is regenerated; public/audio/index.json lists
what exists so the app can fall back to the browser's own voice for anything missing.
"""
import asyncio, hashlib, json, os, sys

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COURSE = os.path.join(ROOT, 'public', 'content', 'course.json')
OUT = os.path.join(ROOT, 'public', 'audio')
INDEX = os.path.join(OUT, 'index.json')
VOICES = {'f': 'ar-AE-FatimaNeural', 'm': 'ar-AE-HamdanNeural'}
RATE = '-8%'


def jobs():
    course = json.load(open(COURSE, encoding='utf-8'))
    for m in course['modules']:
        for it in m['items']:
            text = it['ar'].replace('...', '').strip()
            for g, v in VOICES.items():
                yield f"{it['id']}-{g}", text, v
    for d in course['dialogues']:
        for i, line in enumerate(d['lines']):
            yield f"{d['id']}-{i}", line['ar'], VOICES[line['voice']]


async def main():
    os.makedirs(OUT, exist_ok=True)
    index = {'files': {}}
    if os.path.exists(INDEX):
        index = json.load(open(INDEX, encoding='utf-8'))
    files = index.setdefault('files', {})
    todo = []
    for key, text, voice in jobs():
        h = hashlib.sha1(f'{voice}|{RATE}|{text}'.encode()).hexdigest()[:12]
        path = os.path.join(OUT, f'{key}.mp3')
        if files.get(key) == h and os.path.exists(path):
            continue
        todo.append((key, text, voice, h, path))
    print(f'{len(todo)} clips to generate')
    sem = asyncio.Semaphore(4)
    failed = 0

    async def one(key, text, voice, h, path):
        nonlocal failed
        async with sem:
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(text, voice, rate=RATE).save(path)
                    if os.path.getsize(path) > 500:
                        files[key] = h
                        return
                except Exception as e:  # noqa: BLE001
                    print(f'{key}: attempt {attempt + 1} failed: {e}', file=sys.stderr)
                await asyncio.sleep(2 * (attempt + 1))
            failed += 1
            files.pop(key, None)
            if os.path.exists(path):
                os.remove(path)

    await asyncio.gather(*(one(*j) for j in todo))
    # drop entries whose files are gone
    for k in list(files):
        if not os.path.exists(os.path.join(OUT, f'{k}.mp3')):
            files.pop(k)
    json.dump(index, open(INDEX, 'w', encoding='utf-8'), indent=0, sort_keys=True)
    print(f'done: {len(files)} clips available, {failed} failed')


if __name__ == '__main__':
    asyncio.run(main())
