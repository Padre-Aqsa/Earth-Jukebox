"""Build ONE self-contained file (earth-jukebox.html): css + all scripts + NASA frames inlined.
Use it for hosts that accept a single HTML file. For GitHub Pages you do NOT need it: upload the whole folder."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
h = (root / "index.html").read_text(encoding="utf8")
h = h.replace('<link rel="stylesheet" href="css/style.css">', "<style>\n" + (root / "css/style.css").read_text(encoding="utf8") + "\n</style>")
import base64
h = re.sub(r'src="(assets/[^"]+\.png)"', lambda m: 'src="data:image/png;base64,' + base64.b64encode((root / m.group(1)).read_bytes()).decode() + '"', h)
h = re.sub(r'<script src="(js/[^"]+)"></script>', lambda m: "<script>\n" + (root / m.group(1)).read_text(encoding="utf8") + "\n</script>", h)
(root / "earth-jukebox.html").write_text(h, encoding="utf8")
print("earth-jukebox.html", round(len(h) / 1e6, 1), "MB")
