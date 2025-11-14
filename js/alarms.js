// js/alarms.js (full updated)
let map;
let objectMarker;
let carOverlay;       // custom HTML overlay (for car)
let carPosition = null; // {lat, lng}
let trailPolyline;
let trailPoints = []; // array of google.maps.LatLng
let trailMaxPoints = 500; // limit trail length
let heatmap;
let heatmapPoints = []; // array of google.maps.LatLng
let updateInterval;    // original fallback interval id
let carAnimating = false;
let lastAnimation = null;
let mapBoundsControl;  // optional

// Custom Overlay class for HTML marker
class CarOverlay extends google.maps.OverlayView {
    constructor(position, map, options = {}) {
        super();
        this.position = position;
        this.map = map;
        this.div = null;
        this.speed = options.speed || 0;
        this.bearing = options.bearing || 0;
        this.acc = options.acc || -1;
        this.altitude = options.altitude || null;
        this.setMap(map);
    }

    onAdd() {
        this.div = document.createElement('div');
        this.div.className = 'car-marker';

        // shadow (optional)
        const shadow = document.createElement('div');
        shadow.className = 'shadow';
        shadow.style.background = 'radial-gradient(circle at 30% 30%, rgba(0,0,0,0.4), rgba(0,0,0,0))';
        shadow.style.width = '48px';
        shadow.style.height = '48px';
        this.div.appendChild(shadow);

        // speed badge
        const speedBadge = document.createElement('div');
        speedBadge.className = 'speed-badge';
        speedBadge.innerText = this.speed > 0 ? Math.round(this.speed * 3.6) + ' km/h' : '';
        this.div.appendChild(speedBadge);
        this.speedBadgeEl = speedBadge;

        // car SVG (arrow-like)
        const carSvg = document.createElement('div');
        carSvg.className = 'car-shape';
        carSvg.innerHTML = `
            <svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
              <g>
                <path d="M32 4 L44 24 L44 44 L20 44 L20 24 Z" fill="#2b8cff" stroke="#003a8c" stroke-width="1"/>
                <circle cx="24" cy="48" r="3" fill="#222" />
                <circle cx="40" cy="48" r="3" fill="#222" />
              </g>
            </svg>
        `;
        this.carSvgEl = carSvg;
        this.div.appendChild(carSvg);

        // append to overlayLayer
        const panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(this.div);
    }

    draw() {
        if (!this.div) return;
        const projection = this.getProjection();
        const pos = projection.fromLatLngToDivPixel(this.position);
        if (!pos) return;
        // center the div on position
        this.div.style.left = (pos.x - 24) + 'px';
        this.div.style.top = (pos.y - 24) + 'px';

        // rotation by bearing
        this.div.style.transform = `rotate(${this.bearing}deg)`;

        // update speed badge
        if (this.speedBadgeEl) {
            this.speedBadgeEl.innerText = this.speed > 0 ? Math.round(this.speed * 3.6) + ' km/h' : '';
        }
    }

    update(position, opts = {}) {
        if (position) this.position = position;
        if (opts.speed !== undefined) this.speed = opts.speed;
        if (opts.bearing !== undefined) this.bearing = opts.bearing;
        if (opts.acc !== undefined) this.acc = opts.acc;
        if (opts.altitude !== undefined) this.altitude = opts.altitude;
        // trigger redraw
        if (this.div) this.draw();
    }

    onRemove() {
        if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div);
            this.div = null;
        }
    }
}

// Open map modal and init map
function openMapModal(oLat, oLan, idUser) {
    const modal = new bootstrap.Modal(document.getElementById('modalMap'));
    modal.show();

    setTimeout(() => {
        initMap(oLat, oLan, idUser);
    }, 400);
}

function initMap(oLat, oLan, idUser) {
    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };

    // Initialize map only once
    if (!map) {
        map = new google.maps.Map(document.getElementById('mapContainer'), {
            center: objectPos,
            zoom: 14,
            mapId: "DEMO_MAP_ID",
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            gestureHandling: 'greedy'
        });
    } else {
        map.setCenter(objectPos);
    }

    // object marker
    if (!objectMarker) {
        objectMarker = new google.maps.Marker({
            position: objectPos,
            map: map,
            title: "Обект",
            icon: {
                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            }
        });
    } else {
        objectMarker.setPosition(objectPos);
    }

    // init trail polyline
    if (!trailPolyline) {
        trailPolyline = new google.maps.Polyline({
            map: map,
            path: [],
            geodesic: true,
            strokeColor: "#00b300",
            strokeOpacity: 0.9,
            strokeWeight: 4
        });
    }

    // init heatmap
    if (!heatmap) {
        heatmap = new google.maps.visualization.HeatmapLayer({
            data: [],
            radius: 30,
            dissipating: true,
            opacity: 0.7,
            map: map
        });
    }

    // create carOverlay at object position initially
    if (!carOverlay) {
        carOverlay = new CarOverlay(new google.maps.LatLng(objectPos.lat, objectPos.lng), map, {});
    } else {
        carOverlay.update(new google.maps.LatLng(objectPos.lat, objectPos.lng), {});
    }

    // call fallback AJAX updates every 10s (in case WebView not available)
    clearInterval(updateInterval);
    updateInterval = setInterval(() => updateCarPositionFallback(idUser), 10000);
    // initial fallback fetch immediately
    updateCarPositionFallback(idUser);
}

