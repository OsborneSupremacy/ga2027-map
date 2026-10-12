# ga2027-map

The interactive area map on [pcaga2027.org](https://www.pcaga2027.org), the site for the 2027 PCA General Assembly at the Baird Center in Milwaukee. It shows parking, hotels, and transportation near the venue.

The map is hosted on GitHub Pages at `https://map.pcaga2027.org` and embedded in Squarespace by a snippet that never changes. Every update happens in this repository.

## Layout

| Path | What it is |
| --- | --- |
| `site/places.json` | Every pin: names, prices, notes, links, coordinates. **The file you edit most.** |
| `site/ga-map.js` | Map logic. Fetches `places.json` and renders it. |
| `site/ga-map.css` | Pin, legend, and popup styles. |
| `site/index.html` | Preview page served at the site root, for checking an edit without Squarespace. |
| `embed/squarespace.html` | The snippet pasted into the Squarespace Code block. Paste once; don't edit. |
| `scripts/validate-places.mjs` | Checks `places.json` before it's published. |
| `.github/workflows/deploy-pages.yml` | Validates and publishes `site/` on every push to `main`. |

## Updating the map

1. In GitHub, open `site/places.json` and click the pencil icon to edit.
2. Make the change and commit it to `main`.
3. The **Deploy Map** workflow (Actions tab) validates the file and publishes it, which takes about a minute. If the file has a mistake, the workflow fails with a list of what's wrong, and the live map keeps showing the previous version.
4. Check the result at <https://map.pcaga2027.org/>. GitHub Pages caches files for up to 10 minutes, but the map revalidates `places.json` on every load, so the change normally appears right away.

### Place fields

```json
{ "type": "parking", "label": "A", "name": "Baird Center Garage", "price": "$$$", "volunteer": true,
  "lat": 43.0410, "lng": -87.9168, "note": "Optional italic note",
  "links": [{ "text": "Pre-pay", "url": "https://example.com" }] }
```

- `type`: one of `parking`, `hotel`, `transport`, `venue`, `warning`. It sets the pin color and which layer toggle controls the pin.
- `label`: the text inside the pin (1 to 3 characters).
- `name`, `lat`, `lng`: required.
- `price` (`$` to `$$$`), `volunteer` (`true`/`false`), `note`, `links`: optional. Links must be `https://`.

The legend's ranges ("Parking A–F, Hotels 1–8") come from the first and last label of each type, in file order.

### Finding coordinates

Add `?gaCoords` to the page URL, for example <https://map.pcaga2027.org/?gaCoords>, then click the map to read lat/lng. This mode is off for everyone else, so there's no flag to remember to turn off before going live.

## Local development

```bash
python3 -m http.server 8000 --directory site
```

Then open <http://localhost:8000/?gaCoords/>. Stadia allows localhost without configuration.

```bash
node scripts/validate-places.mjs
```

## One-time setup

1. Make the repository public. Pages on a private repo requires GitHub Pro.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Verify `pcaga2027.org` in the owning account's Pages settings (<https://github.com/settings/pages>, not the repo's), which keeps anyone else from claiming a subdomain of it on Pages. GitHub gives you a TXT record to add in Squarespace DNS.
4. In Squarespace DNS, add `CNAME map → osbornesupremacy.github.io`.
5. **Settings → Pages → Custom domain:** `map.pcaga2027.org`. Wait for the certificate, then tick **Enforce HTTPS**. A workflow-based deploy takes the domain from this setting, so there's no `CNAME` file in `site/`.
6. Paste `embed/squarespace.html` into a Code block on the Squarespace page.

Stadia's `*.pcaga2027.org` property already covers both the Squarespace page and the preview page at `map.pcaga2027.org`. Domain auth checks the page the map appears on, not where the JS is hosted.

## Continuity

Anyone with write access to this repository can update the map from a browser, and no AWS or Squarespace access is needed. To hand the map off, add the person as a collaborator, or transfer the repository to a committee-owned GitHub account. If the repository moves, update the Squarespace DNS CNAME to the new owner's `<owner>.github.io` and re-add the custom domain in Pages settings. The embed snippet doesn't change.

## Licensing

- **Leaflet** 1.9.4, BSD 2-Clause. Loaded from unpkg at a pinned version with Subresource Integrity hashes.
- **Map data** © OpenStreetMap contributors, ODbL. **Tiles** © Stadia Maps, © OpenMapTiles. The attribution in the map's corner is required and must stay visible.
- **Stadia Maps** free plan, non-commercial use. Whether a nonprofit event with paid registration counts as non-commercial is an open question with Stadia.
- **GitHub Pages** usage is subject to GitHub's [Pages limits and acceptable use](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- **This repository's code** is MIT-licensed, © GA 2027 Host Committee. See [LICENSE](LICENSE).
- **Map content** in `site/places.json` (place selection, notes, route wording, links) is © GA 2027 Host Committee, all rights reserved. The MIT license doesn't cover it.
