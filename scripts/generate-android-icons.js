#!/usr/bin/env node
/**
 * Generate Android phone + TV icons from icon reference/icon.jpeg
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'icon reference', 'icon.jpeg');
const FFMPEG = 'ffmpeg';

/** Matches app.config.ts android.adaptiveIcon.backgroundColor */
const BG_COLOR = '0xEEEAF8';
const BG_HEX = '#EEEAF8';

const PHONE = {
  icon: path.join(ROOT, 'assets/images/icon.png'),
  foreground: path.join(ROOT, 'assets/images/android-icon-foreground.png'),
  background: path.join(ROOT, 'assets/images/android-icon-background.png'),
  monochrome: path.join(ROOT, 'assets/images/android-icon-monochrome.png'),
};

const TV_SQUARE = path.join(ROOT, 'assets/tv_icons/icon-760x760.png');

const TV_BANNERS = [
  [400, 240],
  [800, 480],
  [1280, 768],
  [1920, 720],
  [2320, 720],
  [3840, 1440],
  [4640, 1440],
];

function run(args) {
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}

function ensureSource() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Source not found: ${SOURCE}`);
  }
}

function generateSquare(outPath, size) {
  run([
    '-i',
    SOURCE,
    '-vf',
    `scale=${size}:${size}:flags=lanczos`,
    '-frames:v',
    '1',
    outPath,
  ]);
  console.log(`Wrote ${path.relative(ROOT, outPath)} (${size}x${size})`);
}

function generateSolidBackground(outPath, size) {
  run([
    '-f',
    'lavfi',
    '-i',
    `color=c=${BG_COLOR}:s=${size}x${size}:d=1`,
    '-frames:v',
    '1',
    outPath,
  ]);
  console.log(`Wrote ${path.relative(ROOT, outPath)} (solid ${BG_HEX})`);
}

/**
 * White silhouette on transparent background via Python pixel classification.
 * Distinguishes the purple logo from the white→lavender backdrop.
 */
function generateMonochrome(outPath, size) {
  const rawPath = path.join(os.tmpdir(), `sleek-icon-${size}.rgb`);
  run([
    '-i',
    SOURCE,
    '-vf',
    `scale=${size}:${size}:flags=lanczos`,
    '-frames:v',
    '1',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'rgb24',
    rawPath,
  ]);

  const py = `
import struct, zlib, sys
W = H = ${size}
raw_path = sys.argv[1]
out_path = sys.argv[2]
data = open(raw_path, 'rb').read()
assert len(data) == W * H * 3

def is_logo(r, g, b):
    lum = (r + g + b) / 3.0
    sat = max(r, g, b) - min(r, g, b)
    # Near-white / pale hollow areas inside the play mark
    if lum >= 232:
        return False
    if lum >= 220 and sat <= 40:
        return False
    # Bottom lavender backdrop: r≈g, strong blue, still fairly bright
    if abs(r - g) <= 14 and b >= r + 40 and lum >= 185:
        return False
    # Mid backdrop lavender (less blue separation)
    if abs(r - g) <= 18 and b >= max(r, g) + 20 and lum >= 205 and sat <= 90:
        return False
    return sat >= 35 or lum <= 200

rows = bytearray()
logo = 0
for y in range(H):
    rows.append(0)  # filter None
    for x in range(W):
        i = (y * W + x) * 3
        r, g, b = data[i], data[i + 1], data[i + 2]
        if is_logo(r, g, b):
            rows.extend((255, 255, 255, 255))
            logo += 1
        else:
            rows.extend((0, 0, 0, 0))

def chunk(tag, payload):
    return struct.pack('>I', len(payload)) + tag + payload + struct.pack('>I', zlib.crc32(tag + payload) & 0xffffffff)

ihdr = struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0)
png = b'\\x89PNG\\r\\n\\x1a\\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(rows), 9)) + chunk(b'IEND', b'')
open(out_path, 'wb').write(png)
print(f'logo_pixels={logo}')
`;

  const result = execFileSync('python3', ['-c', py, rawPath, outPath], {
    encoding: 'utf8',
  });
  fs.unlinkSync(rawPath);
  process.stdout.write(result);
  console.log(`Wrote ${path.relative(ROOT, outPath)} (monochrome ${size}x${size})`);
}

/**
 * Wide TV banner: square icon centered on a full-bleed backdrop made by
 * horizontally stretching the source's left-edge gradient column.
 */
function generateBanner(width, height) {
  const outPath = path.join(ROOT, 'assets/tv_icons', `icon-${width}x${height}.png`);
  if (width < height) {
    throw new Error(`Banner width must be >= height (${width}x${height})`);
  }

  const fc = [
    `[0:v]scale=${height}:${height}:flags=lanczos,format=rgb24,split=2[sq][edge]`,
    // 4px left strip → full banner = seamless vertical gradient sides
    `[edge]crop=4:${height}:0:0,scale=${width}:${height}:flags=bilinear[bg]`,
    `[bg][sq]overlay=(W-w)/2:0`,
  ].join(';');

  run(['-i', SOURCE, '-filter_complex', fc, '-frames:v', '1', outPath]);
  console.log(`Wrote ${path.relative(ROOT, outPath)} (banner ${width}x${height})`);
}

function main() {
  ensureSource();
  fs.mkdirSync(path.join(ROOT, 'assets/images'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'assets/tv_icons'), { recursive: true });

  console.log('Generating Android phone icons...');
  generateSquare(PHONE.icon, 1024);
  generateSquare(PHONE.foreground, 1024);
  generateSolidBackground(PHONE.background, 1024);
  generateMonochrome(PHONE.monochrome, 1024);

  console.log('Generating Android TV icons...');
  generateSquare(TV_SQUARE, 760);
  for (const [w, h] of TV_BANNERS) {
    generateBanner(w, h);
  }

  console.log('Done.');
  console.log(`backgroundColor remains ${BG_HEX}`);
}

main();
