import json, re, sys, os
d = json.load(open(sys.argv[1])); outdir = sys.argv[2]
SECTION = {'SUSHI BURGER':'sushi-burger','poke':'poke','NIGIRI & GUNKAN':'nigiri-gunkan','HOSOMAKI':'hosomaki',
 'ROLLI':'rolli','CEPTI ROLLI':'cepti-rolli','TEMPURA':'tempura','DOUBLE MIX 1+1':'double-mix','SPECIAL':'special',
 'SUSHI SETI':'sushi-seti','DZĒRIENI':'dzerieni','Snacks':'snacks','SOUSES':'sauces'}
TAGS = {'93.RED HEAT MIX':['hot'],'CHICKEN COMBO 32GAB':['warm'],'CRAB  32GAB':['warm'],'HOTTO SET 48GAB':['warm','featured']}
CYR = re.compile('[Ѐ-ӿ]')
def norm(s): return re.sub(r'\s+',' ', s.replace('\xa0',' ')).strip()
def title(s):
    out=[]
    for w in s.split(' '):
        if re.match(r'^\d', w) or w in ('1+1','16+16'): out.append(w)
        else: out.append('-'.join(p[:1].upper()+p[1:].lower() for p in w.split('-')))
    return ' '.join(out)
def slug(s):
    t = s.lower()
    for a,b in zip('āčēģīķļņšūž','acegiklnsuz'): t=t.replace(a,b)
    t = t.replace('+','-plus-')
    return re.sub(r'-+','-',re.sub(r'[^a-z0-9]+','-',t)).strip('-')
def blocks(desc):
    lines=[norm(l) for l in desc.split('\n')]
    lines=[l for l in lines if l]
    bl=[]
    for l in lines:
        c = bool(CYR.search(l))
        if bl and bl[-1][0]==c: bl[-1][1].append(l)
        else: bl.append([c,[l]])
    return bl
files={}
for sec in d:
    cat = SECTION.get(sec['section'])
    if not cat: continue
    for it in sec['items']:
        raw = it['name']; desc = it['description'] or ''
        p = {}
        n = norm(raw)
        if n.startswith('Copy of '): n = n[len('Copy of '):]   # Wix duplication artefact
        m = re.match(r'^(\d+)\s*\.?\s*(.*)$', n)
        if m: p['number']=m.group(1); n=m.group(2)
        n = n.rstrip('.').strip()
        pm = re.search(r'\s*(\d+)\s*(gab|pcs)\.?\s*(\+\s*souse)?$', n, re.I)
        if pm:
            p['pieces']=int(pm.group(1)); n=n[:pm.start()].strip()
            if pm.group(3): p.setdefault('tags',[]).append('includes-sauce')
        sm = re.search(r'\s*\+\s*souse$', n, re.I)
        if sm: n=n[:sm.start()].strip(); p.setdefault('tags',[]).append('includes-sauce')
        vm = re.search(r'\s*(\d+(?:\.\d+)?)\s*l$', n)
        if vm: p['volume']=int(round(float(vm.group(1))*1000)); n=n[:vm.start()].strip()
        wm = re.search(r'\s*(\d+)\s*g$', n)
        if wm and cat=='snacks': p['weight']=int(wm.group(1)); n=n[:wm.start()].strip()
        n = n.rstrip('.').strip()
        if n == 'OKI DOKI. 16+16': pass
        name = title(n.replace('OKI DOKI. 16+16','OKI DOKI 16+16'))
        name = name.replace('Bbq ','BBQ ')
        bl = blocks(desc)
        has_cyr = any(b[0] for b in bl)
        if has_cyr:
            texts=[' '.join(b[1]) if raw!='OKI DOKI. 16+16' else '\n'.join(b[1]) for b in bl]
            kind = 'description' if (cat=='snacks' or raw.startswith('84.')) else 'ingredients'
            if len(bl)>=3:
                p[kind]={'lv':texts[0],'ru':texts[1],'en':texts[2]}
            if len(bl)==5:
                p['description']={'ru':texts[3],'en':texts[4]}
            assert len(bl) in (3,5), (raw, len(bl))
        elif desc.strip():
            lines=[norm(l) for l in desc.split('\n') if norm(l)]
            if cat=='snacks':   # "6 gab+ souse"
                m2=re.match(r'^(\d+)\s*gab\s*\+\s*souse$', lines[0], re.I)
                assert m2, raw
                p['pieces']=int(m2.group(1)); p.setdefault('tags',[]).append('includes-sauce')
            elif cat=='dzerieni':
                p['translations']={'lv':{'name':lines[0]}}
            else:
                if len(lines)==1 and ',' in lines[0]:
                    lines=[norm(x) for x in lines[0].split(',') if norm(x)]
                expanded=[]
                for l in lines:
                    if ' Tomashi maki - ' in l:
                        a,b=l.split(' Tomashi maki - '); expanded += [a, 'Tomashi maki - '+b]
                    else: expanded.append(l)
                merged=[]
                for l in expanded:
                    if merged and re.search(r'\d+\s*gab$', merged[-1], re.I) and not re.search(r'\d+\s*gab$', l, re.I):
                        merged[-1]=merged[-1]+' — '+l
                    else: merged.append(l)
                p['components']=merged
        if raw=='OKI DOKI. 16+16': p['pieces']=32
        if raw in TAGS: p.setdefault('tags',[]).extend(TAGS[raw])
        price = round(float(it['price'].replace('€',''))*100)
        base = slug(name)
        if cat=='snacks' and 'weight' in p: base=f"{base}-{p['weight']}g"
        elif cat=='snacks' and 'Nuggets' in name: base=f"{base}-{p['pieces']}"
        obj={'id':base,'slug':base,'name':name,'sourceName':raw.strip(), **({'number':p['number']} if 'number' in p else {}), 'category':cat}
        for k in ('description','ingredients','components'):
            if k in p: obj[k]=p[k]
        obj['price']=price
        for k in ('pieces','weight','volume'):
            if k in p: obj[k]=p[k]
        obj['available']=True
        if 'tags' in p: obj['tags']=sorted(set(p['tags']), key=p['tags'].index)
        if 'translations' in p: obj['translations']=p['translations']
        files.setdefault(cat,[]).append(obj)
ids=[o['id'] for v in files.values() for o in v]
dupes={i for i in ids if ids.count(i)>1}
assert not dupes, dupes
def camel(c): 
    parts=c.split('-'); return parts[0]+''.join(x.title() for x in parts[1:])
os.makedirs(outdir, exist_ok=True)
for cat, items in files.items():
    var = camel(cat)+'Products'
    body = json.dumps(items, ensure_ascii=False, indent=2)
    with open(os.path.join(outdir, f'{cat}.ts'),'w') as f:
        f.write("// Source: https://www.sushiriga.lv/menu (retrieved 2026-10-08). Text is kept verbatim —\n"
                "// see docs/MENU_DATA.md before editing. Prices are in euro cents.\n"
                "import type { Product } from '@/types';\n\n"
                f"export const {var}: Product[] = {body};\n")
print({k:len(v) for k,v in files.items()}, sum(len(v) for v in files.values()))