/* ----------------------------
   Fallback: fetch last GPS from server
   (If WebView not running / offline)
   ---------------------------- */
function updateCarPositionFallback(idUser) {
    $.ajax({
        url: 'system/get_geo_position.php',
        method: 'GET',
        data: { idUser: idUser },
        success: function(response) {
            if (!response) return;
            try {
                const [lat, lon] = response.trim().split(',').map(parseFloat);
                // treat as incoming update from server (no bearing/speed provided)
                updateCarFromWebView(lat, lon, 0, 0, -1);
            } catch (e) {
                console.warn('Грешка при fallback позиция:', e);
            }
        },
        error: function() {
            console.error('Грешка при извличане на позиция (fallback).');
        }
    });
}

/* ----------------------------
   Main entry point for WebView updates
   lat,lng: numbers
   speed: m/s (as coming from Android)
   bearing: degrees
   acc: meters
   altitude: meters
   ---------------------------- */
window.updateCarFromWebView = function(lat, lng, speed, bearing, acc, altitude) {
    if (!map) {
        // map not open; store last and return
        window.__lastGps = { lat, lng, speed, bearing, acc, altitude, ts: Date.now() };
        return;
    }

    const newPos = new google.maps.LatLng(lat, lng);

    // Add to trail + heatmap
    trailPoints.push(newPos);
    heatmapPoints.push(newPos);

    // Trim arrays
    if (trailPoints.length > trailMaxPoints) trailPoints.shift();
    if (heatmapPoints.length > trailMaxPoints) heatmapPoints.shift();

    // Update polyline path & heatmap data
    trailPolyline.setPath(trailPoints);
    heatmap.setData(heatmapPoints);

    // Smooth animate marker from carPosition to newPos
    if (!carPosition) {
        // First position: teleport
        carOverlay.update(newPos, { speed: speed, bearing: bearing, acc: acc, altitude: altitude });
        carPosition = newPos;
        // Adjust viewport to include object + car
        fitMapToMarkers();
        return;
    }

    // If too close and no significant change, just update without animation
    const distanceMeters = haversineDistance(carPosition.lat(), carPosition.lng(), newPos.lat(), newPos.lng());
    if (distanceMeters < 1) {
        // small jitter: update visuals only
        carOverlay.update(newPos, { speed: speed, bearing: bearing, acc: acc, altitude: altitude });
        carPosition = newPos;
        return;
    }

    // Determine animation duration proportional to distance (min 400ms, max 3000ms)
    const duration = Math.max(400, Math.min(3000, (distanceMeters / 10) * 200)); // heuristic

    // Cancel previous animation if any
    if (lastAnimation && lastAnimation.cancel) lastAnimation.cancel();

    // Animated interpolation using requestAnimationFrame
    const start = { lat: carPosition.lat(), lng: carPosition.lng() };
    const end = { lat: newPos.lat(), lng: newPos.lng() };
    const startTime = performance.now();
    let cancelled = false;

    lastAnimation = {
        cancel: () => { cancelled = true; }
    };

    function step(now) {
        if (cancelled) return;
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        // easeInOutQuad
        const tt = t<0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
        const curLat = start.lat + (end.lat - start.lat) * tt;
        const curLng = start.lng + (end.lng - start.lng) * tt;
        const curPos = new google.maps.LatLng(curLat, curLng);

        // Interpolate bearing smoothly (shortest angle)
        const curBearing = interpolateBearing(carOverlay.bearing || 0, bearing, tt);

        // update overlay position and rotation/speed
        carOverlay.update(curPos, { speed: speed, bearing: curBearing, acc: acc, altitude: altitude });

        // optional: pan map a little toward car
        // smooth pan: center between object and car or pan to car
        // map.panTo(curPos);

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            // finish
            carPosition = newPos;
            // Update final position to exact coords/bearing
            carOverlay.update(newPos, { speed: speed, bearing: bearing, acc: acc, altitude: altitude });
            // Optionally adjust viewport
            fitMapToMarkers();
        }
    }

    requestAnimationFrame(step);
};

/* ----------------------------
   Helper: fit map to show object + car
   ---------------------------- */
function fitMapToMarkers() {
    if (!map || !objectMarker || !carPosition) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(objectMarker.getPosition());
    bounds.extend(carPosition);
    map.fitBounds(bounds, 100); // padding
}

/* ----------------------------
   Utility: haversine distance in meters
   ---------------------------- */
function haversineDistance(lat1, lon1, lat2, lon2) {
    function toRad(x) { return x * Math.PI / 180; }
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/* ----------------------------
   Helper: interpolate bearing shortest way
   ---------------------------- */
function interpolateBearing(fromDeg, toDeg, t) {
    // Normalize
    const diff = ((((toDeg - fromDeg) % 360) + 540) % 360) - 180;
    return fromDeg + diff * t;
}

/* ----------------------------
   Optional: expose a function to clear trail
   ---------------------------- */
window.clearCarTrail = function() {
    trailPoints = [];
    heatmapPoints = [];
    if (trailPolyline) trailPolyline.setPath([]);
    if (heatmap) heatmap.setData([]);
};
