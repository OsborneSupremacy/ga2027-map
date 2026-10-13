// GA 2027 Area Map. Renders the places in places.json onto #gaMap.
//
// places.json is resolved relative to this script's own URL, so the Squarespace embed never needs
// to name it. A data-places attribute on #gaMap overrides that if it's ever needed.
//
// Coordinate-picking mode (click the map to read lat/lng) is off unless the page URL contains
// "gaCoords", e.g. https://www.pcaga2027.org/map?gaCoords. Nothing has to be switched off before
// going live.
(function () {
  var script = document.currentScript;
  var el = document.getElementById('gaMap');
  if (!el) return;

  // The embed only has a bare #gaMap, so wrap it in a card with a title header here
  var wrap = document.createElement('div');
  wrap.className = 'ga-wrap';
  wrap.innerHTML =
    '<div class="ga-header"><h2>GA 2027 Area Map' +
    '<span class="sub">Parking, hotels, dining &amp; transportation near the Baird Center</span>' +
    '</h2></div>';
  el.parentNode.insertBefore(wrap, el);
  wrap.appendChild(el);

  var placesUrl = el.getAttribute('data-places') ||
    new URL('places.json', script ? script.src : window.location.href).href;
  var showCoords = /gaCoords/.test(window.location.search + window.location.hash);

  var GROUP_NAMES = { parking: 'Parking', hotel: 'Hotels', dining: 'Dining', transport: 'Transportation' };

  // Line icons for the pins, drawn on a 24x24 grid and stroked in the pin's text color. Each type
  // has a default; "icon" in places.json overrides it for one place. Keep the names in sync with
  // scripts/validate-places.mjs.
  var ICONS = {
    parking: '<path d="M8 20V4h5.5a4.5 4.5 0 0 1 0 9H8"/>',
    hotel: '<path d="M3 5v14M3 15h18v4M21 15v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11.5" r="1.8"/>',
    dining: '<path d="M5 3v5a3 3 0 0 0 6 0V3M8 3v18M19 21V3c-2.5 1.5-4 4-4 8v3h4"/>',
    building: '<path d="M3 9l9-5 9 5M4 20h16M6 11v6M10 11v6M14 11v6M18 11v6"/>',
    train: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12M9.5 13h.01M14.5 13h.01M9 19l-2 3M15 19l2 3"/>',
    truck: '<path d="M2 5h11v10H2zM13 8h4l4 4v3h-8"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
    warning: '<path d="M12 5v9M12 18.5h.01"/>'
  };
  var DEFAULT_ICONS = {
    parking: 'parking', hotel: 'hotel', dining: 'dining', venue: 'building', transport: 'train', warning: 'warning'
  };

  function pinHtml(type, icon) {
    return '<div class="ga-pin ' + esc(type) + '"><svg viewBox="0 0 24 24" aria-hidden="true">' +
      (ICONS[icon || DEFAULT_ICONS[type]] || '') + '</svg></div>';
  }

  function fail(message) {
    el.innerHTML = '';
    var div = document.createElement('div');
    div.className = 'ga-error';
    div.textContent = message;
    el.appendChild(div);
  }

  // places.json is edited by hand in the GitHub web editor, so treat every string in it as text,
  // never as markup.
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function safeUrl(url) {
    try {
      var u = new URL(url);
      return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
    } catch (e) {
      return null;
    }
  }

  function popupHtml(p) {
    var html = '<div class="ga-popup"><b>' + esc(p.name) + '</b>';
    if (p.price) html += '<br>Price: ' + esc(p.price);
    if (p.volunteer) html += '<br>Volunteer pass lot';
    if (p.note) html += '<br><span class="note">' + esc(p.note) + '</span>';
    (p.links || []).forEach(function (l) {
      var url = safeUrl(l.url);
      if (url) html += '<br><a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(l.text) + '</a>';
    });
    if (p.type !== 'warning') html += directionsHtml(p);
    return html + '</div>';
  }

  // Route to the pin's coordinates rather than its name, since parking lots have no address the
  // map apps can search for. On a phone, both links open the installed app; elsewhere they open the
  // web version.
  function directionsHtml(p) {
    var dest = p.lat + ',' + p.lng;
    var google = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dest);
    var apple = 'https://maps.apple.com/?daddr=' + encodeURIComponent(dest) +
      '&q=' + encodeURIComponent(p.name);
    return '<div class="directions"><span>Directions:</span>' +
      '<a href="' + esc(google) + '" target="_blank" rel="noopener">Google Maps</a>' +
      '<a href="' + esc(apple) + '" target="_blank" rel="noopener">Apple Maps</a></div>';
  }

  function render(data) {
    var places = data.places;
    var map = L.map(el, { scrollWheelZoom: false }).setView(data.view.center, data.view.zoom);

    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var groups = { other: L.layerGroup().addTo(map) };
    Object.keys(GROUP_NAMES).forEach(function (type) {
      groups[type] = L.layerGroup().addTo(map);
    });

    places.forEach(function (p) {
      var size = p.type === 'venue' ? 34 : 26;
      var icon = L.divIcon({
        className: '',
        html: pinHtml(p.type, p.icon),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
      L.marker([p.lat, p.lng], { icon: icon, title: p.name })
        .bindPopup(popupHtml(p))
        .addTo(groups[p.type] || groups.other);
    });

    // Toggle layers on and off
    var overlays = {};
    Object.keys(GROUP_NAMES).forEach(function (type) {
      overlays[GROUP_NAMES[type]] = groups[type];
    });
    L.control.layers(null, overlays, { collapsed: window.innerWidth < 600 }).addTo(map);

    // Legend
    var legend = L.control({ position: 'bottomleft' });
    legend.onAdd = function () {
      var div = L.DomUtil.create('div', 'ga-legend');
      div.innerHTML =
        '<span class="key">' + pinHtml('parking') + 'Parking</span>' +
        '<span class="key">' + pinHtml('hotel') + 'Hotels</span>' +
        '<span class="key">' + pinHtml('dining') + 'Dining</span><br>' +
        'Tap any pin for details. $–$$$ = relative price.';
      return div;
    };
    legend.addTo(map);

    // Enable scroll-zoom only after the user clicks the map (avoids hijacking page scroll)
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout', function () { map.scrollWheelZoom.disable(); });

    if (showCoords) {
      map.on('click', function (e) {
        L.popup().setLatLng(e.latlng)
          .setContent('lat: ' + e.latlng.lat.toFixed(5) + '<br>lng: ' + e.latlng.lng.toFixed(5))
          .openOn(map);
      });
    }
  }

  var UNAVAILABLE = 'The area map is temporarily unavailable. Please try again later.';

  if (typeof L === 'undefined') {
    fail(UNAVAILABLE);
    return;
  }

  // no-cache means "revalidate", not "don't cache": a returning visitor gets a cheap 304 when
  // nothing changed, and sees an update as soon as it's published rather than when their copy
  // expires.
  fetch(placesUrl, { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + placesUrl);
      return res.json();
    })
    .then(render)
    .catch(function (err) {
      if (window.console) console.error('GA map:', err);
      fail(UNAVAILABLE);
    });
})();
