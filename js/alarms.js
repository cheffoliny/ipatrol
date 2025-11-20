// js/alarms.js (full patched version)
// === js/alarms.js ===

// --- Глобални променливи ---
let alarmSound = null;
let alarmActive = false;
let soundEnabled = true; // по подразбиране Вкл.
let isAndroidWebView = false;
let isDesktopBrowser = false;

// ============================================================================
//                  PLATFORM DETECTION
// ============================================================================
function detectEnvironment() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    // WebView detection + presence of Android JS interface
    if (/Android/i.test(ua) && (/(wv|Version\/)/i.test(ua) || typeof Android !== 'undefined')) {
        isAndroidWebView = true;
        console.log('📱 Android WebView detected');
    } else {
        isDesktopBrowser = true;
        console.log('💻 Desktop / Mobile Browser detected');
    }
}
detectEnvironment();


// ============================================================================
//          ANDROID WEBVIEW – CALL JAVA INTERFACE
// ============================================================================

function callAndroidStart(sound = "alarm") {
    try {
        if (isAndroidWebView && typeof Android !== 'undefined') {
            Android.startAlarm(sound);
            return;
        }
        console.warn("⚠️ Android.startAlarm недостъпен");
    } catch (e) {
        console.error("❌ callAndroidStart error:", e);
    }
}

function callAndroidStop() {
    try {
        if (isAndroidWebView && typeof Android !== 'undefined') {
            Android.stopAlarm();
            return;
        }
        console.warn("⚠️ Android.stopAlarm недостъпен");
    } catch (e) {
        console.error("❌ callAndroidStop error:", e);
    }
}

// ============================================================================
//     BROWSER AUDIO INITIALIZATION (DESKTOP / MOBILE, NOT ANDROID WEBVIEW)
// ============================================================================
function initBrowserSound() {
    if (alarmSound || isAndroidWebView) return;

    try {
        alarmSound = new Audio('sounds/alarm.mp3');
        alarmSound.loop = true;
        alarmSound.volume = 0.9;
        console.log('🔊 Browser audio initialized');
    } catch (err) {
        console.warn('⚠️ Неуспешна инициализация на Audio:', err);
    }
}

