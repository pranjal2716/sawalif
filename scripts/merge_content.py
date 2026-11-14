"""Merge modules 5-12 and their dialogues into public/content/course.json."""
import json, os, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from content_m5_m8 import M5, M6, M7, M8
from content_m9_m12 import M9, M10, M11, M12
from content_dialogues import DIALOGUES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'public', 'content', 'course.json')
course = json.load(open(P, encoding='utf-8'))
data = {'m5': M5, 'm6': M6, 'm7': M7, 'm8': M8, 'm9': M9, 'm10': M10, 'm11': M11, 'm12': M12}
for m in course['modules']:
    if m['id'] in data:
        items = []
        for i, (en, tr, ar, note) in enumerate(data[m['id']], 1):
            it = {'id': f"{m['id']}-{i:02d}", 'en': en, 'tr': tr, 'ar': ar}
            if note:
                it['note'] = note
            items.append(it)
        m['items'] = items
keep = [d for d in course['dialogues'] if d['id'] in {'d1', 'd2', 'd3', 'd4', 'd5', 'd6'}]
for d in DIALOGUES:
    keep.append({
        'id': d['id'], 'module': d['module'], 'title': d['title'], 'setting': d['setting'],
        'lines': [{'who': w, 'voice': v, 'tr': tr, 'ar': ar, 'en': en} for (w, v, tr, ar, en) in d['lines']],
        'questions': [{'q': q, 'options': o, 'answer': a} for (q, o, a) in d['questions']],
    })
course['dialogues'] = keep
course['version'] = 2

# checks
items = [i for m in course['modules'] for i in m['items']]
trs = collections.Counter(i['tr'] for i in items)
dups = [k for k, v in trs.items() if v > 1]
ids = collections.Counter(i['id'] for i in items)
assert not [k for k, v in ids.items() if v > 1], 'duplicate ids'
for d in course['dialogues']:
    for q in d['questions']:
        assert 0 <= q['answer'] < len(q['options']), d['id']
    for l in d['lines']:
        assert l['voice'] in ('f', 'm') and l['tr'] and l['ar'] and l['en'], d['id']
assert all(i['ar'] and i['tr'] and i['en'] for i in items)
json.dump(course, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('modules:', [(m['id'], len(m['items'])) for m in course['modules']])
print('total items:', len(items), 'dialogues:', len(course['dialogues']), 'lines:', sum(len(d['lines']) for d in course['dialogues']))
print('duplicate spellings:', dups)
