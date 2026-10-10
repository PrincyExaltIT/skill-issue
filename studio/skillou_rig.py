"""Build Skillou's cutout rig from the ChatGPT pieces.

    python studio/skillou_rig.py

Inputs (studio/assets/skillou/, generated with ChatGPT): skillou-rig.png (the parts sheet) and skillou-cup1.png
(the cup held by one paw, left and right). Output: studio/assets/skillou/rig/<part>.png and rig.json.
Coordinates are in the parts sheet's pixels (every piece of one sheet shares a scale), on a 1000 x 1060 canvas,
then everything is scaled by OUT_SCALE. The layout was set by eye against skillou-flat.png, the reference pose.
"""
import json
import pathlib

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

HERE = pathlib.Path(__file__).resolve().parent / 'assets' / 'skillou'
OUT = HERE / 'rig'
OUT_SCALE = 0.5
CANVAS = (1000, 1060)
GLASSES_SCALE = 1.07
WAVE_SCALE = 0.34

# piece name -> top-left corner of its bounding box on the sheet (rows: head/tail/glasses, eyes and mouths, hands, body)
SHEET = {(48, 26): 'head', (87, 1014): 'tail', (209, 553): 'glasses', (474, 944): 'mouth2', (487, 56): 'eyeL',
         (487, 181): 'eyeR', (511, 310): 'happyL', (511, 444): 'happyR', (497, 606): 'mouth0', (489, 782): 'mouth1',
         (487, 1143): 'mouthO', (599, 68): 'cup', (628, 620): 'wave', (690, 896): 'point', (884, 301): 'body'}

# where each piece sits on the canvas (top-left, sheet pixels), and its pivot (relative to the piece, 0..1)
LAYOUT = {
    'tail': ((680, 560), (0.12, 0.92)),
    'body': ((176, 693), (0.5, 1.0)),
    'head': ((234, 330), (0.5, 0.92)),
    'eyeL': ((343, 541), (0.5, 0.5)),
    'eyeR': ((573, 541), (0.5, 0.5)),
    'happyL': ((336, 566), (0.5, 0.5)),
    'happyR': ((566, 566), (0.5, 0.5)),
    'mouth0': ((455, 612), (0.5, 0.0)),
    'mouth1': ((457, 610), (0.5, 0.0)),
    'mouth2': ((448, 606), (0.5, 0.0)),
    'mouthO': ((487, 612), (0.5, 0.0)),
    'glasses': ((250, 506), (0.5, 0.5)),     # frame centred on the nose, blush just under the lenses (measured on the reference)
    'cup': ((270, 640), (0.5, 0.6)),
    'cupR': ((396, 640), (0.36, 0.6)),
    'wave': ((116, 525), (0.8, 0.82)),          # shoulder stub on the body's upper left, paw beside the cheek
    'pointL': ((-12, 610), (0.95, 0.55)),
}
ORDER = ['tail', 'body', 'head', 'eyeL', 'eyeR', 'happyL', 'happyR', 'mouth0', 'mouth1', 'mouth2', 'mouthO', 'glasses',
         'wave', 'pointL', 'cup', 'cupR']


def pieces(path: pathlib.Path) -> list[tuple[tuple[int, int], Image.Image]]:
    A = np.asarray(Image.open(path).convert('RGBA'))
    lab, _ = ndimage.label(ndimage.binary_dilation(A[..., 3] > 38, iterations=3))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        m = lab[sl] == i
        if m.sum() < 300:
            continue
        crop = A[sl].copy()
        crop[..., 3] = (crop[..., 3] * m).astype(np.uint8)
        out.append(((sl[0].start, sl[1].start), Image.fromarray(crop, 'RGBA')))
    return out


def seamless_head(parts: dict) -> None:
    """Head and body are one blob: drop the head's outline wherever it lies over the body's inside."""
    head = np.asarray(parts['head']).astype(np.float64)
    body = np.asarray(parts['body']).astype(np.float64)
    (hx, hy), _ = LAYOUT['head']
    (bx, by), _ = LAYOUT['body']
    inside = ndimage.binary_erosion(body[..., 3] > 230, iterations=14)
    ys, xs = np.nonzero(head[..., 3] > 0)
    u, v = xs + hx - bx, ys + hy - by
    ok = (u >= 0) & (v >= 0) & (u < body.shape[1]) & (v < body.shape[0])
    ys, xs, u, v = ys[ok], xs[ok], u[ok], v[ok]
    over = inside[v, u]
    lum = (0.3 * head[ys, xs, 0] + 0.59 * head[ys, xs, 1] + 0.11 * head[ys, xs, 2]) / 255
    dark = np.clip((0.82 - lum) / 0.3, 0, 1)          # 1 on the navy outline, 0 on the fur
    a = head[..., 3].copy()
    a[ys, xs] = np.where(over, a[ys, xs] * (1 - dark), a[ys, xs])
    head[..., 3] = a
    parts['head'] = Image.fromarray(head.astype(np.uint8), 'RGBA')


