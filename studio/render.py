"""Render the course videos frame by frame (deterministic), then encode with ffmpeg.

    python studio/render.py                 render every video in VIDEOS
    python studio/render.py v1-anatomie     render one video
    python studio/render.py v0-trailer --at 2,8.5        PNG previews at those times (layout check)

Requires: Python Playwright with Chromium, ffmpeg on PATH. Output: site/dist/media/<name>.mp4 + <name>.jpg (poster).
"""
import pathlib
import shutil
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parent / 'site' / 'dist' / 'media'
FPS = 30
# name -> time (s) of the poster frame
VIDEOS = {
    'v3-flux': 53.0,
    'v0-trailer': 8.6,
    'v4-cloud': 1.0,
    'v1-anatomie': 46.0,
    'v2-construire': 1.0,
    'v2-review': 90.0,
    'v3-chain': 30.0,
}


def render(name: str, poster_t: float, preview_at: list[float] | None = None) -> None:
    frames = ROOT / 'frames' / name
    shutil.rmtree(frames, ignore_errors=True)
    frames.mkdir(parents=True)
    OUT.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1.5)
        page.goto((ROOT / 'scenes' / f'{name}.html').as_uri())
        page.wait_for_function('window.__ready === true', timeout=60_000)
        if preview_at is not None:
            for at in preview_at:
                page.evaluate(f'window.__seek({at})')
                target = ROOT / 'frames' / f'{name}-{at:05.1f}.png'
                page.screenshot(path=str(target), scale='css')
                print(target)
            browser.close()
            return
        duration = page.evaluate('window.__duration()')
        count = int(duration * FPS)
        for i in range(count):
            page.evaluate(f'window.__seek({i / FPS})')
            page.screenshot(path=str(frames / f'f{i:05d}.jpg'), type='jpeg', quality=90)
        page.evaluate(f'window.__seek({poster_t})')
        page.screenshot(path=str(OUT / f'{name}.jpg'), type='jpeg', quality=80)
        browser.close()
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(frames / 'f%05d.jpg'),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        str(OUT / f'{name}.mp4'),
    ], check=True)
    shutil.rmtree(frames, ignore_errors=True)
    size = (OUT / f'{name}.mp4').stat().st_size / 1e6
    print(f'{name}: {count} frames, {size:.1f} MB, {time.time() - t0:.0f} s')


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
