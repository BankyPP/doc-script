import numpy as np, json, sys
from PIL import Image, ImageDraw
g = np.asarray(Image.open(sys.argv[1]).convert('L')).astype(float)
H, W = g.shape
L0 = [311, 412, 512, 611, 710, 809, 908, 1006, 1105, 1204, 1303, 1402, 1500, 1599, 1697, 1796, 1896, 1995, 2096, 2196, 2296, 2396, 2497, 2597, 2697, 2797, 2897, 3000, 3103, 3208, 3313]
X0 = 600; STEP = 8; WIN = 8
def track(direction):
    ys = {X0: list(map(float, L0))}
    cur = list(map(float, L0))
    x = X0
    while 0 <= x + direction * STEP and x + direction * STEP + WIN < W:
        x += direction * STEP
        col = g[:, x:x + WIN].mean(1)
        nxt = []
        for y in cur:
            lo, hi = int(y) - 6, int(y) + 7
            seg = col[lo:hi]
            k = int(np.argmin(seg)); v = seg[k]
            # a real line: much darker than the band around it
            ctx = np.median(col[max(0, lo - 20):hi + 20])
            if v < 140 and ctx - v > 35: nxt.append(0.6 * (lo + k) + 0.4 * y)
            else: nxt.append(y)
        cur = nxt; ys[x] = list(cur)
    return ys
a = track(1); b = track(-1); a.update(b)
xs = sorted(a)
M = np.array([a[x] for x in xs])  # (nx, 31)
# smooth along x
from scipy.ndimage import median_filter, uniform_filter1d
M = uniform_filter1d(median_filter(M, size=(9, 1)), 7, axis=0)
json.dump({'xs': xs, 'ys': M.tolist()}, open(sys.argv[2], 'w'))
im = Image.open(sys.argv[1]).convert('RGB'); d = ImageDraw.Draw(im)
for j in range(M.shape[1]):
    d.line([(x + WIN / 2, M[i, j]) for i, x in enumerate(xs)], fill=(255, 0, 0), width=3)
im.resize((W // 3, H // 3)).save(sys.argv[3])
print(len(xs), M[0, [10, 21]], M[-1, [10, 21]])
