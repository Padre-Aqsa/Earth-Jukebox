"""Embed data/frames/* as data URIs in js/frames-embed.js so the site also works when index.html is opened by double-click (file://).
Browsers block pixel reading of local image files; data URIs are allowed. Run again after changing frames: python preprocess/embed_frames.py"""
import base64, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
out = {}
for d in sorted((root / "data/frames").iterdir()):
    if d.is_dir():
        out[d.name] = ["data:image/webp;base64," + base64.b64encode(f.read_bytes()).decode() for f in sorted(d.glob("frame_*.webp"))]
(root / "js/frames-embed.js").write_text("const EMBED=" + json.dumps(out) + ";\n")
print({k: len(v) for k, v in out.items()})
