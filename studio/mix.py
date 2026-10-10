"""The soundtrack of one video: voice-over, music (music.py), sound effects synthesized from the scene's events.

render.py calls voice_track() before rendering (Skillou's mouth follows it) and soundtrack() after, then mux().
Levels: speech sits around -18 dBFS before loudness normalization; the music plays 12 dB under it and ducks
another 8 dB while someone speaks; the effects sit in between. The final mix is normalized to -16 LUFS.
"""
import json
import pathlib
import re
import subprocess
import wave

import numpy as np
from scipy.signal import butter, sosfilt

import music
import voice

SR = voice.SR
rng = np.random.default_rng(7)


def t_axis(s: float) -> np.ndarray:
    return np.arange(int(s * SR)) / SR


def db(x: float) -> float:
    return 10 ** (x / 20)


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(x ** 2) + 1e-12))


# ── voice ───────────────────────────────────────────────────────────────────

def voice_track(cs: list[dict], duration: float) -> np.ndarray:
    out = np.zeros(int(duration * SR) + SR)
    for c in cs:
        i = int(c['out'] * SR)
        out[i:i + len(c['audio'])] += c['audio'][: len(out) - i]
    out = out[: int(duration * SR)]
    active = out[np.abs(out) > 0.01]
    if len(active):
        out *= db(-18) / rms(active)
    return out


