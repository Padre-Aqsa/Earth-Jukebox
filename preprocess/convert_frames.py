"""Convert NASA images (TIFF/PNG/JPG) to web frames.
Usage: python preprocess/convert_frames.py <folder_with_images> <dataset_id>
dataset_id: lights | ocean | lightning   (ECCO2 sea surface frames -> ocean)
Needs: pip install pillow numpy. Output: data/frames/<id>/frame_01.webp ... (640x360, max 30)"""
import sys, pathlib
import numpy as np
from PIL import Image
src, ds = pathlib.Path(sys.argv[1]), sys.argv[2]
out = pathlib.Path("data/frames") / ds; out.mkdir(parents=True, exist_ok=True)
files = sorted((p for p in src.iterdir() if p.suffix.lower() in {".tif", ".tiff", ".png", ".jpg", ".jpeg"}), key=lambda p: p.name)
for i, p in enumerate(files[:30], 1):
    im = Image.open(p)
    if im.mode in ("I;16", "I", "F"):  # scientific TIFFs: stretch to 8-bit
        a = np.array(im, dtype=float); lo, hi = np.nanpercentile(a, [1, 99])
        im = Image.fromarray((np.clip((a - lo) / (hi - lo + 1e-9), 0, 1) * 255).astype("uint8"))
    im = im.convert("RGB"); im.thumbnail((640, 360))
    canvas = Image.new("RGB", (640, 360)); canvas.paste(im, ((640 - im.width) // 2, (360 - im.height) // 2))
    canvas.save(out / f"frame_{i:02d}.webp", quality=85)
print(f"Converted {min(len(files), 30)} files to {out}")
