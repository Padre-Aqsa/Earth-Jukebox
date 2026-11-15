# Analysis methodology — Earth Jukebox

The built-in references are the flat world-map visualizations described in the team's NASA data document. The website reads rendered image pixels; unless original scientific arrays are supplied, all numerical outputs are image-derived estimates.

## Night Lights — NASA Black Marble / EIC
- The reference sequence contains annual-average global maps for 2012–2023 and a final 2012–2023 change map.
- The final change-map legend is interpreted as purple = more light and orange = less light.
- The sequence also contains zoomed inset panels for India, Ukraine, Western Europe and the Eastern Mediterranean. Those inset pixels are not independent global locations. The built-in reference therefore does not expose country rankings, because the insets would duplicate and misassign mapped pixels.
- Brightness is a visual proxy only. It is not calibrated Black Marble radiance.

## Ocean — MIT/JPL ECCO2
- Use the full global flat map, preserving its 2:1 aspect ratio. The reference time interval is 2007-03-25T12:00Z to 2008-03-03T12:00Z.
- Read temperature only from colored ocean pixels. Grey land, dark background and white flow-vector markers are excluded.
- The supplied color bar anchors the estimate: blue 0 °C, green 10–20 °C, yellow about 25 °C and red 32 °C. Interpolation between anchors is an image-color estimate.
- White dots mark model flow-vector locations and the paths between them are interpolated. This website does not derive physical current velocity from the rendered paths. No country-level sea-temperature ranking is produced.

## Lightning — ISS LIS
- Use the flat global map, not globe or orbit views. The reference covers January 2017 to July 2023 and uses a 10-day roving window.
- The main scan counts yellow pixels by horizontal column to estimate visible spatial density. It does not count individual lightning events.
- The country panel, when available for a correctly aligned flat map, groups connected yellow regions using 8-neighbour connectivity and assigns each region by its centre. These image-derived regions are not verified LIS event records.
- Exact event counts, locations and times require the original quality-controlled LIS dataset.

## Uploads and limitations
- For country-level overlays, the image must be a correctly aligned flat world map in equirectangular (plate carrée) projection. Globe, orbit, cropped regional and inset-heavy views are not valid for country assignment.
- Uploading an image does not make its pixel colors calibrated scientific measurements. Conclusions must say “image-derived estimate” unless original NASA arrays are used.


*Created 14 November 2026.*
