// js/alarms.js (full updated)

// === alarms.js ===

// --- Глобални променливи ---
let alarmSound = null;
let alarmActive = false;
let soundEnabled = true; // звукът по подразбиране е активен
let isAndroidWebView = false;
let isDesktopBrowser = false;

// --- Засичане на платформата ---
function detectEnvironment() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    if (/Android/i.test(ua) && /wv/.test(ua)) {
        isAndroidWebView = true;
        console.log('📱 Android WebView');
    } else {
        isDesktopBrowser = true;
        console.log('💻 Desktop/Browser');
    }
}
detectEnvironment();

// --- Извикване на Android метод ---
function callAndroidSound(state) {
    try {
        if (typeof Android !== 'undefined' && typeof Android.playSoundAlarm === 'function') {
            Android.playSoundAlarm(state);
        } else if (typeof playSoundAlarm === 'function') {
            playSoundAlarm(state);
        } else {
            console.warn('⚠️ Няма Android метод за звук.');
        }
    } catch (err) {
        console.error('❌ Android звук грешка:', err);
    }
}

// --- Инициализация на звука за браузър ---
function initBrowserSound() {
    if (!alarmSound) {
        alarmSound = new Audio('sounds/alarm.mp3');
        alarmSound.loop = true;
        console.log('🔊 Инициализация на звук.');
    }
}

// --- Разрешаване на звука при първо взаимодействие (браузър) ---
if (isDesktopBrowser) {
    document.addEventListener('click', initBrowserSound, { once: true });
    document.addEventListener('keydown', initBrowserSound, { once: true });
}