// За браузъри – разрешаване на звука при първо взаимодействие
if (!isAndroidWebView) {
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

// ============================================================================
//                          START ALARM
// ============================================================================
function triggerAlarmSound(soundFile = "alarm") {
    if (!soundEnabled) {
        console.log('🔇 Sound disabled by user');
        return;
    }

    alarmActive = true;
    showAlarmIndicator();

    if (isAndroidWebView) {
        callAndroidStart(soundFile);
    } else {
        initBrowserSound();
        if (alarmSound) {
            alarmSound.play().catch(err => {
                console.warn('🔇 Browser refused autoplay:', err);
            });
        }
    }
}

// ============================================================================
//                          STOP ALARM
// ============================================================================
function stopAlarmSound() {
    alarmActive = false;
    hideAlarmIndicator();

    if (isAndroidWebView) {
        callAndroidStop();
        return;
    }

    if (alarmSound) {
        try {
            alarmSound.pause();
            alarmSound.currentTime = 0;
        } catch (err) {
            console.warn('⚠️ stopAlarmSound error:', err);
        }
    }
}

// ============================================================================
//                  MAIN UPDATE HANDLER – SYNC WITH DATABASE
// ============================================================================
function updateAlarmsFromServer(response) {
    if (!response) return;

    // Зареждаме HTML панела
    $('#alarmPanel').html(response.html);

    // Синхронизация със статуса в БД
    if (response.hasActiveSound) {
        if (!alarmActive) {
            triggerAlarmSound(response.soundFile || "alarm");
        } else {
            console.log("🔔 Alarm already active");
        }
    } else {
        if (alarmActive) {
            stopAlarmSound();
        } else {
            console.log("🔕 No active alarms");
        }
    }
}

// --- Обновяване на алармите ---
// function updateAlarms(data) {
//     $('#alarmPanel').html(data);
//
//     const hasActiveAlarm = $('#alarmPanel .bg-danger, #alarmPanel .alarm-new').length > 0;
//
//     if (hasActiveAlarm && !alarmActive) {
//         triggerAlarmSound();
//     } else if (!hasActiveAlarm && alarmActive) {
//         stopAlarmSound();
//     }
// }

// --- Избор на аларма (зареждане в main-content) ---
function selectAlarm(aID, oName) {

    // Визуално маркираме избраната аларма
    $('#alarmPanel li').removeClass('active');
    $('#alarm-' + aID).addClass('active');

    // Изпращаме stop_play = 1
    $.post('system/update_alarm.php', { aID: aID }, function(res) {
        // След като stop_play е сменено → презареждаме алармите
        loadAlarms();
    }, 'json');

    // Показваме зареждане
    $('.main-content').html(`
        <div class="text-center py-5 text-muted">
            <i class="fa-solid fa-spinner fa-spin fa-2x"></i><br>Зареждане на данните за ${oName}...
        </div>
    `);

    // Зареждаме информацията за алармата
    $.ajax({
        url: 'system/alarms_info.php',
        method: 'GET',
        data: { aID: aID },
        success: function (html) {
            $('.main-content').html(html);
        },
        error: function () {
            $('.main-content').html(`
                <div class="alert alert-danger m-3">
                    ⚠️ Грешка при зареждане на информацията за алармата.
                </div>
            `);
        }
    });
}



// --- Ръчен бутон за звук (toggle) ---
$(document).ready(function () {
    $('#toggleSoundBtn').on('click', function () {
        soundEnabled = !soundEnabled;
        const icon = soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark';
        const text = soundEnabled ? 'Звук: Вкл.' : 'Звук: Изкл.';

        $(this).html(`<i class="fa-solid ${icon} me-1"></i> ${text}`);

        if (!soundEnabled && alarmActive) {
            // спираме и нативния/браузърния звук
            stopAlarmSound();
        } else if (soundEnabled) {
            // ако има активна аларма в UI — пускаме (но най-добре ползваме loadAlarms -> сървър флаг)
            // Няма да опитваме да пускаме звук от тук без актуална информация
            console.log('🔊 Sound enabled by user');
        }
    });
});

// =========================
// Архивна секция под картата
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

        archiveInterval = setInterval(() => {
            loadArchiveContent();
        }, 10000);

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

function manualRefreshArchive() {
    loadArchiveContent();
}



/* ------------------------
   Универсален HtmlMarker (OverlayView) - лек HTML маркер
   ------------------------ */
class HtmlMarker extends google.maps.OverlayView {
    constructor(position, html, mapInstance) {
        super();
        this.position = (position instanceof google.maps.LatLng) ? position : new google.maps.LatLng(position.lat, position.lng);
        this.html = html || '';
        this.div = null;
        this.mapInstance = mapInstance;
        this.setMap(mapInstance);
    }
    onAdd() {
        this.div = document.createElement('div');
        this.div.className = 'html-marker';
        this.div.style.position = 'absolute';
        this.div.style.transform = 'translate(-50%, -50%)';
        this.div.style.pointerEvents = 'auto';
        this.div.innerHTML = this.html;

        const panes = this.getPanes();
        if (panes && panes.overlayMouseTarget) {
            panes.overlayMouseTarget.appendChild(this.div);
        } else if (panes && panes.overlayLayer) {
            panes.overlayLayer.appendChild(this.div);
        } else {
            this.mapInstance.getDiv().appendChild(this.div);
        }
    }
    draw() {
        if (!this.div) return;
        const proj = this.getProjection();
        if (!proj) return;
        const p = proj.fromLatLngToDivPixel(this.position);
        if (!p) return;
        this.div.style.left = p.x + 'px';
        this.div.style.top = p.y + 'px';
    }
    onRemove() {
        if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div);
        }
        this.div = null;
    }
    setPosition(position) {
        this.position = (position instanceof google.maps.LatLng) ? position : new google.maps.LatLng(position.lat, position.lng);
        if (this.div) this.draw();
    }
}

