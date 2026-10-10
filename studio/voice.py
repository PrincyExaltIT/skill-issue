"""Voice-over: cut the synthesized batches back into segments, fit each video's scenes around them, time the captions.

    python studio/voice.py split 1        find the segment boundaries in audio/batch-1.mp3 -> audio/batch-1.split.json
                                          (check the printout once per new batch: one line per segment)
    python studio/voice.py split patch-1  same for audio/patch-1.mp3

The batches come from narration.json: each was synthesized in one call, segments separated by a blank line.
A patch re-records only the segments whose text was corrected after the batch ("patches" in narration.json, a list
of [video, index] per call): it costs a fraction of a batch, and clip() takes a segment from the newest file that has it.
The cut points are pauses found by ffmpeg's silencedetect, chosen so that every segment speaks at a plausible rate.
render.py and mix.py import the rest: clip() (the tightened audio of one segment), fit() (scene clock -> output
clock), captions() (word timings for the burned-in subtitles).
"""
import json
import math
import pathlib
import re
import subprocess
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent
AUDIO = ROOT / 'audio'
NARRATION = json.loads((ROOT / 'narration.json').read_text(encoding='utf-8'))
SR = 48_000
BPM = 122
BEAT = 60 / BPM
BAR = 4 * BEAT
MAX_PAUSE = 0.30     # longest pause kept inside a segment (s)
AFTER_VOICE = 0.35   # the scene holds this long after the last word before the next cut (s)


def spoken(seg: dict) -> str:
    return seg.get('say', seg['text'])


# ── split ────────────────────────────────────────────────────────────────────

def sources() -> list[tuple[str, list[tuple[str, int]]]]:
    """The voice files, oldest first: batch-1, batch-2… then patch-1, patch-2…"""
    out = [(f'batch-{i}', [(v, k) for v in b for k in range(len(NARRATION['videos'][v]))])
           for i, b in enumerate(NARRATION['batches'], 1)]
    return out + [(f'patch-{i}', [(v, k) for v, k in p]) for i, p in enumerate(NARRATION.get('patches', []), 1)]


def batch_segments(name: str) -> list[tuple[str, int, dict]]:
    return [(v, k, NARRATION['videos'][v][k]) for v, k in dict(sources())[name]]


def silences(mp3: pathlib.Path, noise: str = '-38dB', d: float = 0.18) -> tuple[list[tuple[float, float]], float]:
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(mp3), '-af', f'silencedetect=noise={noise}:d={d}',
                          '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8').stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(mp3)],
                               capture_output=True, text=True).stdout)
    return list(zip(starts, ends)), dur


def pauses_in(text: str) -> float:
    body = text.strip()[:-1]
    return len(re.findall(r'[.:;!?…]\s', body)) + 0.6 * len(re.findall(r',\s', body))


