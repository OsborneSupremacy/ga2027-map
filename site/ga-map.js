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
    '<span class="sub">Parking, hotels &amp; transportation near the Baird Center</span>' +
    '</h2></div>';
  el.parentNode.insertBefore(wrap, el);
  wrap.appendChild(el);

  var placesUrl = el.getAttribute('data-places') ||
    new URL('places.json', script ? script.src : window.location.href).href;
  var showCoords = /gaCoords/.test(window.location.search + window.location.hash);

  var GROUP_NAMES = { parking: 'Parking', hotel: 'Hotels', transport: 'Transportation' };

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
    return html + '</div>';
  }

  // "A–F" from the labels of one type, in the order they appear in the file
  function labelRange(places, type) {
    var labels = places.filter(function (p) { return p.type === type; })
      .map(function (p) { return p.label; });
    if (!labels.length) return '';
    return labels.length === 1 ? labels[0] : labels[0] + '–' + labels[labels.length - 1];
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
        html: '<div class="ga-pin ' + esc(p.type) + '">' + esc(p.label) + '</div>',
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
        '<b>Parking</b> ' + esc(labelRange(places, 'parking')) +
        ' &nbsp; <b>Hotels</b> ' + esc(labelRange(places, 'hotel')) + '<br>' +
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
