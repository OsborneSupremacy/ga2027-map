# ga2027-map

The interactive area map on [pcaga2027.org](https://www.pcaga2027.org), the site for the 2027 PCA General Assembly at the Baird Center in Milwaukee. It shows parking, hotels, dining, and transportation near the venue.

The map is hosted on GitHub Pages at `https://map.pcaga2027.org` and embedded in Squarespace by a snippet that never changes. Every update happens in this repository.

## Layout

| Path | What it is |
| --- | --- |
| `site/places.json` | Every pin: names, prices, notes, links, coordinates. **The file you edit most.** |
| `site/ga-map.js` | Map logic. Builds the title header, fetches `places.json`, and renders it. |
| `site/ga-map.css` | Header, pin, legend, and popup styles. |
| `site/index.html` | Preview page served at the site root, for checking an edit without Squarespace. |
| `site/mini.html` | Small venue-only map for the site footer. |
| `embed/squarespace.html` | The snippet pasted into the Squarespace Code block. Paste once; don't edit. |
| `embed/footer.html` | The iframe snippet pasted into a Code block in the Squarespace footer. |
| `scripts/validate-places.mjs` | Checks `places.json` before it's published. |
| `.github/workflows/deploy-pages.yml` | Validates and publishes `site/` on every push to `main`. |

## Title header

`ga-map.js` wraps the embed's `#gaMap` in a card with a navy title bar ("GA 2027 Area Map", plus a subtitle on screens wider than 600px), so the embed snippet stays a bare `<div>`. The header sets its own colors and fonts so the Squarespace theme can't restyle it. On phones the map fills the screen below the header.

The Squarespace page's own header was removed on purpose, because on mobile it conflicted with the map. Don't add it back; the map's title bar replaces it.

## Footer map

`site/mini.html` shows only the Baird Center pin, with no header, legend, or layer toggles, and fills whatever frame it's placed in. It replaces the Google Map in the site footer: paste `embed/footer.html` into a Code block there and adjust its height to match the address box beside it. Clicking the pin or the "Parking, hotels & dining map" button opens the full map page, `https://www.pcaga2027.org/map`, which is set by `data-full-map` in `mini.html`. The pin's position comes from the `venue` entry in `places.json`.

## Updating the map

1. In GitHub, open `site/places.json` and click the pencil icon to edit.
2. Make the change and commit it to `main`.
3. The **Deploy Map** workflow (Actions tab) validates the file and publishes it, which takes about a minute. If the file has a mistake, the workflow fails with a list of what's wrong, and the live map keeps showing the previous version.
4. Check the result at <https://map.pcaga2027.org/>. GitHub Pages caches files for up to 10 minutes, but the map revalidates `places.json` on every load, so the change normally appears right away.

### Place fields

```json
{ "type": "parking", "name": "Baird Center Garage", "price": "$$$", "volunteer": true,
  "lat": 43.0410, "lng": -87.9168, "note": "Optional italic note",
  "links": [{ "text": "Pre-pay", "url": "https://example.com" }] }
```

- `type`: one of `parking`, `hotel`, `dining`, `transport`, `venue`, `warning`. It sets the pin color and icon, and which layer toggle controls the pin.
- `name`, `lat`, `lng`: required. Each place needs a different name.
- `icon`: optional. Replaces the type's usual icon for this one place. One of `parking`, `hotel`, `dining`, `building`, `train`, `truck`, `warning`. The icons are drawn in `ICONS` in `ga-map.js`, and a new one has to be added there and in `scripts/validate-places.mjs`.
- `price` (`$` to `$$$`), `volunteer` (`true`/`false`), `note`, `links`: optional. Links must be `https://`.

Every popup except `warning` pins gets Google Maps and Apple Maps directions buttons, built from `lat`/`lng`. Directions go to the pin itself, so put a parking pin on the lot's entrance.

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