def seamless_arm(parts: dict, name: str) -> None:
    """An arm grows out of the body: drop its outline over the body's inside, but keep it where it crosses the head."""
    arm = np.asarray(parts[name]).astype(np.float64)
    body, head = np.asarray(parts['body']), np.asarray(parts['head'])
    (ax, ay), _ = LAYOUT[name]
    (bx, by), _ = LAYOUT['body']
    (hx, hy), _ = LAYOUT['head']
    inside = ndimage.binary_erosion(body[..., 3] > 230, iterations=10)
    ys, xs = np.nonzero(arm[..., 3] > 0)
    X, Y = xs + ax, ys + ay
    u, v = X - bx, Y - by
    ok = (u >= 0) & (v >= 0) & (u < body.shape[1]) & (v < body.shape[0])
    over = np.zeros_like(ok)
    over[ok] = inside[v[ok], u[ok]]
    hu, hv = X - hx, Y - hy
    inh = (hu >= 0) & (hv >= 0) & (hu < head.shape[1]) & (hv < head.shape[0])
    covered = np.zeros_like(inh)
    covered[inh] = head[hv[inh], hu[inh], 3] > 128
    over &= ~covered
    lum = (0.3 * arm[ys, xs, 0] + 0.59 * arm[ys, xs, 1] + 0.11 * arm[ys, xs, 2]) / 255
    dark = np.clip((0.82 - lum) / 0.3, 0, 1)
    a = arm[..., 3]
    a[ys, xs] = np.where(over, a[ys, xs] * (1 - dark), a[ys, xs])
    parts[name] = Image.fromarray(arm.astype(np.uint8), 'RGBA')


def pink(x: np.ndarray) -> np.ndarray:
    r, g, b, a = (x[..., i].astype(int) for i in range(4))
    return (a > 180) & (r > 200) & (g > 80) & (g < 200) & (b > 120) & (r - g > 50)


def single_nose(parts: dict) -> None:
    """Every mouth piece came with its own nose: align it on the head's nose, then erase it (the head keeps one)."""
    head = np.asarray(parts['head'])
    (hx, hy), _ = LAYOUT['head']
    m = pink(head)
    m[: head.shape[0] // 3] = False                    # ears are pink too: look at the face only
    m[int(head.shape[0] * 0.8):] = False
    m[:, : int(head.shape[1] * 0.35)] = False           # and away from the blush
    m[:, int(head.shape[1] * 0.65):] = False
    ny, nx = np.nonzero(m)
    nose = (hx + nx.mean(), hy + ny.mean())
    for name in ('mouth0', 'mouth1', 'mouth2', 'mouthO'):
        piece = np.asarray(parts[name]).copy()
        pm = pink(piece)
        pm[int(piece.shape[0] * 0.45):] = False         # the nose sits on top; the tongue is lower
        lab, n = ndimage.label(pm)
        if not n:
            continue
        top = min(range(1, n + 1), key=lambda i: np.nonzero(lab == i)[0].mean())
        py_, px_ = np.nonzero(lab == top)
        LAYOUT[name] = ((round(nose[0] - px_.mean()), round(nose[1] - py_.mean())), LAYOUT[name][1])
        erase = ndimage.binary_dilation(lab == top, iterations=6)
        erase[py_.max() + 3:] = False                  # keep the lip line right under the nose
        piece[..., 3][erase] = 0
        parts[name] = Image.fromarray(piece, 'RGBA')


def main() -> None:
    OUT.mkdir(exist_ok=True)
    parts = {}
    for key, im in pieces(HERE / 'skillou-rig.png'):
        near = min(SHEET, key=lambda k: abs(k[0] - key[0]) + abs(k[1] - key[1]))
        if abs(near[0] - key[0]) + abs(near[1] - key[1]) < 12:
            parts[SHEET[near]] = im
    parts['pointL'] = ImageOps.mirror(parts.pop('point'))
    # the sheet's waving arm read as a tail: a dedicated arm (skillou-wave2.png) replaces it
    arm = pieces(HERE / 'skillou-wave2.png')[0][1]
    parts['wave'] = arm.resize((round(arm.width * WAVE_SCALE), round(arm.height * WAVE_SCALE)), Image.LANCZOS)
    g = parts['glasses']                          # the sheet drew them 7 % narrower than the reference pose
    parts['glasses'] = g.resize((round(g.width * GLASSES_SCALE), round(g.height * GLASSES_SCALE)), Image.LANCZOS)
    # one-paw cups: scaled so the cup is as tall as on the parts sheet; the right-hand one is used (the left paw waves)
    cups = sorted(pieces(HERE / 'skillou-cup1.png'), key=lambda p: p[0][1])
    k = parts['cup'].height / cups[1][1].height
    parts['cupR'] = cups[1][1].resize((round(cups[1][1].width * k), round(cups[1][1].height * k)), Image.LANCZOS)
    seamless_head(parts)
    seamless_arm(parts, 'wave')
    single_nose(parts)
    rig = {'canvas': [round(CANVAS[0] * OUT_SCALE), round(CANVAS[1] * OUT_SCALE)], 'parts': {}}
    for name in ORDER:
        im = parts[name]
        w, h = round(im.width * OUT_SCALE), round(im.height * OUT_SCALE)
        im.resize((w, h), Image.LANCZOS).save(OUT / f'{name}.png', optimize=True)
        (x, y), (px, py) = LAYOUT[name]
        rig['parts'][name] = {'x': round(x * OUT_SCALE), 'y': round(y * OUT_SCALE), 'w': w, 'h': h, 'px': px, 'py': py}
    (OUT / 'rig.json').write_text(json.dumps(rig, indent=1) + '\n', encoding='utf-8', newline='\n')
    print('rig:', ', '.join(f'{n} {p["w"]}x{p["h"]}' for n, p in rig['parts'].items()))


if __name__ == '__main__':
    main()
