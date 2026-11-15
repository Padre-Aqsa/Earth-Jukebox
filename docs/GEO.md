# Countries and continents (section 4 of the page)
After you upload a picture, a video or a PDF, the panel "Countries and continents" shows how much data was analyzed in each country and on each continent.

## What it counts
| Dataset | Per country / continent |
|---|---|
| Night Lights | lit pixels (the same "data pixels" as the main analysis), share of all lit pixels, lit area %, light index (sum of luminance of lit pixels / pixels x 100), and for the change map the purple (more light) and orange (less light) pixels |
| Lightning | number of connected yellow regions (8-neighbour connectivity; each region is assigned by its centre), yellow pixels, share of all detected regions |
| Sea Surface | not available: the data lies on water, outside every country border; temperature is analyzed only over colored ocean pixels |

Row "Outside all countries" = data that falls in the ocean or outside every border. "All frames together" adds the counts of all frames (the light index becomes the average). The CSV button saves every frame x every country.

## How it works
1. Country borders (Natural Earth, public domain; 110 m and 50 m GeoJSON in `data/geo/`) are read in the browser.
2. The borders are rasterized to the size of your picture (scan-line fill at pixel centres, no anti-aliasing) so every pixel gets exactly one country or none.
3. Each pixel that carries data (rules in analysis.js) is added to its country; countries are added up per continent.
Pixel (x, y) is read as longitude = west + x/width x (east - west) and latitude = north - y/height x (north - south).

## Requirements and limits
- The picture must be a flat world map in equirectangular projection (what NASA calls "plate carree"). Globe or orbit views and other projections (Robinson, Mercator...) are not supported.
- Default map area = whole world (180 W to 180 E, 90 S to 90 N). If your map is cropped or has margins, open "Map area", type the real edges, switch on "Show country borders on the picture" and check that the cyan borders follow the coastlines.
- Insets, zoom boxes, captions and legends inside the picture are read as part of the map. Crop them out before country-level attribution. The built-in Night Lights reference contains four zoomed regional insets, so its country-ranking panel is intentionally disabled to avoid counting the inset views as extra global locations.
- 110 m borders are generic: very small countries (a few km) can be smaller than one pixel and get no count. Use the 50 m file for more detail: `python preprocess/fetch_geo.py 50m` (the file is saved under the same name).
- Continent convention: Russia = Europe; Turkey, Cyprus, Georgia, Armenia, Azerbaijan, Kazakhstan = Asia; Egypt = Africa; Greenland = North America; Antarctica and its sub-Antarctic islands = Antarctica.
- Border data is loaded from data/geo/countries-110m.json, otherwise online (cdn.jsdelivr.net or unpkg.com). With neither available, the panel offers a file chooser for any GeoJSON/TopoJSON country file.

## Many pictures and PDF
- There is no limit on the number of pictures. JPG, PNG, WebP, TIFF and PDF can be mixed; files are sorted by name; each PDF page is one frame.
- Pictures are reduced to 800 px width when read (the analysis works at 800 px anyway), so the browser memory is the only limit.
- PDF pages are drawn on a black background so white paper is not counted as light. PDF reading uses js/vendor (pdf.js) and needs the site to be opened through a web server (Live Server or GitHub Pages), not by double-clicking the file.

## Border frames
In the border editor, "Add border frame" adds another complete set of country borders (frame 2, 3, …). Each frame has its own position and size (drag the middle, or its handles; the handles always follow the pointer). Pick the active frame with the "Border frame N" buttons or by pressing on it. A pixel is read with the newest frame that covers it, and the results of all frames are added together. Use it when a picture contains more than one world map (for example the NASA night-lights strip) or a map of a different size.

## Sea-surface temperature: ocean basins (V15)
Temperature is read only over colored water, so it has no country table. The panel reports each ocean basin instead (Pacific, Atlantic, Indian, Southern, Arctic): water pixels, share, mean °C and the cold / mild / warm / hot bands. Boundaries are fixed and approximate (js/oceans.js). Temperature comes from the hue of each water pixel with a table measured on the NASA colour bar (0–32 °C). Lightning dots are detected by saturated yellow, so dim dots on NASA frames are counted too.


## Settings are per dataset
Border frames, alignment, "Show country borders", "Edit border alignment", the map-area values and the table options (frames, rows) belong to the selected dataset (Night Lights, Sea Surface, Lightning). Changing them in one dataset never changes the others; they are saved in the browser separately for each.

*Created 14 November 2026.*