// --- Показване на визуален индикатор ---
function showAlarmIndicator() {
    let el = document.getElementById('alarmIndicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'alarmIndicator';
        el.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: red;
                color: white;
                font-size: 2rem;
                border-radius: 50%;
                width: 70px;
                height: 70px;
                display: flex;
                justify-content: center;
                align-items: center;
                box-shadow: 0 0 20px red;
                z-index: 9999;
                animation: pulse 1s infinite;
            ">🚨</div>
        `;
        document.body.appendChild(el);

        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.6; }
                100% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    el.classList.add('active');
    alarmActive = true;
}

// --- Скриване на индикатора ---
function hideAlarmIndicator() {
    const el = document.getElementById('alarmIndicator');
    if (el) el.remove();
    alarmActive = false;
}

// --- Стартиране на аларма ---
function triggerAlarmSound() {
    if (!soundEnabled) return;
    showAlarmIndicator();

    if (isAndroidWebView) {
        callAndroidSound(1);
    } else if (alarmSound) {
        alarmSound.play().catch(err => console.warn('🔇 Play error:', err));
    }
}

// --- Спиране на аларма ---
function stopAlarmSound() {
    hideAlarmIndicator();

    if (isAndroidWebView) {
        callAndroidSound(0);
    } else if (alarmSound && !alarmSound.paused) {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }
}

// --- Обновяване на алармите ---
function updateAlarms(data) {
    $('#alarmPanel').html(data);

    const hasActiveAlarm = $('#alarmPanel .bg-danger, #alarmPanel .alarm-new').length > 0;

    if (hasActiveAlarm && !alarmActive) {
        triggerAlarmSound();
    } else if (!hasActiveAlarm && alarmActive) {
        stopAlarmSound();
    }
}

// --- Избор на аларма ---
function selectAlarm(aID) {
    $.ajax({
        url: 'system/update_alarm.php',
        method: 'POST',
        data: { aID: aID },
        dataType: 'json',
        success: function(res) {
            if (res.status === 'success') {
                const li = $('#alarm-' + aID);
                li.removeClass('bg-danger alarm-new').addClass('bg-success');
                stopAlarmSound();
            } else {
                console.warn(res.msg);
            }
        },
        error: function() {
            console.error('Грешка при update на алармата');
        }
    });
}

// --- Ръчен бутон за звук ---
$(document).ready(function () {
    $('#toggleSoundBtn').on('click', function () {
        soundEnabled = !soundEnabled;
        const icon = soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark';
        const text = soundEnabled ? 'Звук: Вкл.' : 'Звук: Изкл.';

        $(this).html(`<i class="fa-solid ${icon} me-1"></i> ${text}`);

        // Ако е изключен звукът — спираме и активната аларма
        if (!soundEnabled && alarmActive) stopAlarmSound();
    });
});

// --- Избор на аларма (зареждане в main-content) ---
function selectAlarm(aID, oName) {
    // Визуален ефект при избор
    $('#alarmPanel li').removeClass('active');
    $('#alarm-' + aID).addClass('active');

    // Зареждане на съдържанието в main-content
    $('.main-content').html(`
        <div class="text-center py-5 text-muted">
            <i class="fa-solid fa-spinner fa-spin fa-2x"></i><br>Зареждане на данните за ${oName}...
        </div>
    `);

    $.ajax({
        url: 'system/alarms_info.php',
        method: 'GET',
        data: { aID: aID },
        success: function (html) {
            $('.main-content').html(html);

            // след зареждане на подробностите — спираме алармения звук
            stopAlarmSound();
        },
        error: function () {
            $('.main-content').html(`
                <div class="alert alert-danger m-3">
                    ⚠️ Възникна грешка при зареждане на информацията за алармата.
                </div>
            `);
        }
    });
}

// =========================
// 📚 Архивна секция под картата с автообновяване и статус
// =========================

let archiveInterval = null;
let lastArchiveUpdate = null;
let archiveParams = {};

function toggleArchiveSection(oRec, sID, oNum, zTime) {
    const section = document.getElementById('archiveSection');

    if (section.style.display === 'none') {
        section.style.display = 'block';
        archiveParams = { oRec, sID, oNum, zTime };
        loadArchiveContent();

        // стартира автоматично презареждане
        archiveInterval = setInterval(() => {
            loadArchiveContent();
        }, 10000);

        // стартираме и таймер за визуализация на изминалото време
        setInterval(updateArchiveTimer, 1000);

    } else {
        section.style.display = 'none';
        clearInterval(archiveInterval);
    }
}

function loadArchiveContent() {
    const content = document.getElementById('archiveContent');
    const statusText = document.getElementById('archiveStatusText');
    const statusIcon = document.getElementById('archiveStatusIcon');

    statusIcon.classList.remove('text-danger');
    statusIcon.classList.add('text-warning');
    statusText.textContent = 'Обновяване...';

    $.ajax({
        url: 'system/get_object_archiv.php',
        method: 'GET',
        data: {
            oRec: archiveParams.oRec,
            sID: archiveParams.sID,
            oNum: archiveParams.oNum,
            zTime: archiveParams.zTime,
            listSize: 720,
            listLimit: 20
        },
        success: function (response) {
            content.innerHTML = response.trim()
                ? response
                : '<div class="text-center text-muted py-2">Няма архивни данни.</div>';
            lastArchiveUpdate = new Date();
            statusIcon.classList.remove('text-warning', 'text-danger');
            statusIcon.classList.add('text-success');
            updateArchiveTimer();
        },
        error: function () {
            content.innerHTML = '<div class="text-center text-danger py-2">Грешка при зареждане на архива.</div>';
            statusIcon.classList.remove('text-success', 'text-warning');
            statusIcon.classList.add('text-danger');
            statusText.textContent = 'Грешка при обновяване';
        }
    });
}

function updateArchiveTimer() {
    const statusText = document.getElementById('archiveStatusText');
    if (!lastArchiveUpdate) return;

    const diff = Math.floor((new Date() - lastArchiveUpdate) / 1000);
    const secs = diff % 60;
    const mins = Math.floor(diff / 60);
    const timeStr = mins > 0
        ? `Обновено преди ${mins}м ${secs}с`
        : `Обновено преди ${secs}с`;

    statusText.textContent = `✓ ${timeStr}`;
}

// Ръчно обновяване с бутона ⟳
function manualRefreshArchive() {
    loadArchiveContent();
}


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

//function initMap(oLat, oLan, idUser) {
//    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };
//
//    // Initialize map only once
//    if (!map) {
//        map = new google.maps.Map(document.getElementById('mapContainer'), {
//            center: objectPos,
//            zoom: 14,
//            mapId: "INTELLI_MAP_ID",
//            mapTypeId: google.maps.MapTypeId.ROADMAP,
//            gestureHandling: 'greedy'
//        });
//    } else {
//        map.setCenter(objectPos);
//    }
//
//    // object marker
//    if (!objectMarker) {
//        objectMarker = new google.maps.Marker({
//            position: objectPos,
//            map: map,
//            title: "Обект",
//            icon: {
//                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
//            }
//        });
//    } else {
//        objectMarker.setPosition(objectPos);
//    }
//
//    // init trail polyline
//    if (!trailPolyline) {
//        trailPolyline = new google.maps.Polyline({
//            map: map,
//            path: [],
//            geodesic: true,
//            strokeColor: "#00b300",
//            strokeOpacity: 0.9,
//            strokeWeight: 4
//        });
//    }
//
//    // init heatmap
//    if (!heatmap) {
//        heatmap = new google.maps.visualization.HeatmapLayer({
//            data: [],
//            radius: 30,
//            dissipating: true,
//            opacity: 0.7,
//            map: map
//        });
//    }
//
//    // create carOverlay at object position initially
//    if (!carOverlay) {
//        carOverlay = new CarOverlay(new google.maps.LatLng(objectPos.lat, objectPos.lng), map, {});
//    } else {
//        carOverlay.update(new google.maps.LatLng(objectPos.lat, objectPos.lng), {});
//    }
//
//    // call fallback AJAX updates every 10s (in case WebView not available)
//    clearInterval(updateInterval);
//    updateInterval = setInterval(() => updateCarPositionFallback(idUser), 10000);
//    // initial fallback fetch immediately
//    updateCarPositionFallback(idUser);
//}

function initMap(oLat, oLan, idUser) {
    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };

    // Ако имаме стара карта – само центрираме
    if (!map) {
        map = new google.maps.Map(document.getElementById('mapContainer'), {
            center: objectPos,
            zoom: 14,
            mapId: "INTELLI_MAP_ID",
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
            icon: { url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
        });
    } else {
        objectMarker.setPosition(objectPos);
    }

    // 🔴 Нулиране на стария carOverlay и trail, ако отваряме друг обект
    if (carOverlay) {
        carOverlay.setMap(null); // премахваме от старата карта
        carOverlay = null;
    }
    carPosition = null;

    trailPoints = [];
    heatmapPoints = [];

    if (!trailPolyline) {
        trailPolyline = new google.maps.Polyline({
            map: map,
            path: [],
            geodesic: true,
            strokeColor: "#00b300",
            strokeOpacity: 0.9,
            strokeWeight: 4
        });
    } else {
        trailPolyline.setMap(map);
        trailPolyline.setPath([]);
    }

    if (!heatmap) {
        heatmap = new google.maps.visualization.HeatmapLayer({
            data: [],
            radius: 30,
            dissipating: true,
            opacity: 0.7,
            map: map
        });
    } else {
        heatmap.setMap(map);
        heatmap.setData([]);
    }

    // създаваме нов carOverlay
    carOverlay = new CarOverlay(new google.maps.LatLng(objectPos.lat, objectPos.lng), map, {});

    // fallback AJAX updates every 10s
    clearInterval(updateInterval);
    updateInterval = setInterval(() => updateCarPositionFallback(idUser), 10000);

    // initial fallback fetch immediately
    updateCarPositionFallback(idUser);

    // ако вече има последни GPS координати (WebView)
    if (window.__lastGps && typeof updateCarFromWebView === 'function') {
        const gps = window.__lastGps;
        updateCarFromWebView(gps.lat, gps.lng, gps.speed, gps.bearing, gps.acc, gps.altitude);
    }
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
