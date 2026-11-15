"""Usage: python preprocess/extract_frames.py video.mp4 lights 12   (needs ffmpeg)
Output: data/frames/<id>/frame_01.webp ... (640x360). Then set images:[...] in js/datasets.js"""
import subprocess, sys, pathlib
video, ds_id, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
out = pathlib.Path("data/frames") / ds_id; out.mkdir(parents=True, exist_ok=True)
dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",video]))
for i in range(n):
    t = dur * i / max(1, n-1) * 0.99
    subprocess.run(["ffmpeg","-y","-ss",f"{t:.2f}","-i",video,"-frames:v","1","-vf","scale=640:360",str(out/f"frame_{i+1:02d}.webp")],check=True)