/* ------------------------
   Utility: Haversine distance (meters)
   ------------------------ */
function haversineDistanceMeters(a, b) {
    const toRad = v => v * Math.PI / 180;
    const lat1 = (typeof a.lat === 'function') ? a.lat() : a.lat;
    const lon1 = (typeof a.lng === 'function') ? a.lng() : a.lng;
    const lat2 = (typeof b.lat === 'function') ? b.lat() : b.lat;
    const lon2 = (typeof b.lng === 'function') ? b.lng() : b.lng;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const L = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(L), Math.sqrt(1-L));
    return R * c;
}

/* ------------------------
   cleanupMapContainer(containerId)
   Почистване на всички ресурси за конкретен mapContainer_*
   ------------------------ */
function cleanupMapContainer(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // stop fallback interval
    if (el._fallbackInterval) {
        clearInterval(el._fallbackInterval);
        el._fallbackInterval = null;
    }

    // stop directions renderer
    if (el._directionsRenderer) {
        try { el._directionsRenderer.setMap(null); } catch (e) {}
        el._directionsRenderer = null;
    }

    // remove markers
    if (el._carMarker) {
        try {
            el._carMarker.onRemove && el._carMarker.onRemove();
        } catch (e) {}
        el._carMarker = null;
    }
    if (el._objectMarker) {
        try {
            el._objectMarker.onRemove && el._objectMarker.onRemove();
        } catch (e) {}
        el._objectMarker = null;
    }

    // clear map ref
    if (el._localMap) {
        // Do NOT destroy global maps; we only drop references so GC can collect if needed
        el._localMap = null;
    }

    // other states
    el._lastRouteOrigin = null;
    el._lastRouteTs = 0;
    el.classList.remove('ip-map-instance');
}

/* ------------------------
   initMapUnique(containerId, oLat, oLan, idUser)
   Създава уникална карта в дадения контейнер.
   containerId трябва да съвпада с елемент в DOM.
   ------------------------ */
