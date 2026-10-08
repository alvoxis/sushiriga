import re, json, html, sys
s = open(sys.argv[1]).read()
def text(fragment):
    fragment = re.sub(r'<br\s*/?>', '\n', fragment)
    t = re.sub(r'<[^>]+>', '', fragment)
    return html.unescape(t).replace('​','').strip()
# split into sections
secs = re.split(r'data-hook="section.container"', s)[1:]
out = []
for sec in secs:
    m = re.search(r'data-hook="section.name"[^>]*>(.*?)</', sec, re.S)
    name = text(m.group(1)) if m else None
    items = []
    for it in re.split(r'data-hook="item.root"', sec)[1:]:
        def grab(hook):
            mm = re.search(r'data-hook="%s"[^>]*>(.*?)</(?:p|span|div|h3|h2)>' % re.escape(hook), it, re.S)
            return text(mm.group(1)) if mm else None
        labels = [text(x) for x in re.findall(r'data-hook="item.label"[^>]*>(.*?)</(?:span|div|p)>', it, re.S)]
        items.append(dict(name=grab('item.name'), description=grab('item.description'), price=grab('item.price'), labels=[l for l in labels if l]))
    out.append(dict(section=name, items=items))
json.dump(out, open(sys.argv[2],'w'), ensure_ascii=False, indent=1)
print([ (o['section'], len(o['items'])) for o in out])
