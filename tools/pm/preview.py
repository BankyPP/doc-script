import json, sys, os
d, tid, out = sys.argv[1], sys.argv[2], sys.argv[3]
T = json.load(open(os.path.join(d, tid + '.json')))
h = ['<html><head><meta charset=utf-8><meta name=viewport content="width=device-width"><style>',
     'body{font-family:Sarabun,Helvetica,sans-serif;max-width:760px;margin:0 auto;padding:12px;font-size:15px;line-height:1.5;color:#222}',
     '.g{color:#14653a}h2{font-size:18px;border-top:1px solid #ccc;padding-top:8px}h3{font-size:15px;margin:10px 0 2px}',
     'p{margin:2px 0;padding-left:calc(var(--i)*1em)}p.b{padding-left:calc(var(--i)*1em + 1em);text-indent:-1em}p.b:before{content:"• "}',
     'small{font-size:.78em;color:#667}img{max-width:100%;display:block;margin:8px 0;border:1px solid #eee}.gap{display:inline-block;width:1.2em}</style></head><body>',
     '<h1>' + T['t'] + '</h1>']
for b in T['b']:
    if b[0] == 'h2': h.append('<h2>' + b[1] + '</h2>')
    elif b[0] == 'h3': h.append('<h3>' + b[1] + '</h3>')
    elif b[0] == 'p': h.append('<p class="%s" style="--i:%s">%s</p>' % ('b' if b[3] else '', b[2], b[1]))
    else: h.append('<img src="img/%s" style="width:%d%%">' % (b[1], min(100, b[5] * 100)))
open(out, 'w').write('\n'.join(h))
