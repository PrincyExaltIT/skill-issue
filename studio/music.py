"""Background music, composed by code: an upbeat electro-pop loop at 122 BPM, original and royalty-free.

    python studio/music.py 34 out.wav                 a 34 s track, one bar of intro
    python studio/music.py 34 out.wav --drop 4        four bars of build-up, then the drop (the trailer title)

Deterministic (fixed seed): the same arguments give the same file. Needs numpy and scipy.
Layers: four-on-the-floor kick, claps, 16th hats, off-beat bass, pumping chord stabs, pad, 16th arpeggio.
Every tonal layer is side-chained to the kick (the "pump"); ffmpeg/mix.py then ducks the whole track under the voice.
"""
import sys
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48_000
BPM = 122
BEAT = 60 / BPM
BAR = 4 * BEAT
S16 = BEAT / 4

# vi - IV - I - V in D major: (chord voicing, bass root), MIDI.
CHORDS = [
    ([59, 62, 66, 71], 35),   # Bm
    ([55, 59, 62, 67], 31),   # G
    ([57, 62, 66, 69], 38),   # D/A
    ([57, 61, 64, 69], 33),   # A
]
STABS = [0, 3, 6, 10, 12]     # 16th positions of the chord stabs in a bar
ARP = [0, 1, 2, 3, 2, 1, 2, 3]


def hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * SR)) / SR


def env(n: int, a: float, d: float, s: float = 0.0, hold: float = 9.0, r: float = 0.05) -> np.ndarray:
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    return e * np.clip(1 - (t - hold) / r, 0, 1)


class Track:
    def __init__(self, seconds: float):
        self.n = int(seconds * SR)
        self.buf = np.zeros((2, self.n))

    def add(self, sig: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.0) -> None:
        i = int(round(at * SR))
        if i >= self.n or i < 0:
            return
        sig = sig[: self.n - i] * gain
        self.buf[0, i:i + len(sig)] += sig * np.cos((pan + 1) * np.pi / 4)
        self.buf[1, i:i + len(sig)] += sig * np.sin((pan + 1) * np.pi / 4)


def saw(f: float, t: np.ndarray, harmonics: int, phase: float = 0.0) -> np.ndarray:
    out = np.zeros_like(t)
    for h in range(1, harmonics + 1):
        if f * h > 12_000:
            break
        out += np.sin(2 * np.pi * f * h * t + phase * h) / h
    return out


def kick() -> np.ndarray:
    t = t_axis(0.42)
    f = 48 + 110 * np.exp(-t * 30)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = np.exp(-t * 400) * 0.5
    return np.tanh(1.6 * (body + click))


def clap(rng) -> np.ndarray:
    t = t_axis(0.32)
    noise = sosfilt(butter(2, [900, 5200], 'bandpass', fs=SR, output='sos'), rng.standard_normal(len(t)))
    e = np.zeros_like(t)
    for k, off in enumerate((0.0, 0.011, 0.022)):
        e += np.where(t >= off, np.exp(-(t - off) * (180 if k < 2 else 22)), 0)
    return noise * e


def hat(rng, open_: bool) -> np.ndarray:
    t = t_axis(0.25 if open_ else 0.06)
    noise = sosfilt(butter(2, 7500, 'highpass', fs=SR, output='sos'), rng.standard_normal(len(t)))
    return noise * np.exp(-t * (16 if open_ else 70))


def crash(rng) -> np.ndarray:
    t = t_axis(2.2)
    noise = sosfilt(butter(2, 4000, 'highpass', fs=SR, output='sos'), rng.standard_normal(len(t)))
    return noise * np.exp(-t * 2.2)


def impact() -> np.ndarray:
    t = t_axis(1.6)
    f = 32 + 60 * np.exp(-t * 8)
    return np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6))


def riser(rng, seconds: float) -> np.ndarray:
    t = t_axis(seconds)
    noise = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    # sweep a band-pass upward in 24 blocks
    blocks = np.array_split(np.arange(len(t)), 24)
    for k, idx in enumerate(blocks):
        lo = 300 * 2 ** (k / 4)
        sos = butter(2, [lo, min(lo * 2.2, 20_000)], 'bandpass', fs=SR, output='sos')
        out[idx] = sosfilt(sos, noise[idx])
    return out * (t / seconds) ** 2


def bass_note(m: int, dur: float) -> np.ndarray:
    t = t_axis(dur + 0.03)
    tone = saw(hz(m), t, 6) * 0.7 + np.sin(2 * np.pi * hz(m) * t)
    tone = sosfilt(butter(2, 900, 'lowpass', fs=SR, output='sos'), tone)
    return tone * env(len(t), 0.004, 0.25, 0.55, dur, 0.03)


def stab(m: int, rng, dur: float) -> np.ndarray:
    t = t_axis(dur + 0.08)
    sig = sum(saw(hz(m + d), t, 10, rng.uniform(0, 6.28)) for d in (-0.09, 0.0, 0.09)) / 3
    return sig * env(len(t), 0.003, 0.11, 0.25, dur, 0.08)


def pad_chord(notes: list[int], rng, dur: float) -> np.ndarray:
    t = t_axis(dur)
    sig = sum(saw(hz(m + d), t, 6, rng.uniform(0, 6.28)) for m in notes for d in (-0.06, 0.06)) / (2 * len(notes))
    return sig * env(len(t), 0.25, 9.0, 1.0, dur - 0.2, 0.2)