def split(name: str) -> None:
    mp3 = AUDIO / f'{name}.mp3'
    segs = batch_segments(name)
    sil, total = silences(mp3)
    sil = [s for s in sil if s[0] > 0.05 and s[1] < total - 0.05]
    # a breath or a click after the last pause is not a word: end the batch at that pause
    while sil and total - sil[-1][1] < 0.4:
        total = sil.pop()[0]
    texts = [spoken(s) for _, _, s in segs]
    chars = [len(t) for t in texts]
    inner = [pauses_in(t) for t in texts]
    n, m = len(segs), len(sil)
    speech = total - sum(b - a for a, b in sil)
    rate = sum(chars) / max(1.0, speech)

    def cost(k: int, start: float, end: float) -> float:
        e = chars[k] / rate + inner[k] * 0.3
        return ((end - start) - e) ** 2 / e

    if n == 1:
        picks = []
    else:
        INF = float('inf')
        best = [[INF] * m for _ in range(n - 1)]
        back = [[-1] * m for _ in range(n - 1)]
        for j in range(m):
            best[0][j] = cost(0, 0.0, sil[j][0]) - 2.0 * (sil[j][1] - sil[j][0])
        for k in range(1, n - 1):
            for j in range(m):
                for jp in range(j):
                    if best[k - 1][jp] < INF:
                        c = best[k - 1][jp] + cost(k, sil[jp][1], sil[j][0]) - 2.0 * (sil[j][1] - sil[j][0])
                        if c < best[k][j]:
                            best[k][j], back[k][j] = c, jp
        _, j = min((best[n - 2][j] + cost(n - 1, sil[j][1], total), j) for j in range(m) if best[n - 2][j] < INF)
        picks = [j]
        for k in range(n - 2, 0, -1):
            j = back[k][j]
            picks.append(j)
        picks.reverse()
    bounds = [0.0] + [x for j in picks for x in sil[j]] + [total]
    result = []
    for k, (video, idx, _) in enumerate(segs):
        start, end = bounds[2 * k], bounds[2 * k + 1]
        inside = [(round(a - start, 3), round(b - start, 3)) for a, b in sil if start < a and b < end]
        result.append({'video': video, 'index': idx, 'start': round(start, 3), 'end': round(end, 3), 'pauses': inside})
        print(f'{video:14} #{idx}  {start:6.2f} → {end:6.2f}  ({end - start:5.2f} s, {chars[k] / (end - start):4.1f} car/s)  {texts[k][:60]}…')
    (AUDIO / f'{name}.split.json').write_text(json.dumps(result, indent=1, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')


# ── clips ────────────────────────────────────────────────────────────────────

_decoded: dict[pathlib.Path, np.ndarray] = {}


def decode(mp3: pathlib.Path) -> np.ndarray:
    if mp3 not in _decoded:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(mp3), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
        _decoded[mp3] = np.frombuffer(raw, dtype='<f4').astype(np.float64)
    return _decoded[mp3]


def clip(video: str, index: int) -> dict:
    """One segment's audio with long pauses and breaths trimmed, and where its words are (clip time)."""
    for name, segs in reversed(sources()):
        if (video, index) not in segs:
            continue
        row = next(r for r in json.loads((AUDIO / f'{name}.split.json').read_text(encoding='utf-8'))
                   if r['video'] == video and r['index'] == index)
        x = decode(AUDIO / f'{name}.mp3')
        seg = NARRATION['videos'][video][index]
        # speech chunks between the pauses (segment time), dropping blips shorter than 0.14 s (breaths)
        edges = [0.0] + [t for p in row['pauses'] for t in p] + [row['end'] - row['start']]
        chunks = [(edges[k], edges[k + 1]) for k in range(0, len(edges), 2)]
        chunks = [c for c in chunks if c[1] - c[0] >= 0.14]
        # trim the silence at both ends of the first and last chunk (the pause list misses edge silence)
        a0 = int(row['start'] * SR)
        seg_audio = x[a0:int(row['end'] * SR)]
        env = np.sqrt(np.convolve(seg_audio ** 2, np.ones(480) / 480, mode='same'))
        loud = np.nonzero(env > 10 ** (-40 / 20))[0]
        if len(loud):
            first, last = loud[0] / SR, loud[-1] / SR
            chunks[0] = (max(chunks[0][0], first - 0.02), chunks[0][1])
            chunks[-1] = (chunks[-1][0], min(chunks[-1][1], last + 0.05))
            chunks = [c for c in chunks if c[1] - c[0] >= 0.05]
        out, words_at = [], []
        t = 0.0
        fade = int(0.006 * SR)
        for k, (s, e) in enumerate(chunks):
            s2, e2 = max(0.0, s - 0.03), min(len(seg_audio) / SR, e + 0.06)
            piece = seg_audio[int(s2 * SR):int(e2 * SR)].copy()
            if len(piece) < 4 * fade:
                continue
            piece[:fade] *= np.linspace(0, 1, fade)
            piece[-fade:] *= np.linspace(1, 0, fade)
            if k:
                gap = min(MAX_PAUSE, max(0.12, s - chunks[k - 1][1]))
                out.append(np.zeros(int(gap * SR)))
                t += gap
            words_at.append((t + (s - s2), t + (s - s2) + (e - s)))
            out.append(piece)
            t += len(piece) / SR
        audio = np.concatenate(out)
        return {'video': video, 'index': index, 'at': seg['at'], 'text': seg['text'], 'audio': audio,
                'dur': len(audio) / SR, 'speech': words_at}
    raise KeyError(f'{video} has no voice batch')


def clips(video: str) -> list[dict]:
    if video not in NARRATION['videos']:
        return []
    return [clip(video, k) for k in range(len(NARRATION['videos'][video]))]


# ── fit: scene clock -> output clock ─────────────────────────────────────────

def fit(events: list[dict], scene_duration: float, cs: list[dict], drop_at: float | None = None) -> dict:
    """Fit every scene to its voice and snap the cuts to the beat.

    A scene keeps its entrances (sped up or slowed by at most 25 % so they spread over the voice), its hold grows or
    shrinks to the voice, and its exit fade plays at authored speed. Scenes without voice keep their authored timing.
    Returns knots [(out, scene)], the output start of every scene and of every clip, and the output duration.
    """
    scenes = sorted({(e['at'], e['until']) for e in events if e['scene']})
    if not scenes or scenes[0][0] > 0.01:
        scenes.insert(0, (0.0, None))
    knots, starts = [], []
    o = 0.0
    for j, (s, u) in enumerate(scenes):
        e_end = scenes[j + 1][0] if j + 1 < len(scenes) else scene_duration
        inside = [ev for ev in events if not ev['scene'] and not ev['cap'] and s <= ev['at'] < e_end]
        a = max([ev['at'] + ev['dur'] for ev in inside] or [s + 0.5])
        u = u if (u is not None and u >= a and u <= e_end) else e_end
        a = min(a, u)
        x = e_end - u
        voice = [c for c in cs if s <= c['at'] < e_end]
        if voice:
            c = voice[0]
            off = c['at'] - s
            need = off + sum(v['dur'] for v in voice) + 0.25 * (len(voice) - 1) + AFTER_VOICE
            k = min(1.25, max(0.8, (off + c['dur'] - 0.5) / max(0.5, a - s)))
            main = max(k * (a - s) + 0.5, need)
            t_clip = o + off
            for v in voice:
                v['out'] = round(t_clip, 3)
                t_clip += v['dur'] + 0.25
        else:
            k = 1.0
            main = u - s
        starts.append(round(o, 3))
        knots += [(o, s), (o + k * (a - s), a)]
        nxt = o + main + x
        if j + 1 < len(scenes):
            unit = BAR if (drop_at is not None and abs(scenes[j + 1][0] - drop_at) < 0.05) else BEAT
            nxt = math.ceil(nxt / unit - 1e-6) * unit
        knots += [(nxt - x, u), (nxt, e_end)]
        o = nxt
    clean = [knots[0]]
    for ko, ks in knots[1:]:
        if ko > clean[-1][0] + 1e-6 and ks >= clean[-1][1] - 1e-9:
            clean.append((round(ko, 4), ks))
    return {'knots': clean, 'starts': starts, 'duration': round(o, 3)}


def scene_time(knots: list, t: float) -> float:
    for (o0, s0), (o1, s1) in zip(knots, knots[1:]):
        if t <= o1:
            return s0 + (s1 - s0) * (t - o0) / (o1 - o0)
    return knots[-1][1]


def out_time(knots: list, s: float) -> float:
    for (o0, s0), (o1, s1) in zip(knots, knots[1:]):
        if s <= s1:
            return o0 + (o1 - o0) * (s - s0) / (s1 - s0) if s1 > s0 else o0
    return knots[-1][0]


# ── captions ────────────────────────────────────────────────────────────────

def _lines(text: str, width: int = 54) -> list[str]:
    """Cut a segment into caption lines: at sentence ends and colons, then at commas, then between words."""
    parts = [p.strip() for p in re.split(r'(?<=[.?!…:])\s+', text) if p.strip()]
    lines = []
    for p in parts:
        stack = [p]
        while stack:
            q = stack.pop(0)
            if len(q) <= width:
                lines.append(q)
                continue
            commas = [m.end() for m in re.finditer(r',\s', q)]
            mid = len(q) / 2
            cut = min(commas, key=lambda c: abs(c - mid)) if commas else None
            if cut is None or abs(cut - mid) > len(q) * 0.3:
                spaces = [m.start() for m in re.finditer(r'\s', q)]
                cut = min(spaces, key=lambda c: abs(c - mid)) + 1
            stack[:0] = [q[:cut].strip(), q[cut:].strip()]
    return lines


def captions(cs: list[dict]) -> list[dict]:
    """Word timings in output time: words spread over the speech by length, lines snapped to the nearest pause."""
    cues = []
    for c in cs:
        lines = _lines(c['text'])
        speech = c['speech']
        total = sum(e - s for s, e in speech)
        weights = [len(re.sub(r'\s', '', ln)) for ln in lines]
        W = sum(weights)

        def at(frac: float) -> float:            # fraction of speech -> clip time, skipping the pauses
            left = frac * total
            for s, e in speech:
                if left <= e - s:
                    return s + left
                left -= e - s
            return speech[-1][1]

        acc = 0
        bounds = []
        for w in weights:
            t0 = at(acc / W)
            acc += w
            t1 = at(acc / W)
            bounds.append([t0, t1])
        gaps = [(speech[g][1], speech[g + 1][0]) for g in range(len(speech) - 1)]
        used = set()
        for k in range(len(bounds) - 1):          # snap each line break to an unused pause within 0.45 s, after the line starts
            t = bounds[k][1]
            options = [g for g in gaps if g not in used and g[0] > bounds[k][0] + 0.15]
            near = min(options, key=lambda g: abs((g[0] + g[1]) / 2 - t), default=None)
            if near and abs((near[0] + near[1]) / 2 - t) < 0.45:
                bounds[k][1], bounds[k + 1][0] = near[0], near[1]
                used.add(near)
            bounds[k + 1][0] = max(bounds[k + 1][0], bounds[k][1])
        for ln, (t0, t1) in zip(lines, bounds):
            words = ln.split()
            lens = [len(w) + 1 for w in words]
            L = sum(lens)
            wt, run = [], 0
            for w, n in zip(words, lens):
                wt.append({'w': w, 't': round(c['out'] + t0 + (t1 - t0) * run / L, 3)})
                run += n
            cues.append({'t0': round(c['out'] + t0 - 0.06, 3), 't1': round(c['out'] + t1 + 0.25, 3), 'words': wt})
    for a, b in zip(cues, cues[1:]):              # never two cues at once
        a['t1'] = min(a['t1'], b['t0'])
    return cues


if __name__ == '__main__':
    if sys.argv[1] == 'split':
        split(f'batch-{sys.argv[2]}' if sys.argv[2].isdigit() else sys.argv[2])
