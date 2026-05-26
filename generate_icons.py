#!/usr/bin/env python3
"""Generate all SpeedGuard PWA icons from an SVG source using cairosvg + Pillow."""

import os
import struct
import zlib

ICONS_DIR = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(ICONS_DIR, exist_ok=True)

# ── SVG source ─────────────────────────────────────────────────────────────
SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="#080c14"/>

  <!-- Outer ring -->
  <circle cx="256" cy="256" r="210" fill="none" stroke="#1a2535" stroke-width="6"/>

  <!-- Speed arc (270° green arc) -->
  <circle cx="256" cy="256" r="200"
    fill="none"
    stroke="#2aff7a"
    stroke-width="18"
    stroke-linecap="round"
    stroke-dasharray="848 283"
    stroke-dashoffset="70"
    transform="rotate(-225 256 256)"/>

  <!-- Tick marks -->
  <g stroke="#2a3a4a" stroke-width="3">
    <line x1="256" y1="56" x2="256" y2="88" transform="rotate(0 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="80" transform="rotate(27 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="80" transform="rotate(54 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="88" transform="rotate(67.5 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="80" transform="rotate(81 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="80" transform="rotate(108 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="88" transform="rotate(135 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="80" transform="rotate(162 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="80" transform="rotate(189 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="88" transform="rotate(202.5 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="80" transform="rotate(216 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="80" transform="rotate(243 256 256)"/>
    <line x1="256" y1="56" x2="256" y2="88" transform="rotate(270 256 256)"/>
  </g>

  <!-- Needle -->
  <g transform="rotate(-60 256 256)">
    <line x1="256" y1="96" x2="256" y2="280"
      stroke="#ff3a3a" stroke-width="5" stroke-linecap="round"/>
    <circle cx="256" cy="256" r="14" fill="#0d1520" stroke="#ff3a3a" stroke-width="4"/>
  </g>

  <!-- Speed number -->
  <text x="256" y="340"
    font-family="'Rajdhani', 'Arial Narrow', Arial, sans-serif"
    font-size="100" font-weight="700"
    fill="#e0e8f0" text-anchor="middle" letter-spacing="-3">105</text>

  <!-- KM/H label -->
  <text x="256" y="385"
    font-family="monospace, 'Courier New'"
    font-size="28" fill="#4a6a8a" text-anchor="middle" letter-spacing="6">KM/H</text>

  <!-- Bottom label -->
  <text x="256" y="435"
    font-family="monospace, 'Courier New'"
    font-size="20" fill="#2a3a4a" text-anchor="middle" letter-spacing="4">SPEEDGUARD</text>

  <!-- Green dot status -->
  <circle cx="256" cy="468" r="8" fill="#2aff7a" opacity="0.8"/>
</svg>'''

# ── Pure-Python PNG writer (no deps) ──────────────────────────────────────
def _write_png_chunk(chunk_type, data):
    c = chunk_type + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

def render_svg_to_png_pillow(svg_str, size):
    """Try cairosvg first, fall back to a programmatic icon."""
    try:
        import cairosvg
        png_bytes = cairosvg.svg2png(bytestring=svg_str.encode(), output_width=size, output_height=size)
        return png_bytes
    except ImportError:
        pass

    try:
        from PIL import Image, ImageDraw, ImageFont
        img = Image.new('RGBA', (size, size), (8, 12, 20, 255))
        draw = ImageDraw.Draw(img)

        cx = cy = size // 2
        r = int(size * 0.42)

        # Background circle (dark)
        draw.ellipse([cx-r-2, cy-r-2, cx+r+2, cy+r+2], fill=(13, 21, 32, 255))

        # Green arc (approximate with polygon)
        import math
        arc_start = 135
        arc_end   = 405
        thickness = max(3, size // 28)
        draw.arc([cx-r, cy-r, cx+r, cy+r], arc_start, arc_end,
                 fill=(42, 255, 122, 255), width=thickness)

        # Needle
        angle = math.radians(-60 - 90)
        nx = cx + int((r * 0.7) * math.cos(angle))
        ny = cy + int((r * 0.7) * math.sin(angle))
        draw.line([cx, cy, nx, ny], fill=(255, 58, 58, 255), width=max(2, size // 60))

        # Center dot
        cd = max(4, size // 30)
        draw.ellipse([cx-cd, cy-cd, cx+cd, cy+cd], fill=(255, 58, 58, 255))

        # Speed text
        font_size = max(10, size // 5)
        try:
            font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', font_size)
        except Exception:
            font = ImageFont.load_default()

        txt = '105'
        bbox = draw.textbbox((0, 0), txt, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((cx - tw//2, cy + size//12 - th//2), txt,
                  fill=(224, 232, 240, 255), font=font)

        # KM/H label
        small_size = max(6, size // 14)
        try:
            small_font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', small_size)
        except Exception:
            small_font = ImageFont.load_default()

        unit = 'KM/H'
        bbox2 = draw.textbbox((0, 0), unit, font=small_font)
        uw = bbox2[2] - bbox2[0]
        draw.text((cx - uw//2, cy + size//4), unit,
                  fill=(74, 106, 138, 255), font=small_font)

        import io
        buf = io.BytesIO()
        img.save(buf, 'PNG')
        return buf.getvalue()

    except ImportError:
        raise RuntimeError("Neither cairosvg nor Pillow is available. Install one of them.")

# ── Generate all sizes ─────────────────────────────────────────────────────
SIZES = {
    'icon-72.png':   72,
    'icon-96.png':   96,
    'icon-128.png':  128,
    'icon-144.png':  144,
    'icon-152.png':  152,
    'icon-192.png':  192,
    'icon-384.png':  384,
    'icon-512.png':  512,
    'icon-apple.png': 180,
}

if __name__ == '__main__':
    print('Generating SpeedGuard PWA icons...')
    for filename, size in SIZES.items():
        path = os.path.join(ICONS_DIR, filename)
        try:
            png_data = render_svg_to_png_pillow(SVG, size)
            with open(path, 'wb') as f:
                f.write(png_data)
            print(f'  ✓  {filename} ({size}x{size})')
        except Exception as e:
            print(f'  ✗  {filename}: {e}')

    print('\nDone! All icons saved to ./icons/')