def pluck(m: int) -> np.ndarray:
    t = t_axis(0.3)
    f = hz(m)
    return np.sin(2 * np.pi * f * t + 1.2 * np.exp(-t * 18) * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 11)


def lowpass_sweep(x: np.ndarray, f0: float, f1: float, blocks: int = 32) -> np.ndarray:
    out = np.zeros_like(x)
    idxs = np.array_split(np.arange(x.shape[1]), blocks)
    zi = None
    for k, idx in enumerate(idxs):
        f = f0 * (f1 / f0) ** (k / max(1, blocks - 1))
        sos = butter(2, f, 'lowpass', fs=SR, output='sos')
        out[:, idx] = sosfilt(sos, x[:, idx], axis=1)
    return out


def reverb(x: np.ndarray, rng, seconds: float = 1.6, mix: float = 0.18) -> np.ndarray:
    t = t_axis(seconds)
    ir = rng.standard_normal((2, len(t))) * np.exp(-t * 6.9 / seconds)
    ir = sosfilt(butter(1, 7000, 'lowpass', fs=SR, output='sos'), ir, axis=1)
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    wet = np.stack([fftconvolve(x[c], ir[c])[: x.shape[1]] for c in range(2)])
    return (1 - mix) * x + mix * wet


def compose(duration: float, drop_bar: int = 1) -> np.ndarray:
    rng = np.random.default_rng(122)
    total = duration + BAR
    bars = int(np.ceil(total / BAR))
    drums, tonal, fx = Track(total), Track(total), Track(total)
    pump = np.ones(int(total * SR))
    kshape = 1 - 0.62 * np.exp(-np.arange(int(BEAT * SR)) / SR / 0.075)
    K, CL = kick(), clap(rng)
    for b in range(bars):
        t0 = b * BAR
        notes, root = CHORDS[b % len(CHORDS)]
        full = b >= drop_bar
        # pad underneath everything, stabs from the start
        tonal.add(pad_chord(notes, rng, BAR + 0.05), t0, 0.10)
        for p in STABS:
            for k, m in enumerate(notes):
                tonal.add(stab(m, rng, S16 * 1.6), t0 + p * S16, 0.075 if full else 0.06, (k - 1.5) * 0.35)
        # hats from the start, closed 16ths with an accent pattern; open hat on the off-beats once full
        for s in range(16):
            vel = (0.5, 0.22, 0.34, 0.22)[s % 4] * (1.0 if full else 0.6)
            drums.add(hat(rng, False), t0 + s * S16 + (0.008 if s % 2 else 0), 0.16 * vel, 0.3)
        if full:
            for beat in range(4):
                drums.add(K, t0 + beat * BEAT, 0.9)
                i = int((t0 + beat * BEAT) * SR)
                seg = pump[i:i + len(kshape)]
                pump[i:i + len(kshape)] = np.minimum(seg, kshape[: len(seg)])
                drums.add(hat(rng, True), t0 + (beat + 0.5) * BEAT, 0.08, -0.25)
            for beat in (1, 3):
                drums.add(CL, t0 + beat * BEAT, 0.42)
            for e in range(8):                      # off-beat bass, octave jump every other note
                m = root + (12 if e % 4 == 3 else 0)
                tonal.add(bass_note(m, S16 * 1.7), t0 + (e * 2 + 1) * S16, 0.30)
            for s in range(16):                     # quiet 16th arpeggio an octave up
                m = notes[ARP[s % 8]] + 12
                tonal.add(pluck(m), t0 + s * S16, 0.05 if s % 4 else 0.07, 0.45 if s % 2 else -0.45)
            if (b - drop_bar) % 8 == 0:
                fx.add(crash(rng), t0, 0.12)
            if (b - drop_bar) % 4 == 3:             # snare-clap fill on the last beat of every 4 bars
                for k in range(4):
                    drums.add(CL, t0 + 3 * BEAT + k * S16, 0.18 + 0.06 * k)
        if b == drop_bar and drop_bar > 1:
            fx.add(impact(), t0, 0.7)
            fx.add(crash(rng), t0, 0.22)
        if b == drop_bar - 1 and drop_bar > 1:
            fx.add(riser(rng, BAR), t0, 0.22)
    tonal.buf *= pump[: tonal.buf.shape[1]]
    pre = tonal.buf.copy()
    if drop_bar > 0:   # the build-up opens a low-pass filter until the drop
        cut = int(drop_bar * BAR * SR)
        pre[:, :cut] = lowpass_sweep(pre[:, :cut], 700, 9000 if drop_bar > 1 else 5000)
    mix = reverb(pre, rng) + drums.buf + fx.buf
    mix = sosfilt(butter(2, 30, 'highpass', fs=SR, output='sos'), mix, axis=1)
    mix = np.tanh(1.4 * mix / np.max(np.abs(mix))) / np.tanh(1.4)       # gentle glue
    n = int(duration * SR)
    mix = mix[:, :n]
    fade_out = int(1.8 * SR)
    mix[:, -fade_out:] *= np.linspace(1, 0, fade_out) ** 1.5
    mix[:, :int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    return 0.89 * mix / np.max(np.abs(mix))


def write_wav(path: str, x: np.ndarray) -> None:
    pcm = (np.clip(x.T, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    args = sys.argv[1:]
    drop = int(args[args.index('--drop') + 1]) if '--drop' in args else 1
    write_wav(args[1], compose(float(args[0]), drop))
