# Put the site online (GitHub Pages)
1. Create a GitHub account and a new public repository (e.g. earth-jukebox).
2. In VS Code terminal: `git init`, `git add .`, `git commit -m "Earth Jukebox"`, `git branch -M main`,
   `git remote add origin https://github.com/<user>/earth-jukebox.git`, `git push -u origin main`.
3. On GitHub: Settings -> Pages -> Source: "Deploy from a branch" -> main / (root) -> Save.
4. After 1-2 minutes the site is at https://<user>.github.io/earth-jukebox/ . Put this link in your submission.
Google Scholar cannot host websites. Use it to find papers on sonification of Earth science data and cite them in docs/methodology.md.

## Notes
- The About and Advanced parts are hidden in the page but kept in the code. Add `#advanced` to the address (for example `.../index.html#advanced`) to show them again.
- `earth-jukebox.html` is a one-file copy of the whole site (made by `python preprocess/build_single_file.py`) for hosts that accept a single HTML file.
- GitHub Pages needs the whole folder; the `.nojekyll` file is already included.


*Created 14 November 2026.*