function initMapUnique(containerId, oLat, oLan, idUser) {
    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps API not loaded');
        const elFallback = document.getElementById(containerId);
        if (elFallback) elFallback.innerHTML = '<div class="p-3 text-center text-warning">Картата не е заредена.</div>';
        return;
    }

    const el = document.getElementById(containerId);
    if (!el) {
        console.error('Map container not found:', containerId);
        return;
    }

    // ensure container clean
    el.innerHTML = '';

    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };
    if (Number.isNaN(objectPos.lat) || Number.isNaN(objectPos.lng)) {
        el.innerHTML = '<div class="p-3 text-center text-danger">Невалидни координати.</div>';
        console.error('Invalid object coordinates', oLat, oLan);
        return;
    }

    // създаваме карта локално
    const localMap = new google.maps.Map(el, {
        center: objectPos,
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        gestureHandling: "greedy"
    });

    // attach references
    el._localMap = localMap;
    el._objectPos = new google.maps.LatLng(objectPos.lat, objectPos.lng);

    // Directions service & renderer
    el._directionsService = new google.maps.DirectionsService();
    el._directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: false,
        polylineOptions: { strokeWeight: 5, strokeOpacity: 0.85, strokeColor: '#00bcd4' , geodesic: true }
    });
    el._directionsRenderer.setMap(localMap);

    // Object (static) marker
    const houseHtml = `<i class="fa-solid fa-house-signal" style="font-size:32px; color:#dc3545; text-shadow:0 1px 3px rgba(0,0,0,0.5)"></i>`;
    el._objectMarker = new HtmlMarker(el._objectPos, houseHtml, localMap);

    // car marker placeholder
    el._carMarker = null;
    el._lastCarLatLng = null;

    // route recalculation guards
    el._lastRouteOrigin = null;
    el._lastRouteTs = 0;
    el._routeRecalcMinDistance = 30;   // метри
    el._routeRecalcMinInterval = 30000; // ms

    // helper: fit bounds minimally
    function fitToShowBoth() {
        try {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(el._objectMarker.position);
            if (el._carMarker && el._carMarker.position) bounds.extend(el._carMarker.position);
            localMap.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
        } catch (e) { /* ignore */ }
    }

    // helper: recalc route if needed
    el._recalcRouteFrom = function(lat, lng) {
        const origin = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
        const now = Date.now();
        if (el._lastRouteOrigin) {
            const dist = haversineDistanceMeters(origin, el._lastRouteOrigin);
            if (dist < el._routeRecalcMinDistance && (now - el._lastRouteTs) < el._routeRecalcMinInterval) {
                return; // no need
            }
        }

        el._directionsService.route({
            origin: origin,
            destination: el._objectPos,
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: { departureTime: new Date() }
        }, function(result, status) {
            if (status === google.maps.DirectionsStatus.OK || status === 'OK') {
                el._directionsRenderer.setDirections(result);
                el._lastRouteOrigin = origin;
                el._lastRouteTs = Date.now();
            } else {
                console.warn('DirectionsService status:', status);
            }
        });
    };

    // helper: update car position (create if needed)
    el._updateCarPosition = function(lat, lng, opts = {}) {
        if (typeof lat === 'undefined' || typeof lng === 'undefined') return;
        const ll = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));

        if (!el._carMarker) {
            const carHtml = `<div class="car-marker-badge" style="pointer-events:auto;">
                                <i class="fa-solid fa-car-on" style="font-size:30px; color:#0d6efd; text-shadow:0 1px 3px rgba(0,0,0,0.5)"></i>
                             </div>`;
            el._carMarker = new HtmlMarker(ll, carHtml, localMap);
            el._lastCarLatLng = ll;
            fitToShowBoth();
            try { el._recalcRouteFrom(lat, lng); } catch (e) {}
            return;
        }

        // просто преместваме маркера
        el._carMarker.setPosition(ll);
        el._lastCarLatLng = ll;

        // рекалкулация маршрута при нужда
        try { el._recalcRouteFrom(lat, lng); } catch (e) {}

        // (по избор) можете да добавите плавна интерполация тук
    };

    // стартова fallback AJAX заявка (за уеб браузър без WebView)
    if (el._fallbackInterval) {
        clearInterval(el._fallbackInterval);
        el._fallbackInterval = null;
    }
    el._fallbackInterval = setInterval(() => {
        $.ajax({
            url: 'system/get_geo_position.php',
            method: 'GET',
            data: { idUser: idUser },
            success: function(resp) {
                if (!resp) return;
                try {
                    const parts = resp.trim().split(',');
                    const lat = parseFloat(parts[0]);
                    const lon = parseFloat(parts[1]);
                    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                        el._updateCarPosition(lat, lon);
                    }
                } catch (err) {
                    console.warn('Fallback parse error', err);
                }
            },
            error: function() { /* silent */ }
        });
    }, 10000);

    // initial fallback fetch once
    $.ajax({
        url: 'system/get_geo_position.php',
        method: 'GET',
        data: { idUser: idUser },
        success: function(resp) {
            if (!resp) return;
            try {
                const parts = resp.trim().split(',');
                const lat = parseFloat(parts[0]);
                const lon = parseFloat(parts[1]);
                if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                    el._updateCarPosition(lat, lon);
                }
            } catch (err) {
                console.warn('Initial fallback parse error', err);
            }
        }
    });

    // ако имаме кеширани координати от WebView -> ъпдейтваме веднага
    if (window.__lastGps && window.__lastGps.lat && window.__lastGps.lng) {
        try {
            el._updateCarPosition(window.__lastGps.lat, window.__lastGps.lng);
        } catch (e) {}
    }

    // маркираме контейнера като инстанция
    el.classList.add('ip-map-instance');

    // връщаме обект (опционално)
    return {
        containerId: containerId,
        map: localMap,
        objectMarker: el._objectMarker,
        carMarker: el._carMarker
    };
}

/* ------------------------
   openMapModal(modalId, oLat, oLan, idUser)
   modalId: уникалното id на модала (запази го!)
   oLat,oLan: координати на обекта
   idUser: потребител/автомобил id (за fallback)
   ------------------------ */
