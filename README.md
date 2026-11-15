Earth Jukebox (NASA EIC Sonification)
Created 14 November 2026 for the NASA EIC Challenge.
Earth Jukebox turns NASA Earth Information Center pictures into sound, graphs, tables, a 3D coil and plain-language conclusions, so people who cannot see the maps can hear how the planet changes. It runs entirely in the browser (static HTML, CSS and JavaScript) and can be hosted on GitHub Pages.
Run it
Open the folder in VS Code, install "Live Server", right-click `index.html` and choose "Open with Live Server", or run `python -m http.server 8000` and open http://localhost:8000.
Deploy on GitHub Pages: see `docs/DEPLOY.md`.
Use it
Choose one of the three datasets: Night Lights, Sea Surface Currents & Temperature, Lightning.
Upload a video (MP4/WebM) or any number of JPG, PNG, TIFF or PDF files (each PDF page is one frame).
Press Play. The yellow scan line reads the picture column by column; the sound, graph, table, 3D coil, conclusions and country/ocean panel are all computed from your upload.
A video is analyzed live while it plays. Several pictures are read as a time series.
The three datasets are fully separate
Each dataset has its own sound rule, its own reading of the pixels, its own AI label, its own upload and its own settings. Nothing is shared between them:
the upload, graph, table, conclusions and 3D coil;
the country-border frames, alignment, "Show country borders" and "Edit border alignment" switches, map-area values and table options (saved in the browser per dataset: Night Lights, Sea Surface, Lightning);
the comparison curve and the sound calibration.
Only global preferences are shared: voice on/off, audio on/off, volume, speed, high contrast and larger text.
English only, with voice
Every text on the page, in the docs and in the voice guide is English. The voice (browser speech synthesis, English voice) speaks after every button, switch, list or slider you use: each control either speaks its own result or announces its name and new state. The "Voice guide" switch turns it on or off; with it off, screen readers get the same messages through a live region.
Analysis notes
Use flat world-map frames for the three datasets. Globe and orbit views are kept only as samples for the AI and are excluded from the analysis views.
Night Lights: brightness and change values are image-based proxies, not calibrated Black Marble radiance. Country counts are available for flat frames.
Sea Surface Temperature: read only over colored ocean pixels; temperature is estimated from the NASA color bar (blue 0 °C, green 10-20 °C, yellow about 25 °C, red 32 °C), not from raw ECCO2 values. Reported per ocean basin, not per country.
Lightning: the main scan measures visible yellow-pixel density, not event totals; the country panel groups connected yellow regions.
See `docs/methodology.md` for the limits of each dataset and `docs/GEO.md` for the country and ocean panel.
Country and continent detection
Country borders come from Natural Earth (public domain) and are saved in `data/geo/`, so the page works offline. Details: `docs/GEO.md`.
Credits and licenses
Item	Use	License / terms
NASA Scientific Visualization Studio (SVS) and NASA Earth Information Center (EIC) visualizations (Black Marble night lights, MIT/JPL ECCO2 ocean model, ISS Lightning Imaging Sensor)	sample frames in `data/frames`, AI training and demo	NASA content is generally not subject to copyright in the US; NASA must be acknowledged as the source and no NASA endorsement may be implied. NASA logos/insignia are not public domain and are not used. Credit: "NASA's Scientific Visualization Studio", "NASA Earth Information Center".
Natural Earth	country borders (`data/geo`)	Public domain. "Made with Natural Earth." (credit optional)
pdf.js 6.2.108 (Mozilla Foundation)	reading PDF uploads (`js/vendor`)	Apache License 2.0
UTIF.js 3.1.0 (Photopea)	reading TIFF uploads (CDN)	MIT License
Atkinson Hyperlegible (Braille Institute)	page font (Google Fonts)	SIL Open Font License 1.1
Full notices are in `THIRD_PARTY_NOTICES.md`. The NASA Space Apps Challenge logo in the header only identifies the challenge and does not mean NASA endorses this project. Earth Jukebox is an independent project and is not affiliated with NASA.
AI disclosure
Claude (Anthropic) helped the team with ideas, code (country detection, upload reading, voice and accessibility features, tests) and the drafting of the presentation slides. The team directed the work, reviewed and tested it and is responsible for the result.
TEAM TO COMPLETE BEFORE SUBMITTING: list every other AI tool the team really used (name, version, purpose), here, on the Project Page and on the site (`index.html`, section "AI disclosure").
The "AI" inside the web app is a small k-nearest-neighbour classifier trained in the browser on the NASA sample frames. It is not a generative model and calls no external service.
The same disclosure appears in the app (section "Credits, licenses and AI disclosure"), on the Project Page (`docs/PROJECT_PAGE.md`) and in the last slide.
Other people's work
No code or concept from another participant's repository may be used without naming it here. Nothing is listed at the moment; the team must confirm that nothing of that kind was used, and add anything that was to the table above and to `THIRD_PARTY_NOTICES.md`.
Folder map
`index.html` (page) · `css/` · `js/` (app, analysis, geo, sonify, AI, 3D coil) · `data/frames` (NASA samples) · `data/geo` (Natural Earth borders) · `docs/` · `preprocess/` (helper scripts) · `earth-jukebox.html` (one-file copy, built by `preprocess/build_single_file.py`).
