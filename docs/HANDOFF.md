# Handoff: GA 2027 Interactive Area Map

You're picking up an in-progress project. Read this whole file before making changes.

## Project context

- **Site:** https://www.pcaga2027.org, a Squarespace site (Core plan) for the 2027 General Assembly in Milwaukee, held at the **Baird Center**. Run by a nonprofit host committee; I'm a volunteer on it.
- **Goal:** An interactive map embedded on a Squarespace page that shows parking, hotels, and transportation near the Baird Center, with links to parking pre-pay sites and apps, and hotel booking links.
- **Collaborator:** A fellow committee member who supplies content (locations, links, wording) and cares a lot about **copyright and licensing compliance**. Keep that in mind for every dependency and data source.
- **The map changes often**, so updating it must not require re-pasting code into Squarespace.

## Decisions already made (don't revisit without a reason)

- **Map library:** Leaflet 1.9.4 (BSD license), loaded from unpkg at a pinned version.
- **Map data and tiles:** OpenStreetMap data (ODbL), with tiles served by **Stadia Maps**, style **Alidade Smooth**:
  `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png`
- **Rejected:** Google Maps (clutter, inconsistent rendering of the Baird overhang), Bing Maps (Microsoft is retiring the platform), and VisitMKE (no license or embed option). Don't use openstreetmap.org's own tile servers in production.
- **Attribution is required** and must stay visible:
  `© Stadia Maps © OpenMapTiles © OpenStreetMap contributors`, with links.

## Stadia Maps account

- Free plan, non-commercial use. A trial ends **10/26/2026**, after which the account reverts to free automatically.
- **Open item:** I'm emailing Stadia to confirm a nonprofit event site qualifies as non-commercial. Their terms treat a nonprofit project that *generates revenue* as commercial, and the event may involve paid registration.
- **Authentication:** Domain-based, so no API key appears in the code.
  - Property "pcaga2027.org": `*.pcaga2027.org` with "Allow All Subdomains" on. This matches `www.pcaga2027.org` and the bare `pcaga2027.org`.
  - Squarespace preview domain `saxophone-roadrunner-x62l.squarespace.com` is **not yet authorized**, because a property holds one domain. If needed, create a second property with subdomain `saxophone-roadrunner-x62l`, domain `squarespace.com`, and "Allow All Subdomains" **off**. Never authorize `*.squarespace.com`.
  - localhost and 127.0.0.1 work without configuration, which is useful for local development.
  - Domain auth checks the page the map appears on, so hosting JS/CSS/JSON elsewhere doesn't affect it.

## Current state of the code

`ga2027-map.html` is a single self-contained snippet currently pasted into a Squarespace Code block. Features:

- Map height `clamp(560px, 80vh, 900px)`, centered near `[43.0395, -87.9160]`, zoom 16.
- Custom `L.divIcon` pins color-coded to match the committee's PDF map: yellow letters for parking (A–F), green numbers for hotels (1–8), navy for transportation (Tr, Ld), blue for the Baird Center, and a red ⛔ marker for the no-left-turn.
- Popups show name, price ($–$$$), volunteer-pass status, notes, and optional `links: [{text, url}]`.
- Layer toggles (Parking, Hotels, Transportation) and a bottom-left legend.
- Scroll-wheel zoom turns on only after the user clicks the map, and turns off on mouseout.
- A `SHOW_COORDS` flag: while true, clicking the map shows lat/lng for fixing pin positions. **It must be false in production.**
- A CSS fix forces dark text (`#222`) in the legend, popups, and layer control, because the Squarespace section uses light text and the legend text was rendering white-on-white.

### Data (from the committee's PDF, "GA_2027_PCA_Area_Map_004")

All coordinates are **approximate estimates** and need verification.

- **Parking** (* = volunteer pass lot): A Baird Center Garage ($$$)*; B 6th & State Lot ($$)*; C 332 State Lot ($$)*; D Symphony (MSO) Lot ($$$)*; E 3rd & Wells Lot ($$$)*; F 401 W Wisconsin Ave ($$), accessed from Vel R Phillips Ave.
- **Hotels:** 1 Hilton; 2 The Marc; 3 DoubleTree; 4 SpringHill Suites (Marriott); 5 Hyatt Regency; 6 Fairfield (Marriott); 7 Courtyard (Marriott); 8 Hampton Inn.
- **Transportation:** Amtrak Station; Loading Dock (Baird Center).

### Local knowledge to preserve on the map

- **No-left-turn trap:** Eastbound W Wisconsin Ave can't turn left onto N Dr. MLK Jr. Dr. (a two-way street). Westbound traffic can turn right there without trouble. The collaborator should supply the recommended alternate-route wording.
- **The Baird Center spans Wells Street.** The street passes beneath the building, and many maps render this inconsistently. Consider drawing it explicitly as a labeled polyline or polygon.

## Next task: restructure for hosted updates

Split the snippet so updates happen outside Squarespace:

1. `ga-map.css` for the styles.
2. `ga-map.js` for the map logic. It should `fetch()` the data file and render from it, and fail gracefully with a visible message if the fetch fails.
3. `places.json` for all places, notes, and links. This is the file that changes most.
4. A minimal Squarespace embed snippet that's set once and never edited: the Leaflet CSS/JS from unpkg, our CSS, `<div id="gaMap"></div>`, and our JS.

**Planned hosting:** S3 + CloudFront in my AWS account.

- Use short cache lifetimes on files that change, e.g. `Cache-Control: max-age=300` on `places.json`.
- Write a deploy script that runs `aws s3 sync` with the right Cache-Control and Content-Type per file, followed by `aws cloudfront create-invalidation`.
- Configure CORS to allow `https://www.pcaga2027.org`, `https://pcaga2027.org`, and `https://saxophone-roadrunner-x62l.squarespace.com`, because `places.json` is loaded with `fetch()`.
- Avoid versioned filenames in the embed, since that would require editing Squarespace on every update.
- **Unresolved concern:** continuity. If I step back, someone else needs a way to update the map. GitHub Pages (which the collaborator could edit in the browser) or a published Google Sheet as the data source are alternatives worth discussing before committing to AWS.

## Backlog

- Verify and correct every pin's coordinates, then set `SHOW_COORDS` to false.
- Add pre-pay and app links for each parking lot and booking links for each hotel (pending from the collaborator).
- Finalize the no-left-turn alternate-route wording.
- Optionally draw the Wells Street pass-through under the Baird Center.
- Intro text for above the map has been drafted separately in Squarespace; it isn't part of this repo.

## Working preferences

- I'm comfortable with code and AWS, so skip beginner explanations.
- Keep everything licensing-clean: pin dependency versions, keep attribution intact, and flag anything with unclear terms.
