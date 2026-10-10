"""Render the course videos frame by frame (deterministic), with Skillou, the voice-over, music and sound effects.

    python studio/render.py                       render every video in VIDEOS
    python studio/render.py v1-anatomie           render one video
    python studio/render.py v0-trailer --at 2,8.5 PNG previews at those output times (layout check)

Pipeline per video: load the scene, read its timed elements, cut the voice clips (voice.py), fit the scenes to the
voice and the beat, then render each frame on the output clock and mix the soundtrack (mix.py).
Requires: Python Playwright with Chromium, numpy, scipy, ffmpeg on PATH.
Output: site/dist/media/<name>.mp4 + <name>.jpg (poster), and studio/timing/<name>.json (for the site's chapters).
"""
import json
import pathlib
import random
import shutil
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

import mix
import voice

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parent / 'site' / 'dist' / 'media'
TIMING = ROOT / 'timing'
FPS = 30
# name -> scene time (s) of the poster frame
VIDEOS = {
    'v0-trailer': 8.6,
    'v1-anatomie': 46.0,
    'v2-construire': 1.0,
    'v3-flux': 53.0,
    'v4-cloud': 1.0,
    'v2-review': 90.0,
    'v3-chain': 30.0,
    'v5-client': 16.0,
}


def host_plan(name: str, events: list, fit: dict, cs: list, talk: list) -> dict:
    """Skillou's choreography: greet, point at each new scene, react to ✓ and ✗, cheer on the drop, wave goodbye."""
    o = lambda s: voice.out_time(fit['knots'], s)
    cues = [{'t': 0.55, 'dur': 1.5, 'pose': 'wave', 'expr': 'happy', 'look': 0.3}]
    for s in fit['starts'][1:]:
        cues.append({'t': s + 0.15, 'dur': 1.3, 'pose': 'point', 'look': -1})
    for ev in events:
        if ev['scene'] or ev['cap']:
            continue
        if ev['mark'] == '✓':
            cues.append({'t': o(ev['at']) + 0.05, 'dur': 0.9, 'pose': 'cheer', 'expr': 'happy'})
        elif ev['mark'] == '✗':
            cues.append({'t': o(ev['at']) + 0.05, 'dur': 1.0, 'pose': 'oops', 'expr': 'shock'})
        elif ev['count']:
            cues.append({'t': o(ev['at'] + ev['dur']), 'dur': 0.9, 'expr': 'happy'})
    drop = voice.NARRATION.get('drop', {}).get(name)
    if drop is not None:
        cues.append({'t': o(drop) + 0.05, 'dur': 1.7, 'pose': 'cheer', 'expr': 'happy'})
    cues.append({'t': fit['duration'] - 2.2, 'dur': 2.3, 'pose': 'wave', 'expr': 'happy', 'look': 0.4})
    # a sip of bubble tea in every long silence
    quiet, start = 0, None
    for f, v in enumerate(talk + [1]):
        if v < 0.05:
            start = f if start is None else start
        elif start is not None:
            a, b = start / FPS, f / FPS
            if b - a > 2.6 and not any(a < c['t'] + c['dur'] and c['t'] < b for c in cues):
                cues.append({'t': round(a + 0.5, 2), 'dur': round(min(2.0, b - a - 1.0), 2), 'pose': 'sip'})
            start = None
    cues.sort(key=lambda c: c['t'])
    rnd = random.Random(name)
    blinks, t = [], 1.2
    while t < fit['duration']:
        blinks.append(round(t, 2))
        if rnd.random() < 0.2:
            blinks.append(round(t + 0.25, 2))
        t += rnd.uniform(2.4, 4.6)
    return {'fps': FPS, 'talk': talk, 'cues': cues, 'blinks': blinks, 'beat': voice.BEAT, 'base': (ROOT / 'assets' / 'skillou' / 'rig').as_uri()}


def render(name: str, poster_t: float, preview_at: list[float] | None = None) -> None:
    frames = ROOT / 'frames' / name
    shutil.rmtree(frames, ignore_errors=True)
    frames.mkdir(parents=True)
    OUT.mkdir(parents=True, exist_ok=True)
    TIMING.mkdir(exist_ok=True)
    t0 = time.time()
    cs = voice.clips(name)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1.5)
        page.on('pageerror', lambda e: print('page error:', e))
        page.goto((ROOT / 'scenes' / f'{name}.html').as_uri())
        page.wait_for_function('window.__ready === true', timeout=60_000)
        page.add_script_tag(content='window.SKILLOU_RIG = ' + (ROOT / 'assets' / 'skillou' / 'rig' / 'rig.json').read_text(encoding='utf-8'))
        page.add_script_tag(path=str(ROOT / 'mascot.js'))
        events = page.evaluate('window.__events()')
        scene_dur = page.evaluate('window.__duration()')
        drop = voice.NARRATION.get('drop', {}).get(name)
        fit = voice.fit(events, scene_dur, cs, drop)
        duration = fit['duration']
        count = int(duration * FPS)
        v = mix.voice_track(cs, duration)
        talk = mix.talk_envelope(v, FPS, count)
        tl = {'duration': duration, 'sceneStarts': fit['starts'], 'beat': voice.BEAT,
              'captions': voice.captions(cs), 'host': host_plan(name, events, fit, cs, talk)}
        page.evaluate('tl => window.__setTimeline(tl)', tl)
        page.evaluate('() => window.__hostReady')
        seek = lambda o: page.evaluate(f'window.__seek({voice.scene_time(fit["knots"], o)}, {o})')
        if preview_at is not None:
            for at in preview_at:
                seek(at)
                target = ROOT / 'frames' / f'{name}-{at:05.1f}.png'
                page.screenshot(path=str(target), scale='css')
                print(target)
            browser.close()
            return
        for i in range(count):
            seek(i / FPS)
            page.screenshot(path=str(frames / f'f{i:05d}.jpg'), type='jpeg', quality=90)
        seek(voice.out_time(fit['knots'], poster_t))
        page.screenshot(path=str(OUT / f'{name}.jpg'), type='jpeg', quality=80)
        browser.close()
    silent = frames / 'video.mp4'
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(frames / 'f%05d.jpg'),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', str(silent),
    ], check=True)
    audio = frames / 'mix.wav'
    mix.soundtrack(name, v, events, fit, drop, True, audio)
    mix.mux(silent, audio, OUT / f'{name}.mp4')
    (TIMING / f'{name}.json').write_text(json.dumps({'duration': duration, 'starts': fit['starts'], 'knots': fit['knots']}) + '\n',
                                         encoding='utf-8', newline='\n')
    shutil.rmtree(frames, ignore_errors=True)
    size = (OUT / f'{name}.mp4').stat().st_size / 1e6
    print(f'{name}: {duration:.1f} s, {count} frames, {size:.1f} MB, {time.time() - t0:.0f} s')


if __name__ == '__main__':
    argv = sys.argv[1:]
    preview = None
    if '--at' in argv:
        i = argv.index('--at')
        preview = [float(x) for x in argv[i + 1].split(',')]
        argv = argv[:i] + argv[i + 2:]
    args = [a for a in argv if not a.startswith('--')]
    for name in (args or list(VIDEOS)):
        render(name, VIDEOS.get(name, 1.0), preview)
