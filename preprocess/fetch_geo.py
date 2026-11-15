"""Download the country borders once, so Earth Jukebox also works offline.
Usage: python preprocess/fetch_geo.py
Saves data/geo/countries-110m.json (Natural Earth via the world-atlas package, public domain, about 100 KB).
Use countries-50m.json instead for finer borders (small countries and islands): python preprocess/fetch_geo.py 50m"""
import sys, pathlib, urllib.request
res = sys.argv[1] if len(sys.argv) > 1 else "110m"
url = f"https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-{res}.json"
out = pathlib.Path(__file__).resolve().parent.parent / "data" / "geo" / "countries-110m.json"  # the app looks for this name
out.parent.mkdir(parents=True, exist_ok=True)
with urllib.request.urlopen(url, timeout=60) as r:
    data = r.read()
out.write_bytes(data)
print("saved", out, round(len(data) / 1000), "KB")