def talk_envelope(v: np.ndarray, fps: int, frames: int) -> list[float]:
    win = int(0.045 * SR)
    env = []
    for f in range(frames):
        c = int(f / fps * SR)
        seg = v[max(0, c - win // 2): c + win // 2]
        env.append(rms(seg) if len(seg) else 0.0)
    env = np.array(env)
    ref = np.percentile(env[env > db(-45)], 90) if np.any(env > db(-45)) else 1.0
    x = np.clip((env / ref) ** 0.8, 0, 1)
    x[env < db(-42)] = 0
    # one-frame smoothing so the mouth does not flicker
    y = x.copy()
    y[1:-1] = 0.25 * x[:-2] + 0.5 * x[1:-1] + 0.25 * x[2:]
    return [round(float(a), 3) for a in y]


# ── sound effects ────────────────────────────────────────────────────────────

def _bp(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    return sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x)


def whoosh() -> np.ndarray:
    t = t_axis(0.6)
    noise = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    blocks = np.array_split(np.arange(len(t)), 30)
    for k, idx in enumerate(blocks):
        f = 400 * 2 ** (3 * np.sin(np.pi * k / 30))
        out[idx] = _bp(noise[idx], f, min(f * 2.5, 16000))
    return out * np.sin(np.pi * t / t[-1]) ** 2


def tick(freq: float = 3200) -> np.ndarray:
    t = t_axis(0.03)
    return _bp(rng.standard_normal(len(t)), freq * 0.6, freq * 1.6) * np.exp(-t * 260)


def key() -> np.ndarray:
    t = t_axis(0.045)
    body = np.sin(2 * np.pi * rng.uniform(1700, 2300) * t) * np.exp(-t * 300) * 0.4
    return (_bp(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 180) + body) * rng.uniform(0.6, 1.0)


def pop() -> np.ndarray:
    t = t_axis(0.11)
    f = 520 + 520 * np.exp(-t * 45)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 38)


def ding() -> np.ndarray:
    t = t_axis(0.7)
    return sum(a * np.sin(2 * np.pi * f * t) for f, a in ((1318.5, 1.0), (1975.5, 0.5), (2637.0, 0.25))) * np.exp(-t * 7) * (1 - np.exp(-t * 400))


def thud() -> np.ndarray:
    t = t_axis(0.35)
    f = 70 + 80 * np.exp(-t * 20)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    return tone + 0.2 * _bp(rng.standard_normal(len(t)), 200, 900) * np.exp(-t * 30)


def boing() -> np.ndarray:
    t = t_axis(0.55)
    f = 260 + 160 * (1 - np.exp(-t * 9)) + 40 * np.sin(2 * np.pi * 11 * t) * np.exp(-t * 4)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * (1 - np.exp(-t * 300))


def count_tick(k: int) -> np.ndarray:
    t = t_axis(0.04)
    return np.sin(2 * np.pi * (1100 + 25 * k) * t) * np.exp(-t * 120)


def effects(events: list[dict], fit: dict, duration: float, host: bool) -> np.ndarray:
    out = np.zeros((2, int(duration * SR) + SR))
    knots = fit['knots']
    o = lambda s: voice.out_time(knots, s)
    placed: list[float] = []

    def add(sig: np.ndarray, t: float, gain: float, pan: float = 0.0, spacing: float = 0.0) -> None:
        if spacing and any(abs(t - p) < spacing for p in placed):
            return
        placed.append(t)
        i = int(t * SR)
        if i < 0 or i >= out.shape[1]:
            return
        sig = sig[: out.shape[1] - i] * gain
        out[0, i:i + len(sig)] += sig * np.cos((pan + 1) * np.pi / 4)
        out[1, i:i + len(sig)] += sig * np.sin((pan + 1) * np.pi / 4)

    cuts = [s for s in fit['starts'] if s > 0.05]
    for s in cuts:
        w = whoosh()
        add(w, s - 0.3, 0.32, -0.3)
    if host:
        add(boing(), 0.15, 0.30, 0.6)
    for ev in events:
        if ev['scene'] or ev['cap'] or ev['chapter']:
            continue
        t = o(ev['at'])
        near_cut = any(-0.15 < t - s < 0.35 for s in cuts)
        if ev['fx'] == 'type' and ev['chars']:
            step = ev['dur'] / ev['chars']
            for k in range(ev['chars']):
                add(key(), o(ev['at'] + k * step), 0.10, 0.1)
            continue
        if ev['count']:
            a, b = ev['at'], ev['at'] + ev['dur']
            n = int((b - a) / 0.07)
            for k in range(n):
                add(count_tick(k), o(a + k * 0.07), 0.05 * (0.5 + k / max(1, n)), 0.0)
            add(ding(), o(b), 0.14)
            continue
        if ev['mark'] == '✓':
            add(ding(), t + 0.05, 0.16, 0.0, 0.12)
        elif ev['mark'] == '✗':
            add(thud(), t + 0.05, 0.42, 0.0, 0.12)
        elif ev['fx'] == 'pop' or re.search(r'\b(chip|pill|sev|lane|flag)\b', ev['cls']):
            add(pop(), t, 0.16, rng.uniform(-0.4, 0.4), 0.07)
        elif ev['leaf'] and not near_cut and not re.search(r'\b(huge|big|mid|eyebrow|dim|small)\b', ev['cls']):
            add(tick(rng.uniform(2600, 3600)), t, 0.10, rng.uniform(-0.3, 0.3), 0.09)
    return out[:, : int(duration * SR)]


# ── mix ─────────────────────────────────────────────────────────────────────

def duck_gain(v: np.ndarray, duration: float) -> np.ndarray:
    hop = SR // 100
    n = int(duration * 100)
    level = np.array([rms(v[k * hop:(k + 1) * hop]) for k in range(n)])
    target = np.where(level > db(-42), db(-8), 1.0)
    g = np.ones(n)
    cur = 1.0
    for k in range(n):
        a = 0.35 if target[k] < cur else 0.03          # fast down (40 ms), slow back up (~450 ms)
        cur += (target[k] - cur) * a
        g[k] = cur
    return np.interp(np.arange(int(duration * SR)) / SR, (np.arange(n) + 0.5) / 100, g)


def soundtrack(name: str, v: np.ndarray, events: list[dict], fit: dict, drop_at: float | None, host: bool, out_wav: pathlib.Path) -> None:
    duration = fit['duration']
    drop_bar = 1
    if drop_at is not None:
        drop_bar = max(1, round(voice.out_time(fit['knots'], drop_at) / voice.BAR))
    m = music.compose(duration, drop_bar)[:, : len(v)]
    speech = v[np.abs(v) > 0.01]
    vref = rms(speech) if len(speech) else db(-18)
    m *= vref * db(-12) / rms(m)
    m *= duck_gain(v, duration)[None, : m.shape[1]]
    fx = effects(events, fit, duration, host)
    fx *= vref * db(-3) / max(1e-6, np.percentile(np.abs(fx[np.abs(fx) > 1e-4]), 99) if np.any(np.abs(fx) > 1e-4) else 1)
    mix = m + fx[:, : m.shape[1]] + np.stack([v, v])[:, : m.shape[1]]
    tmp = out_wav.with_suffix('.raw.wav')
    _write(tmp, mix)
    # two-pass loudness normalization to -16 LUFS, true peak -1.5 dB
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(tmp), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
                           '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8').stderr
    j = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    af = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp), '-af', af, '-ar', str(SR), str(out_wav)], check=True)
    tmp.unlink()


def _write(path: pathlib.Path, x: np.ndarray) -> None:
    peak = np.max(np.abs(x))
    if peak > 0.99:
        x = x * 0.99 / peak
    pcm = (x.T * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def mux(video: pathlib.Path, audio: pathlib.Path, out: pathlib.Path) -> None:
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(video), '-i', str(audio), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(out)], check=True)
