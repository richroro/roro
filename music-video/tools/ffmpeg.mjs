// Finds an ffmpeg with libx264 and AAC: $FFMPEG, then the one on PATH, then the static build
// that `pip install imageio-ffmpeg` ships.
import { execFileSync } from 'node:child_process';

export function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return 'ffmpeg'; } catch {}
  try {
    return execFileSync('python3', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'])
      .toString().trim();
  } catch {}
  throw new Error('ffmpeg not found: install it, set FFMPEG, or `pip install imageio-ffmpeg`');
}
