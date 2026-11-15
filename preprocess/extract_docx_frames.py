"""Extract the NASA frames embedded in the team's .docx into data/frames/<scene>/frame_NN.webp
Usage: python preprocess/extract_docx_frames.py path/to/file.docx   (needs: pip install pillow)"""
import sys, io, zipfile, pathlib
from PIL import Image
SCENES = {  # scene id -> image numbers in word/media (image<N>.png), in document order
 "lights": range(1, 14),            # Night Lights 2012-2023 (12 annual frames) + change map
 "ocean": range(14, 28),            # Sea surface currents + temperature, global
 "ocean-atl": range(31, 45),        # North Atlantic
 "ocean-pac": range(48, 62),        # Eastern Pacific
 "lightning": range(83, 93),        # ISS lightning, flat map
 "lightning-globe": range(62, 70),  # ISS lightning, globe view
 "lightning-orbit": range(70, 83),  # ISS lightning, orbit view
}
z = zipfile.ZipFile(sys.argv[1])
for sid, nums in SCENES.items():
    out = pathlib.Path("data/frames") / sid; out.mkdir(parents=True, exist_ok=True)
    for k, n in enumerate(nums, 1):
        im = Image.open(io.BytesIO(z.read(f"word/media/image{n}.png"))).convert("RGB")
        if im.width > 800: im = im.resize((800, round(im.height * 800 / im.width)), Image.LANCZOS)
        im.save(out / f"frame_{k:02d}.webp", quality=68)
    print(sid, len(nums), "frames")