function openMapModal(modalId, oLat, oLan, idUser) {
    // safety: google maps може да липсва, но ще покажем модала все пак
    const modalEl = document.getElementById(modalId);
    if (!modalEl) {
        console.error('openMapModal: modal element not found', modalId);
        return;
    }

    // show bootstrap modal
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    // derive containerId - в HTML структурата използвате id="mapContainer_<suffix>"
    const suffix = modalId.replace(/^modalMap/i, '');
    const containerId = 'mapContainer_' + suffix;

    // wait a bit for modal animation so container has size
    setTimeout(() => {
        initMapUnique(containerId, oLat, oLan, idUser);
    }, 300);

    // attach hidden.bs.modal listener once per modal (cleanup on close)
    // използваме named handler за лесно премахване при повторно отваряне
    const handlerName = '__cleanup_handler_' + modalId;
    // ако вече е имало такъв - премахваме стария
    if (modalEl[handlerName]) {
        modalEl.removeEventListener('hidden.bs.modal', modalEl[handlerName]);
        modalEl[handlerName] = null;
    }

    modalEl[handlerName] = function() {
        // извикваме cleanup за този контейнер
        cleanupMapContainer(containerId);

        // допълнителни глобални състояния (ако имате такива), нулиране:
        try {
            if (typeof updateInterval !== 'undefined') { clearInterval(updateInterval); updateInterval = null; }
        } catch (e) {}

        // премахваме самия слушател (за да не трупаме)
        try { modalEl.removeEventListener('hidden.bs.modal', modalEl[handlerName]); } catch (e) {}
        modalEl[handlerName] = null;
    };

    modalEl.addEventListener('hidden.bs.modal', modalEl[handlerName]);
}

/* ------------------------
   Глобална функция за подаване на GPS от WebView
   Търси всички контейнер-e mapContainer_* и им подава координати
   ------------------------ */
window.updateCarFromWebView = function(lat, lng, speed, bearing, accuracy, altitude) {
    try {
        // намери всички mapContainer_* елементи (инстанции)
        const maps = document.querySelectorAll('[id^="mapContainer_"]');
        maps.forEach(function(mapEl) {
            if (!mapEl) return;
            if (typeof mapEl._updateCarPosition === 'function') {
                try {
                    mapEl._updateCarPosition(lat, lng, { speed, bearing, accuracy, altitude });
                } catch (e) {
                    console.warn('mapEl._updateCarPosition error', e);
                }
            } else {
                // ако няма _updateCarPosition може да е, защото initMapUnique не е изпълнен още
                // в такъв случай съхраним __lastGps (вече прави get_geo_data.js) и initMapUnique ще го приложи
            }
        });

        // обновяваме глобалния кеш
        window.__lastGps = { lat, lng, speed, bearing, accuracy, altitude, ts: Date.now() };
    } catch (e) {
        console.error('updateCarFromWebView error', e);
    }
};

let autoAlarmInterval = null;

function startAutoAddAlarms() {

    // 🔒 Предпазване от стартиране на втори интервал
    if (autoAlarmInterval !== null) return;

    autoAlarmInterval = setInterval(() => {

        $.ajax({
            url: 'includes/auto_add_alarm.php',
            type: 'GET',
            cache: false,
            timeout: 4000,

            success: function (response) {

                // ✔ Вариант A: auto_add_alarm.php връща НЕЩО само при грешка или важен текст
                if (response && typeof response === "string" && response.trim().length > 0) {
                    console.warn("auto_add_alarm.php response:", response.trim());
                }

                // ❗ Няма нужда от друга логика — файлът сам добавя алармите в базата
            },

            error: function (xhr, status, error) {
                console.error("auto_add_alarm AJAX error:", status, error);
            }
        });

    }, 5000);
}

// 🚀 Автоматично стартиране при зареждане
$(document).ready(function () {
    startAutoAddAlarms();
});

//function stopAutoAddAlarms() {
//    if (autoAlarmInterval !== null) {
//        clearInterval(autoAlarmInterval);
//        autoAlarmInterval = null;
//    }
//}