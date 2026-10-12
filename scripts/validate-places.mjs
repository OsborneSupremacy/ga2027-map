// Checks places.json before it's published. Run by the deploy workflow, and locally with:
//
//   node scripts/validate-places.mjs
//
// A bad edit fails the deploy here instead of breaking the live map. Unknown keys are errors,
// because a typo like "notes" for "note" would otherwise be silently ignored.
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? new URL('../site/places.json', import.meta.url);
const errors = [];

let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`places.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

const TYPES = ['parking', 'hotel', 'transport', 'venue', 'warning'];
const PLACE_KEYS = ['type', 'label', 'name', 'price', 'volunteer', 'note', 'links', 'lat', 'lng'];

// A generous box around downtown Milwaukee. Catches swapped lat/lng and dropped minus signs.
const BOUNDS = { lat: [42.9, 43.2], lng: [-88.1, -87.8] };

const isString = (v) => typeof v === 'string' && v.trim() !== '';
const inRange = (v, [min, max]) => typeof v === 'number' && v >= min && v <= max;

function checkUrl(where, url) {
  try {
    if (new URL(url).protocol !== 'https:') errors.push(`${where}: url must start with https://`);
  } catch {
    errors.push(`${where}: url is not a valid URL: ${JSON.stringify(url)}`);
  }
}

if (!data || typeof data !== 'object' || Array.isArray(data)) {
  errors.push('top level must be an object with "view" and "places"');
} else {
  const { view, places } = data;

  if (!view || !Array.isArray(view.center) || view.center.length !== 2 ||
      !inRange(view.center[0], BOUNDS.lat) || !inRange(view.center[1], BOUNDS.lng)) {
    errors.push('view.center must be [lat, lng] in downtown Milwaukee');
  }
  if (!view || !Number.isInteger(view.zoom) || view.zoom < 1 || view.zoom > 20) {
    errors.push('view.zoom must be a whole number from 1 to 20');
  }

  if (!Array.isArray(places) || places.length === 0) {
    errors.push('"places" must be a non-empty list');
  } else {
    const seen = new Set();
    places.forEach((p, i) => {
      const where = `places[${i}]${p && isString(p.name) ? ` (${p.name})` : ''}`;
      if (!p || typeof p !== 'object') return errors.push(`${where}: must be an object`);

      for (const key of Object.keys(p)) {
        if (!PLACE_KEYS.includes(key)) errors.push(`${where}: unknown key "${key}"`);
      }
      if (!TYPES.includes(p.type)) errors.push(`${where}: type must be one of ${TYPES.join(', ')}`);
      if (!isString(p.label) || [...p.label].length > 3) errors.push(`${where}: label must be 1–3 characters`);
      if (!isString(p.name)) errors.push(`${where}: name is required`);
      if (!inRange(p.lat, BOUNDS.lat)) errors.push(`${where}: lat must be a number near ${BOUNDS.lat.join('–')}`);
      if (!inRange(p.lng, BOUNDS.lng)) errors.push(`${where}: lng must be a number near ${BOUNDS.lng.join('–')} (note the minus sign)`);
      if (p.price !== undefined && !/^\${1,3}$/.test(p.price)) errors.push(`${where}: price must be "$", "$$" or "$$$"`);
      if (p.volunteer !== undefined && typeof p.volunteer !== 'boolean') errors.push(`${where}: volunteer must be true or false, without quotes`);
      if (p.note !== undefined && !isString(p.note)) errors.push(`${where}: note must be text`);

      if (p.links !== undefined) {
        if (!Array.isArray(p.links)) {
          errors.push(`${where}: links must be a list`);
        } else {
          p.links.forEach((l, j) => {
            const lw = `${where} links[${j}]`;
            if (!l || !isString(l.text)) errors.push(`${lw}: text is required`);
            if (!l || !isString(l.url)) errors.push(`${lw}: url is required`);
            else checkUrl(lw, l.url);
            for (const key of Object.keys(l ?? {})) {
              if (key !== 'text' && key !== 'url') errors.push(`${lw}: unknown key "${key}"`);
            }
          });
        }
      }

      const id = `${p.type}/${p.label}`;
      if (seen.has(id)) errors.push(`${where}: another ${p.type} already uses label "${p.label}"`);
      seen.add(id);
    });
  }
}

if (errors.length) {
  console.error(`places.json has ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`places.json OK (${data.places.length} places)`);
