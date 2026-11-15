# Adding real NASA frames (the AI is pre-trained on whatever is in data/frames)
1. Download frames/video from the NASA SVS / EIC page and copy the credit text.
2. Images (TIFF/PNG/JPG): `python preprocess/convert_frames.py <folder> <dataset_id>`
   Video: `python preprocess/extract_frames.py video.mp4 <dataset_id> 12`
   dataset_id: lights (Night Lights), ocean (Sea Surface Currents / ECCO2), lightning (ISS).
3. Frames land in data/frames/<id>/frame_01.webp ... Open the site with Live Server or GitHub Pages: frames load and the AI trains on them automatically.
Each dataset has its own folder, so the three datasets never mix. Add the credit line to index.html (About).
Frames extracted from the team's docx: python preprocess/extract_docx_frames.py file.docx

When you add a frame, also add its exact credit line to THIRD_PARTY_NOTICES.md.

*Created 14 November 2026.*
