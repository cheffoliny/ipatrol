// js/alarms.js (full patched version)
// === js/alarms.js ===

// --- Глобални променливи ---
let alarmSound = null;
let alarmActive = false;
let soundEnabled = true; // по подразбиране Вкл.
let isAndroidWebView = false;
let isDesktopBrowser = false;
let allowAlarmAutoRefresh = true; // Глобален флаг – дали е позволено авто-обновяване на alarm-status-container

// ============================================================================
//                  PLATFORM DETECTION
// ============================================================================
function detectEnvironment() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    // WebView detection + presence of Android JS interface
    if (/Android/i.test(ua) && (/(wv|Version\/)/i.test(ua) || typeof Android !== 'undefined')) {
        isAndroidWebView = true;
      //  console.log('📱 Android WebView detected');
    } else {
        isDesktopBrowser = true;
      //  console.log('💻 Desktop / Mobile Browser detected');
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
     //   console.log('🔊 Browser audio initialized');
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
            "><i class="fa-solid fa-car-on"></i></div>
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
     //   console.log('🔇 Sound disabled by user');
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
           // console.log("🔔 Alarm already active");
        }
    } else {
        if (alarmActive) {
            stopAlarmSound();
        } else {
           // console.log("🔕 No active alarms");
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
async function selectAlarm(aID, oName) {

    // Спираме каквото и да било предишно авто-рефреш поведение
    stopAlarmAutoRefresh();

    allowAlarmAutoRefresh = false; // ❗ Спираме авто-refresh за всички други аларми докато зареждаме

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

            // След като сме заредили HTML-а → стартираме авто-рефреш (ако контейнерът присъства)
            const statusContainerId = findAlarmStatusContainerId();
            if (statusContainerId) {
                const url = "system/alarms_info.php?aID=" + aID + "&fragment=1";
                // разрешаваме авто-рефреш
                allowAlarmAutoRefresh = true;
                startAlarmAutoRefresh(statusContainerId, url, 5000);
            } else {
                allowAlarmAutoRefresh = false;
            }

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
          //  console.log('🔊 Sound enabled by user');
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
    const section = document.getElementById('archiveSection' + sID);

    clearInterval(archiveInterval);

    //if (section.style.display === 'none') {
        section.style.display = 'block';
        archiveParams = { oRec, sID, oNum, zTime };
        loadArchiveContent();

        archiveInterval = setInterval(() => {
            loadArchiveContent();
        }, 10000);

        //setInterval(updateArchiveTimer, 10000);
    //} else {
      //  section.style.display = 'none';

    //}
}

function loadArchiveContent() {
    const content = document.getElementById('archiveContent');
    //const statusText = document.getElementById('archiveStatusText');
   // const statusIcon = document.getElementById('archiveStatusIcon');

   // statusIcon.classList.remove('text-danger');
   // statusIcon.classList.add('text-warning');
   // statusText.textContent = 'Обновяване...';

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
           // statusIcon.classList.remove('text-warning', 'text-danger');
            //statusIcon.classList.add('text-success');
         //   updateArchiveTimer();
        },
        error: function () {
            content.innerHTML = '<div class="text-center text-danger py-2">Грешка при зареждане на архива.</div>';
          //  statusIcon.classList.remove('text-success', 'text-warning');
          //  statusIcon.classList.add('text-danger');
          //  statusText.textContent = 'Грешка при обновяване';
        }
    });
}

//function updateArchiveTimer() {
//    const statusText = document.getElementById('archiveStatusText');
//    if (!lastArchiveUpdate) return;
//
//    const diff = Math.floor((new Date() - lastArchiveUpdate) / 1000);
//    const secs = diff % 60;
//    const mins = Math.floor(diff / 60);
//    const timeStr = mins > 0
//        ? `Обновено преди ${mins}м ${secs}с`
//        : `Обновено преди ${secs}с`;
//
//    statusText.textContent = `✓ ${timeStr}`;
//}

//function manualRefreshArchive() {
//    loadArchiveContent();
//}



/* ------------------------
   Универсален HtmlMarker (OverlayView) - лек HTML маркер
   ------------------------ */
//// class HtmlMarker extends google.maps.OverlayView {
////     constructor(position, html, mapInstance) {
////         super();
////         this.position = (position instanceof google.maps.LatLng) ? position : new google.maps.LatLng(position.lat, position.lng);
////         this.html = html || '';
////         this.div = null;
////         this.mapInstance = mapInstance;
////         this.setMap(mapInstance);
////     }
////     onAdd() {
////         this.div = document.createElement('div');
////         this.div.className = 'html-marker';
////         this.div.style.position = 'absolute';
////         this.div.style.transform = 'translate(-50%, -50%)';
////         this.div.style.pointerEvents = 'auto';
////         this.div.innerHTML = this.html;
////
////         const panes = this.getPanes();
////         if (panes && panes.overlayMouseTarget) {
////             panes.overlayMouseTarget.appendChild(this.div);
////         } else if (panes && panes.overlayLayer) {
////             panes.overlayLayer.appendChild(this.div);
////         } else {
////             this.mapInstance.getDiv().appendChild(this.div);
////         }
////     }
////     draw() {
////         if (!this.div) return;
////         const proj = this.getProjection();
////         if (!proj) return;
////         const p = proj.fromLatLngToDivPixel(this.position);
////         if (!p) return;
////         this.div.style.left = p.x + 'px';
////         this.div.style.top = p.y + 'px';
////     }
////     onRemove() {
////         if (this.div && this.div.parentNode) {
////             this.div.parentNode.removeChild(this.div);
////         }
////         this.div = null;
////     }
////     setPosition(position) {
////         this.position = (position instanceof google.maps.LatLng) ? position : new google.maps.LatLng(position.lat, position.lng);
////         if (this.div) this.draw();
////     }
//// }
//
//class HtmlMarker {
//    constructor(position, html, map) {
//        this.position = position;
//        this.html = html;
//        this.map = map;
//
//        this.div = L.marker([position.lat, position.lng], {
//            icon: L.divIcon({
//                html: html,
//                className: 'html-marker',
//                iconSize: [30, 30],
//                iconAnchor: [15, 15]
//            })
//        }).addTo(map);
//    }
//
//    setPosition(position) {
//        this.position = position;
//        this.div.setLatLng([position.lat, position.lng]);
//    }
//
//    onRemove() {
//        try { this.map.removeLayer(this.div); } catch (e) {}
//    }
//}
//
//
///* ------------------------
//   Utility: Haversine distance (meters)
//   ------------------------ */
//// function haversineDistanceMeters(a, b) {
////     const toRad = v => v * Math.PI / 180;
////     const lat1 = (typeof a.lat === 'function') ? a.lat() : a.lat;
////     const lon1 = (typeof a.lng === 'function') ? a.lng() : a.lng;
////     const lat2 = (typeof b.lat === 'function') ? b.lat() : b.lat;
////     const lon2 = (typeof b.lng === 'function') ? b.lng() : b.lng;
////     const R = 6371000;
////     const dLat = toRad(lat2 - lat1);
////     const dLon = toRad(lon2 - lon1);
////     const L = Math.sin(dLat/2) * Math.sin(dLat/2) +
////               Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
////               Math.sin(dLon/2) * Math.sin(dLon/2);
////     const c = 2 * Math.atan2(Math.sqrt(L), Math.sqrt(1-L));
////     return R * c;
//// }
//function haversineDistanceMeters(a, b) {
//    const toRad = v => v * Math.PI / 180;
//    const lat1 = a.lat, lon1 = a.lng;
//    const lat2 = b.lat, lon2 = b.lng;
//    const R = 6371000;
//    const dLat = toRad(lat2-lat1);
//    const dLon = toRad(lon2-lon1);
//    const L = Math.sin(dLat/2)**2 +
//        Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) *
//        Math.sin(dLon/2)**2;
//    return 2 * R * Math.atan2(Math.sqrt(L), Math.sqrt(1-L));
//}
//
//
///* ------------------------
//   cleanupMapContainer(containerId)
//   Почистване на всички ресурси за конкретен mapContainer_*
//   ------------------------ */
//// function cleanupMapContainer(containerId) {
////     const el = document.getElementById(containerId);
////     if (!el) return;
////
////     // stop fallback interval
////     if (el._fallbackInterval) {
////         clearInterval(el._fallbackInterval);
////         el._fallbackInterval = null;
////     }
////
////     // stop directions renderer
////     if (el._directionsRenderer) {
////         try { el._directionsRenderer.setMap(null); } catch (e) {}
////         el._directionsRenderer = null;
////     }
////
////     // remove markers
////     if (el._carMarker) {
////         try {
////             el._carMarker.onRemove && el._carMarker.onRemove();
////         } catch (e) {}
////         el._carMarker = null;
////     }
////     if (el._objectMarker) {
////         try {
////             el._objectMarker.onRemove && el._objectMarker.onRemove();
////         } catch (e) {}
////         el._objectMarker = null;
////     }
////
////     // clear map ref
////     if (el._localMap) {
////         // Do NOT destroy global maps; we only drop references so GC can collect if needed
////         el._localMap = null;
////     }
////
////     // other states
////     el._lastRouteOrigin = null;
////     el._lastRouteTs = 0;
////     el.classList.remove('ip-map-instance');
//// }
//
//function cleanupMapContainer(containerId) {
//    const el = document.getElementById(containerId);
//    if (!el) return;
//
//    if (el._fallbackInterval) {
//        clearInterval(el._fallbackInterval);
//        el._fallbackInterval = null;
//    }
//
//    if (el._routeControl) {
//        try { el._localMap.removeControl(el._routeControl); } catch (e) {}
//        el._routeControl = null;
//    }
//
//    if (el._carMarker) {
//        el._carMarker.onRemove();
//        el._carMarker = null;
//    }
//
//    if (el._objectMarker) {
//        el._objectMarker.onRemove();
//        el._objectMarker = null;
//    }
//
//    if (el._localMap) {
//        el._localMap.remove();
//        el._localMap = null;
//    }
//
//    el._lastRouteOrigin = null;
//    el._lastRouteTs = 0;
//    el.classList.remove('ip-map-instance');
//}
//
//
///* ------------------------
//   initMapUnique(containerId, oLat, oLan, idUser)
//   Създава уникална карта в дадения контейнер.
//   containerId трябва да съвпада с елемент в DOM.
//   ------------------------ */
//// function initMapUnique(containerId, oLat, oLan, idUser) {
////     if (typeof google === 'undefined' || !google.maps) {
////         console.error('Google Maps API not loaded');
////         const elFallback = document.getElementById(containerId);
////         if (elFallback) elFallback.innerHTML = '<div class="p-3 text-center text-warning">Картата не е заредена.</div>';
////         return;
////     }
////
////     const el = document.getElementById(containerId);
////     if (!el) {
////         console.error('Map container not found:', containerId);
////         return;
////     }
////
////     // ensure container clean
////     el.innerHTML = '';
////
////     const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };
////     if (Number.isNaN(objectPos.lat) || Number.isNaN(objectPos.lng)) {
////         el.innerHTML = '<div class="p-3 text-center text-danger">Невалидни координати.</div>';
////         console.error('Invalid object coordinates', oLat, oLan);
////         return;
////     }
////
////     // създаваме карта локално
////     const localMap = new google.maps.Map(el, {
////         center: objectPos,
////         zoom: 14,
////         mapTypeId: google.maps.MapTypeId.ROADMAP,
////         gestureHandling: "greedy"
////     });
////
////     // attach references
////     el._localMap = localMap;
////     el._objectPos = new google.maps.LatLng(objectPos.lat, objectPos.lng);
////
////     // Directions service & renderer
////     el._directionsService = new google.maps.DirectionsService();
////     el._directionsRenderer = new google.maps.DirectionsRenderer({
////         suppressMarkers: true,
////         preserveViewport: false,
////         polylineOptions: { strokeWeight: 5, strokeOpacity: 0.85, strokeColor: '#00bcd4' , geodesic: true }
////     });
////     el._directionsRenderer.setMap(localMap);
////
////     // Object (static) marker
////     const houseHtml = `<i class="fa-solid fa-house-signal" style="font-size:32px; color:#dc3545; text-shadow:0 1px 3px rgba(0,0,0,0.5)"></i>`;
////     el._objectMarker = new HtmlMarker(el._objectPos, houseHtml, localMap);
////
////     // car marker placeholder
////     el._carMarker = null;
////     el._lastCarLatLng = null;
////
////     // route recalculation guards
////     el._lastRouteOrigin = null;
////     el._lastRouteTs = 0;
////     el._routeRecalcMinDistance = 30;   // метри
////     el._routeRecalcMinInterval = 30000; // ms
////
////     // helper: fit bounds minimally
////     function fitToShowBoth() {
////         try {
////             const bounds = new google.maps.LatLngBounds();
////             bounds.extend(el._objectMarker.position);
////             if (el._carMarker && el._carMarker.position) bounds.extend(el._carMarker.position);
////             localMap.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
////         } catch (e) { /* ignore */ }
////     }
////
////     // helper: recalc route if needed
////     el._recalcRouteFrom = function(lat, lng) {
////         const origin = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
////         const now = Date.now();
////         if (el._lastRouteOrigin) {
////             const dist = haversineDistanceMeters(origin, el._lastRouteOrigin);
////             if (dist < el._routeRecalcMinDistance && (now - el._lastRouteTs) < el._routeRecalcMinInterval) {
////                 return; // no need
////             }
////         }
////
////         el._directionsService.route({
////             origin: origin,
////             destination: el._objectPos,
////             travelMode: google.maps.TravelMode.DRIVING,
////             drivingOptions: { departureTime: new Date() }
////         }, function(result, status) {
////             if (status === google.maps.DirectionsStatus.OK || status === 'OK') {
////                 el._directionsRenderer.setDirections(result);
////                 el._lastRouteOrigin = origin;
////                 el._lastRouteTs = Date.now();
////             } else {
////                 console.warn('DirectionsService status:', status);
////             }
////         });
////     };
////
////     // helper: update car position (create if needed)
////     el._updateCarPosition = function(lat, lng, opts = {}) {
////         if (typeof lat === 'undefined' || typeof lng === 'undefined') return;
////         const ll = new google.maps.LatLng(parseFloat(lat), parseFloat(lng));
////
////         if (!el._carMarker) {
////             const carHtml = `<div class="car-marker-badge" style="pointer-events:auto;">
////                                 <i class="fa-solid fa-car-on" style="font-size:30px; color:#0d6efd; text-shadow:0 1px 3px rgba(0,0,0,0.5)"></i>
////                              </div>`;
////             el._carMarker = new HtmlMarker(ll, carHtml, localMap);
////             el._lastCarLatLng = ll;
////             fitToShowBoth();
////             try { el._recalcRouteFrom(lat, lng); } catch (e) {}
////             return;
////         }
////
////         // просто преместваме маркера
////         el._carMarker.setPosition(ll);
////         el._lastCarLatLng = ll;
////
////         // рекалкулация маршрута при нужда
////         try { el._recalcRouteFrom(lat, lng); } catch (e) {}
////
////         // (по избор) можете да добавите плавна интерполация тук
////     };
////
////     // стартова fallback AJAX заявка (за уеб браузър без WebView)
////     if (el._fallbackInterval) {
////         clearInterval(el._fallbackInterval);
////         el._fallbackInterval = null;
////     }
////     el._fallbackInterval = setInterval(() => {
////         $.ajax({
////             url: 'system/get_geo_position.php',
////             method: 'GET',
////             data: { idUser: idUser },
////             success: function(resp) {
////                 if (!resp) return;
////                 try {
////                     const parts = resp.trim().split(',');
////                     const lat = parseFloat(parts[0]);
////                     const lon = parseFloat(parts[1]);
////                     if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
////                         el._updateCarPosition(lat, lon);
////                     }
////                 } catch (err) {
////                     console.warn('Fallback parse error', err);
////                 }
////             },
////             error: function() { /* silent */ }
////         });
////     }, 10000);
////
////     // initial fallback fetch once
////     $.ajax({
////         url: 'system/get_geo_position.php',
////         method: 'GET',
////         data: { idUser: idUser },
////         success: function(resp) {
////             if (!resp) return;
////             try {
////                 const parts = resp.trim().split(',');
////                 const lat = parseFloat(parts[0]);
////                 const lon = parseFloat(parts[1]);
////                 if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
////                     el._updateCarPosition(lat, lon);
////                 }
////             } catch (err) {
////                 console.warn('Initial fallback parse error', err);
////             }
////         }
////     });
////
////     // ако имаме кеширани координати от WebView -> ъпдейтваме веднага
////     if (window.__lastGps && window.__lastGps.lat && window.__lastGps.lng) {
////         try {
////             el._updateCarPosition(window.__lastGps.lat, window.__lastGps.lng);
////         } catch (e) {}
////     }
////
////     // маркираме контейнера като инстанция
////     el.classList.add('ip-map-instance');
////
////     // връщаме обект (опционално)
////     return {
////         containerId: containerId,
////         map: localMap,
////         objectMarker: el._objectMarker,
////         carMarker: el._carMarker
////     };
//// }
//
//function initMapUnique(containerId, oLat, oLan, idUser) {
//    const el = document.getElementById(containerId);
//    if (!el) return;
//
//    el.innerHTML = '';
//
//    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };
//
//    const map = L.map(el).setView([objectPos.lat, objectPos.lng], 15);
//
//    // OSM слой
//    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//        maxZoom: 19
//    }).addTo(map);
//
//    el._localMap = map;
//
//    // Обект маркер
//    el._objectMarker = new HtmlMarker(objectPos,
//        `<i class="fa-solid fa-house-signal" style="font-size:32px;color:#dc3545;"></i>`,
//        map);
//
//    el._carMarker = null;
//
//    el._lastCarLatLng = null;
//    el._lastRouteOrigin = null;
//    el._lastRouteTs = 0;
//
//    // Route control (OSRM)
//    el._routeControl = L.Routing.control({
//        waypoints: [],
//        lineOptions: {
//            styles: [{ color: '#00bcd4', opacity: 0.9, weight: 5 }]
//        },
//        addWaypoints: false,
//        draggableWaypoints: false,
//        routeWhileDragging: false,
//        show: false
//    }).addTo(map);
//
//    // update car pos
//    el._updateCarPosition = function(lat, lng) {
//        const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };
//
//        if (!el._carMarker) {
//            el._carMarker = new HtmlMarker(pos,
//                `<i class="fa-solid fa-car-on" style="font-size:30px;color:#0d6efd;"></i>`,
//                map);
//
//            try {
//                el._routeControl.setWaypoints([
//                    L.latLng(pos.lat, pos.lng),
//                    L.latLng(objectPos.lat, objectPos.lng)
//                ]);
//            } catch (e) {}
//
//            return;
//        }
//
//        el._carMarker.setPosition(pos);
//
//        try {
//            el._routeControl.setWaypoints([
//                L.latLng(pos.lat, pos.lng),
//                L.latLng(objectPos.lat, objectPos.lng)
//            ]);
//        } catch (e) {}
//    };
//
//    // fallback polling
//    el._fallbackInterval = setInterval(() => {
//        $.get('system/get_geo_position.php', { idUser: idUser }, resp => {
//            try {
//                let [lat, lon] = resp.trim().split(',').map(Number);
//                if (!isNaN(lat)) el._updateCarPosition(lat, lon);
//            } catch (e) {}
//        });
//    }, 10000);
//}
//
//
///* ------------------------
//   openMapModal(modalId, oLat, oLan, idUser)
//   modalId: уникалното id на модала (запази го!)
//   oLat,oLan: координати на обекта
//   idUser: потребител/автомобил id (за fallback)
//   ------------------------ */
//// function openMapModal(modalId, oLat, oLan, idUser) {
////     // safety: google maps може да липсва, но ще покажем модала все пак
////     const modalEl = document.getElementById(modalId);
////     if (!modalEl) {
////         console.error('openMapModal: modal element not found', modalId);
////         return;
////     }
////
////     // show bootstrap modal
////     const bsModal = new bootstrap.Modal(modalEl);
////     bsModal.show();
////
////     // derive containerId - в HTML структурата използвате id="mapContainer_<suffix>"
////     const suffix = modalId.replace(/^modalMap/i, '');
////     const containerId = 'mapContainer_' + suffix;
////
////     // wait a bit for modal animation so container has size
////     setTimeout(() => {
////         initMapUnique(containerId, oLat, oLan, idUser);
////     }, 300);
////
////     // attach hidden.bs.modal listener once per modal (cleanup on close)
////     // използваме named handler за лесно премахване при повторно отваряне
////     const handlerName = '__cleanup_handler_' + modalId;
////     // ако вече е имало такъв - премахваме стария
////     if (modalEl[handlerName]) {
////         modalEl.removeEventListener('hidden.bs.modal', modalEl[handlerName]);
////         modalEl[handlerName] = null;
////     }
////
////     modalEl[handlerName] = function() {
////         // извикваме cleanup за този контейнер
////         cleanupMapContainer(containerId);
////
////         // допълнителни глобални състояния (ако имате такива), нулиране:
////         try {
////             if (typeof updateInterval !== 'undefined') { clearInterval(updateInterval); updateInterval = null; }
////         } catch (e) {}
////
////         // премахваме самия слушател (за да не трупаме)
////         try { modalEl.removeEventListener('hidden.bs.modal', modalEl[handlerName]); } catch (e) {}
////         modalEl[handlerName] = null;
////     };
////
////     modalEl.addEventListener('hidden.bs.modal', modalEl[handlerName]);
//// }
//
//function openMapModal(modalId, oLat, oLan, idUser) {
//    const modalEl = document.getElementById(modalId);
//    const bsModal = new bootstrap.Modal(modalEl);
//    bsModal.show();
//
//    const containerId = "mapContainer_" + modalId.replace(/^modalMap/i, "");
//
//    setTimeout(() => {
//        initMapUnique(containerId, oLat, oLan, idUser);
//    }, 300);
//
//    const handlerName = '__cleanup_handler_' + modalId;
//
//    if (modalEl[handlerName]) {
//        modalEl.removeEventListener('hidden.bs.modal', modalEl[handlerName]);
//        modalEl[handlerName] = null;
//    }
//
//    modalEl[handlerName] = function () {
//        cleanupMapContainer(containerId);
//        modalEl.removeEventListener('hidden.bs.modal', modalEl[handlerName]);
//    };
//
//    modalEl.addEventListener('hidden.bs.modal', modalEl[handlerName]);
//}
//
//
///* ------------------------
//   Глобална функция за подаване на GPS от WebView
//   Търси всички контейнер-e mapContainer_* и им подава координати
//   ------------------------ */
//// window.updateCarFromWebView = function(lat, lng, speed, bearing, accuracy, altitude) {
////     try {
////         // намери всички mapContainer_* елементи (инстанции)
////         const maps = document.querySelectorAll('[id^="mapContainer_"]');
////         maps.forEach(function(mapEl) {
////             if (!mapEl) return;
////             if (typeof mapEl._updateCarPosition === 'function') {
////                 try {
////                     mapEl._updateCarPosition(lat, lng, { speed, bearing, accuracy, altitude });
////                 } catch (e) {
////                     console.warn('mapEl._updateCarPosition error', e);
////                 }
////             } else {
////                 // ако няма _updateCarPosition може да е, защото initMapUnique не е изпълнен още
////                 // в такъв случай съхраним __lastGps (вече прави get_geo_data.js) и initMapUnique ще го приложи
////             }
////         });
////
////         // обновяваме глобалния кеш
////         window.__lastGps = { lat, lng, speed, bearing, accuracy, altitude, ts: Date.now() };
////     } catch (e) {
////         console.error('updateCarFromWebView error', e);
////     }
//// };
//window.updateCarFromWebView = function(lat, lng, speed, bearing, accuracy, altitude) {
//    const maps = document.querySelectorAll('[id^="mapContainer_"]');
//
//    maps.forEach(el => {
//        if (typeof el._updateCarPosition === 'function') {
//            el._updateCarPosition(lat, lng);
//        }
//    });
//
//    window.__lastGps = { lat, lng, speed, bearing, accuracy, altitude, ts: Date.now() };
//};
//


/* ============================================================
   HTML Marker (Leaflet версия) – запазено име HtmlMarker
   ============================================================ */

/* =========================
   HtmlMarker (Leaflet divIcon wrapper) + плавен визуален клас
   ========================= */
class HtmlMarker {
    constructor(position, html, map) {
        this.map = map;
        this.position = { lat: parseFloat(position.lat), lng: parseFloat(position.lng) };
        this.html = html || '';
        this._icon = L.divIcon({
            html: this.html,
            className: 'html-marker',
            iconSize: null
        });
        this._marker = L.marker([this.position.lat, this.position.lng], {
            icon: this._icon,
            interactive: true,
            keyboard: false
        }).addTo(this.map);

        // за плавна визуална анимация (css transition)
        const el = this._marker.getElement();
        if (el) el.classList.add('car-marker-smooth');
    }

    setPosition(position) {
        this.position = { lat: parseFloat(position.lat), lng: parseFloat(position.lng) };
        if (this._marker) {
            this._marker.setLatLng([this.position.lat, this.position.lng]);
        }
    }

    getLatLng() {
        return this._marker ? this._marker.getLatLng() : L.latLng(this.position.lat, this.position.lng);
    }

    onRemove() {
        try { if (this._marker && this.map) this.map.removeLayer(this._marker); } catch (e) {}
        this._marker = null;
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
   ------------------------ */
function cleanupMapContainer(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (el._fallbackInterval) {
        clearInterval(el._fallbackInterval);
        el._fallbackInterval = null;
    }

    if (el._routeControl) {
        try {
            el._routeControl.getPlan && el._routeControl.getPlan().setWaypoints([]);
            el._localMap.removeControl(el._routeControl);
        } catch (e) {}
        el._routeControl = null;
    }

    if (el._carMarker) {
        try { el._carMarker.onRemove(); } catch (e) {}
        el._carMarker = null;
    }

    if (el._objectMarker) {
        try { el._objectMarker.onRemove(); } catch (e) {}
        el._objectMarker = null;
    }

    if (el._localMap) {
        try { el._localMap.remove(); } catch (e) {}
        el._localMap = null;
    }

    el._lastRouteOrigin = null;
    el._lastRouteTs = 0;
    el.classList.remove('ip-map-instance');
}

/* ------------------------
   initMapUnique(containerId, oLat, oLan, idUser)
   Leaflet + OSM + L.Routing optimised
   ------------------------ */
function initMapUnique(containerId, oLat, oLan, idUser) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // if map already exists for this container - reuse (do not recreate), but clear old markers/routes
    if (el._localMap) {
        // update object marker pos if needed and return existing api
        if (el._objectMarker) {
            el._objectMarker.setPosition({ lat: parseFloat(oLat), lng: parseFloat(oLan) });
        }
        return {
            containerId: containerId,
            map: el._localMap,
            objectMarker: el._objectMarker,
            carMarker: el._carMarker
        };
    }

    el.innerHTML = '';

    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };
    if (Number.isNaN(objectPos.lat) || Number.isNaN(objectPos.lng)) {
        el.innerHTML = '<div class="p-3 text-center text-danger">Невалидни координати.</div>';
        console.error('Invalid object coordinates', oLat, oLan);
        return;
    }

    // Create map (preferCanvas improves performance on many vector layers)
    const map = L.map(el, { preferCanvas: true, zoomControl: true, attributionControl: true }).setView([objectPos.lat, objectPos.lng], 14);

    // Tile layer (OSM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        updateWhenIdle: true,   // prefer better performance
        updateWhenZooming: false,
        reuseTiles: true
    }).addTo(map);

    el._localMap = map;
    el._objectPos = objectPos;

    // Object (static) marker
    el._objectMarker = new HtmlMarker(objectPos, `<i class="fa-solid fa-house-signal" style="font-size:32px; color:#dc3545; text-shadow:0 1px 3px rgba(0,0,0,0.5)"></i>`, map);

    // car marker placeholder
    el._carMarker = null;
    el._lastCarLatLng = null;

    // route recalculation guards
    el._lastRouteOrigin = null;
    el._lastRouteTs = 0;
    el._routeRecalcMinDistance = 30;   // meters
    el._routeRecalcMinInterval = 30000; // ms

    // Create routing control (initially hidden - CSS .leaflet-routing-container {display: none})
    el._routeControl = L.Routing.control({
        waypoints: [],
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1' // change for production
        }),
        show: false, // hide the default itinerary container
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoute: false,
        routeWhileDragging: false,
        createMarker: function() { return null; }, // we use our own markers
        lineOptions: {
            styles: [{ color: '#00bcd4', opacity: 0.9, weight: 5 }]
        }
    }).addTo(map);

    // helper: fit bounds to show both object and car (but don't force zoom if already showing)
    function fitToShowBoth() {
        try {
            const bounds = L.latLngBounds([ [objectPos.lat, objectPos.lng] ]);
            if (el._carMarker) bounds.extend(el._carMarker.getLatLng());
            // apply only when needed (avoid frequent map re-renders)
            const currentBounds = map.getBounds ? map.getBounds() : null;
            if (!currentBounds || !currentBounds.contains(bounds)) {
                map.flyToBounds(bounds.pad(0.2), { animate: true, duration: 0.6 });
            }
        } catch (e) {}
    }

    // route recalculation with guards
    el._recalcRouteFrom = function(lat, lng) {
        const origin = { lat: parseFloat(lat), lng: parseFloat(lng) };
        const now = Date.now();

        if (el._lastRouteOrigin) {
            const dist = haversineDistanceMeters(origin, el._lastRouteOrigin);
            if (dist < el._routeRecalcMinDistance && (now - el._lastRouteTs) < el._routeRecalcMinInterval) {
                // skip recalculation
                return;
            }
        }

        // update waypoints (this triggers route calculation)
        try {
            el._routeControl.setWaypoints([
                L.latLng(origin.lat, origin.lng),
                L.latLng(objectPos.lat, objectPos.lng)
            ]);
            el._lastRouteOrigin = origin;
            el._lastRouteTs = now;
        } catch (e) {
            console.warn('Route setWaypoints error', e);
        }
    };

    // Smooth animation state
    el._anim = {
        running: false,
        startTs: 0,
        duration: 800, // default ms for interpolation (will scale with distance below)
        from: null,
        to: null,
        req: null
    };

    // animate marker from A -> B (over duration)
    function animateMarkerTo(markerInstance, toPos, duration) {
        if (!markerInstance) return;
        // cancel previous
        if (el._anim.req) cancelAnimationFrame(el._anim.req);
        const fromLatLng = markerInstance.getLatLng();
        const from = { lat: fromLatLng.lat, lng: fromLatLng.lng };
        const to = { lat: parseFloat(toPos.lat), lng: parseFloat(toPos.lng) };
        const start = performance.now();
        const dur = Math.max(200, duration); // min duration

        function step(now) {
            const t = Math.min(1, (now - start) / dur);
            // ease (smoothstep)
            const tt = t * t * (3 - 2 * t);
            const lat = from.lat + (to.lat - from.lat) * tt;
            const lng = from.lng + (to.lng - from.lng) * tt;
            markerInstance.setPosition({ lat, lng });
            if (t < 1) {
                el._anim.req = requestAnimationFrame(step);
            } else {
                el._anim.req = null;
            }
        }
        el._anim.req = requestAnimationFrame(step);
    }

    // helper: update car position (create if needed)
    el._updateCarPosition = function(lat, lng, opts = {}) {
        if (typeof lat === 'undefined' || typeof lng === 'undefined') return;
        const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };

        if (!el._carMarker) {
            // create car marker
            const carHtml = `<div style="pointer-events:auto;"><i class="fa-solid fa-car-on" style="font-size:30px; color:#0d6efd; text-shadow:0 1px 3px rgba(0,0,0,0.5)"></i></div>`;
            el._carMarker = new HtmlMarker(pos, carHtml, map);
            el._lastCarLatLng = pos;

            // setup initial route
            try { el._recalcRouteFrom(pos.lat, pos.lng); } catch (e) {}
            // fit view
            fitToShowBoth();
            return;
        }

        // compute distance to last known
        const last = el._lastCarLatLng || el._carMarker.getLatLng();
        const dist = haversineDistanceMeters(last, pos);

        // derive animation duration based on distance and optional speed
        let duration = 700;
        if (opts && opts.speed && typeof opts.speed === 'number' && opts.speed > 0) {
            // speed in m/s -> duration = distance / speed * 1000
            duration = Math.min(5000, Math.max(200, (dist / opts.speed) * 1000));
        } else {
            // scale duration by distance (longer moves animate slightly longer)
            duration = Math.min(3000, Math.max(200, dist * 10));
        }

        // animate marker
        try {
            animateMarkerTo(el._carMarker, pos, duration);
        } catch (e) { el._carMarker.setPosition(pos); }

        el._lastCarLatLng = pos;

        // decide whether to recalc route
        try { el._recalcRouteFrom(pos.lat, pos.lng); } catch (e) {}

        // minimal fit bounds only when necessary (avoid remounting tiles)
        try {
            const bounds = L.latLngBounds([ [objectPos.lat, objectPos.lng], [pos.lat, pos.lng] ]);
            // if current map view doesn't contain both points, pan/fit gently
            if (!map.getBounds().contains(bounds)) {
                map.flyToBounds(bounds.pad(0.2), { animate: true, duration: 0.6 });
            }
        } catch (e) {}
    };

    // fallback polling (throttled)
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
                } catch (err) { console.warn('Fallback parse error', err); }
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
            } catch (err) { console.warn('Initial fallback parse error', err); }
        }
    });

    // if we have cached GPS from WebView -> apply
    if (window.__lastGps && window.__lastGps.lat && window.__lastGps.lng) {
        try { el._updateCarPosition(window.__lastGps.lat, window.__lastGps.lng, { speed: window.__lastGps.speed }); } catch (e) {}
    }

    el.classList.add('ip-map-instance');

    return {
        containerId: containerId,
        map: map,
        objectMarker: el._objectMarker,
        carMarker: el._carMarker
    };
}

/* ------------------------
   openMapModal(modalId, oLat, oLan, idUser)
   ------------------------ */
function openMapModal(modalId, oLat, oLan, idUser) {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) {
        console.error('openMapModal: modal element not found', modalId);
        return;
    }

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    const suffix = modalId.replace(/^modalMap/i, '');
    const containerId = 'mapContainer_' + suffix;

    // wait a bit for modal animation so container has size
    setTimeout(() => {
        initMapUnique(containerId, oLat, oLan, idUser);
    }, 300);

    const handlerName = '__cleanup_handler_' + modalId;
    if (modalEl[handlerName]) {
        modalEl.removeEventListener('hidden.bs.modal', modalEl[handlerName]);
        modalEl[handlerName] = null;
    }

    modalEl[handlerName] = function() {
        cleanupMapContainer(containerId);
        try {
            if (typeof updateInterval !== 'undefined') { clearInterval(updateInterval); updateInterval = null; }
        } catch (e) {}
        try { modalEl.removeEventListener('hidden.bs.modal', modalEl[handlerName]); } catch (e) {}
        modalEl[handlerName] = null;
    };

    modalEl.addEventListener('hidden.bs.modal', modalEl[handlerName]);
}

/* ------------------------
   Глобална функция за подаване на GPS от WebView
   ------------------------ */
window.updateCarFromWebView = function(lat, lng, speed, bearing, accuracy, altitude) {
    try {
        const maps = document.querySelectorAll('[id^="mapContainer_"]');
        maps.forEach(function(mapEl) {
            if (!mapEl) return;
            if (typeof mapEl._updateCarPosition === 'function') {
                try {
                    mapEl._updateCarPosition(lat, lng, { speed, bearing, accuracy, altitude });
                } catch (e) {
                    console.warn('mapEl._updateCarPosition error', e);
                }
            }
        });
        window.__lastGps = { lat, lng, speed, bearing, accuracy, altitude, ts: Date.now() };
    } catch (e) {
        console.error('updateCarFromWebView error', e);
    }
};


//class HtmlMarker {
//    constructor(position, html, mapInstance) {
//        this.position = position;
//        this.html = html;
//        this.mapInstance = mapInstance;
//
//        this.icon = L.divIcon({
//            html: html,
//            className: 'leaflet-html-marker',
//            iconSize: null
//        });
//
//        this.marker = L.marker(position, { icon: this.icon }).addTo(mapInstance);
//    }
//
//    setPosition(position) {
//        this.position = position;
//        this.marker.setLatLng(position);
//    }
//
//    onRemove() {
//        if (this.mapInstance && this.marker) {
//            this.mapInstance.removeLayer(this.marker);
//        }
//    }
//}
//
//
///* ============================================================
//   Haversine Distance (meters)
//   ============================================================ */
//function haversineDistanceMeters(a, b) {
//    const toRad = v => v * Math.PI / 180;
//    const lat1 = a.lat, lon1 = a.lng;
//    const lat2 = b.lat, lon2 = b.lng;
//    const R = 6371000;
//
//    const dLat = toRad(lat2 - lat1);
//    const dLon = toRad(lon2 - lon1);
//
//    const L =
//        Math.sin(dLat/2)**2 +
//        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
//        Math.sin(dLon/2)**2;
//
//    return R * 2 * Math.atan2(Math.sqrt(L), Math.sqrt(1-L));
//}
//
//
//
///* ============================================================
//   cleanupMapContainer(containerId)
//   ============================================================ */
//function cleanupMapContainer(containerId) {
//    const el = document.getElementById(containerId);
//    if (!el) return;
//
//    if (el._fallbackInterval) clearInterval(el._fallbackInterval);
//    el._fallbackInterval = null;
//
//    if (el._routingControl) {
//        el._routingControl.remove();
//        el._routingControl = null;
//    }
//
//    if (el._carMarker) { el._carMarker.onRemove(); }
//    if (el._objectMarker) { el._objectMarker.onRemove(); }
//
//    el._localMap = null;
//}
//
//
//
///* ============================================================
//   initMapUnique() — 100% нова OpenStreetMap имплементация
//   ============================================================ */
//function initMapUnique(containerId, oLat, oLan, idUser) {
//    const el = document.getElementById(containerId);
//    if (!el) return;
//
//    el.innerHTML = '';
//
//    const objectPos = L.latLng(parseFloat(oLat), parseFloat(oLan));
//
//    const map = L.map(containerId, {
//        zoomControl: true,
//        attributionControl: false,
//        zoomSnap: 0.1
//    }).setView(objectPos, 14);
//
//    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//        maxZoom: 19
//    }).addTo(map);
//
//    el._localMap = map;
//
//    /** MARKERS ****************************/
//    el._objectMarker = new HtmlMarker(objectPos,
//        `<i class="fa-solid fa-house-signal" style="font-size:32px;color:#dc3545;"></i>`,
//        map
//    );
//
//    el._carMarker = null;
//    el._lastCarLatLng = null;
//
//    /** ROUTING ****************************/
//    el._routingControl = L.Routing.control({
//        waypoints: [],
//        routeWhileDragging: false,
//        addWaypoints: false,
//        show: false,             // ← turn-by-turn panel hidden
//        draggableWaypoints: false,
//        lineOptions: {
//            styles: [{ color: "#00bcd4", weight: 5, opacity: 0.9 }]
//        }
//    }).addTo(map);
//
//    /** AUTO-FIT ***************************/
//    el._fitMap = function() {
//        if (!el._carMarker) return;
//        const bounds = L.latLngBounds([ el._objectMarker.position, el._carMarker.position ]);
//        map.fitBounds(bounds, { padding: [40,40] });
//    };
//
//    /** SMOOTH ANIMATION OF CAR ************/
//    function animateCar(oldPos, newPos, duration = 700) {
//        const start = performance.now();
//
//        function step(ts) {
//            const progress = Math.min((ts - start) / duration, 1);
//            const lat = oldPos.lat + (newPos.lat - oldPos.lat) * progress;
//            const lng = oldPos.lng + (newPos.lng - oldPos.lng) * progress;
//
//            el._carMarker.setPosition(L.latLng(lat, lng));
//
//            if (progress < 1) requestAnimationFrame(step);
//        }
//        requestAnimationFrame(step);
//    }
//
//    /** UPDATE CAR *************************/
//    el._updateCarPosition = function(lat, lng) {
//        const newLL = L.latLng(parseFloat(lat), parseFloat(lng));
//
//        if (!el._carMarker) {
//            el._carMarker = new HtmlMarker(
//                newLL,
//                `<i class="fa-solid fa-car-on" style="font-size:30px;color:#0d6efd;"></i>`,
//                map
//            );
//            el._lastCarLatLng = newLL;
//            el._fitMap();
//        } else {
//            animateCar(el._lastCarLatLng, newLL);
//            el._lastCarLatLng = newLL;
//        }
//
//        // ROUTE UPDATE
//        el._routingControl.setWaypoints([ newLL, objectPos ]);
//
//        el._fitMap();
//    };
//
//    /** FALLBACK AJAX *************************/
//    el._fallbackInterval = setInterval(() => {
//        $.get('system/get_geo_position.php', { idUser }, resp => {
//            if (!resp) return;
//            const [lat, lng] = resp.trim().split(',');
//            el._updateCarPosition(parseFloat(lat), parseFloat(lng));
//        });
//    }, 10000);
//
//    // initial fetch
//    $.get('system/get_geo_position.php', { idUser }, resp => {
//        if (!resp) return;
//        const [lat, lng] = resp.trim().split(',');
//        el._updateCarPosition(parseFloat(lat), parseFloat(lng));
//    });
//
//    if (window.__lastGps) {
//        el._updateCarPosition(window.__lastGps.lat, window.__lastGps.lng);
//    }
//
//    return {
//        containerId,
//        map,
//        objectMarker: el._objectMarker,
//        carMarker: el._carMarker
//    };
//}
//
//
//
///* ============================================================
//   openMapModal() — без промяна на синтаксис
//   ============================================================ */
//function openMapModal(modalId, oLat, oLan, idUser) {
//    const modalEl = document.getElementById(modalId);
//    if (!modalEl) return;
//
//    const bsModal = new bootstrap.Modal(modalEl);
//    bsModal.show();
//
//    const suffix = modalId.replace(/^modalMap/i, '');
//    const containerId = 'mapContainer_' + suffix;
//
//    setTimeout(() => {
//        initMapUnique(containerId, oLat, oLan, idUser);
//    }, 300);
//
//    const handlerName = '__cleanup_handler_' + modalId;
//    if (modalEl[handlerName]) {
//        modalEl.removeEventListener('hidden.bs.modal', modalEl[handlerName]);
//    }
//
//    modalEl[handlerName] = function() {
//        cleanupMapContainer(containerId);
//        modalEl.removeEventListener('hidden.bs.modal', modalEl[handlerName]);
//        modalEl[handlerName] = null;
//    };
//
//    modalEl.addEventListener('hidden.bs.modal', modalEl[handlerName]);
//}
//
//

/* ============================================================
   updateCarFromWebView()
   ============================================================ */
//window.updateCarFromWebView = function(lat, lng) {
//    document.querySelectorAll('[id^="mapContainer_"]').forEach(el => {
//        if (typeof el._updateCarPosition === "function") {
//            el._updateCarPosition(lat, lng);
//        }
//    });
//};

/* ------------------------
   КРАЙ Универсален HtmlMarker (OverlayView) - лек HTML маркер
   ------------------------ */

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
            }
//            ,
//
//            error: function (xhr, status, error) {
//                console.error("auto_add_alarm AJAX error:", status, error);
//            }
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

// *** NEW AUTO UPDATE BLOCK AND ALARMS
// ======= alarms.js: централен авто-рефреш контролер =======

// Глобални променливи
window._alarmRefresh = window._alarmRefresh || {
    intervalId: null,
    abortController: null,
    currentContainerId: null,
    currentURL: null,
    intervalMs: 5000
};

// Спира напълно актуалния refresh (таймер + fetch)
function stopAlarmAutoRefresh() {
    // прекратяваме таймера
    if (window._alarmRefresh.intervalId) {
        clearInterval(window._alarmRefresh.intervalId);
        window._alarmRefresh.intervalId = null;
    }

    // прекратяваме текущия fetch
    if (window._alarmRefresh.abortController) {
        try {
            window._alarmRefresh.abortController.abort();
        } catch (e) {
            // ignore
        }
        window._alarmRefresh.abortController = null;
    }

    window._alarmRefresh.currentContainerId = null;
    window._alarmRefresh.currentURL = null;
    // optional flag
    window.allowAlarmAutoRefresh = false;
    // debug
    // console.log("stopAlarmAutoRefresh() called");
}

// Изпълнява една fetch заявка и обновява container (винаги използвай това)
async function refreshOnce(containerId, url) {

    // Нищо, ако глобалният флаг е изключен
    if (window.allowAlarmAutoRefresh === false) return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Ако контейнерът има data-break-refresh="1" → спираме окончателно
    if (container.dataset && container.dataset.breakRefresh === "1") {
        // спираме цикъла
        stopAlarmAutoRefresh();
        return;
    }

    // Ако вече имаме активен controller — abort-ваме го (за да избегнем overlap)
    if (window._alarmRefresh.abortController) {
        try { window._alarmRefresh.abortController.abort(); } catch(e){}
    }

    const controller = new AbortController();
    window._alarmRefresh.abortController = controller;

    try {
        const resp = await fetch(url, { signal: controller.signal });
        // ако заявката е отменена, fetch ще reject-не с AbortError
        const html = await resp.text();

        // Отново: проверка дали контейнера все още съществува (и не е сменен)
        const curContainer = document.getElementById(containerId);
        if (!curContainer) return;

        // Ако няма отворен modalReason — можем да презапишем
        const openReasonModal = document.querySelector('.modal.show[id^="modalReason"]');
        if (!openReasonModal) {
            // заместваме HTML на контейнера (outerHTML е предпочитано в твоят код)
            curContainer.outerHTML = html;
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            // заявката е била abort-ната — това е нормално при смяна на аларма
            // console.log("refreshOnce aborted");
            return;
        }
        console.error("Грешка при refreshOnce:", err);
    } finally {
        // чистене на controller, ако той е още текущ
        if (window._alarmRefresh.abortController === controller) {
            window._alarmRefresh.abortController = null;
        }
    }
}

// Стартира цикличен авто-рефреш за даден контейнер
// containerId - id на status-контейнера (например alarm-status-container123)
// url - url за fragment (пример: "system/alarms_info.php?aID=123&fragment=1")
// intervalMs - период (ms)
function startAlarmAutoRefresh(containerId, url, intervalMs = 5000) {

    // Ако искаме да спрем всичко преди нов старт
    stopAlarmAutoRefresh();

    window.allowAlarmAutoRefresh = true;
    window._alarmRefresh.currentContainerId = containerId;
    window._alarmRefresh.currentURL = url;
    window._alarmRefresh.intervalMs = intervalMs;

    // Веднага правим първи refresh
    refreshOnce(containerId, url);

    // После стартираме периодичен
    window._alarmRefresh.intervalId = setInterval(function() {
        refreshOnce(containerId, url);
    }, intervalMs);

    // debug
    // console.log("startAlarmAutoRefresh() for", containerId, url);
}

// Утилита: намира първия елемент, ID на който започва с "alarm-status-container"
function findAlarmStatusContainerId() {
    const el = document.querySelector('[id^="alarm-status-container"]');
    return el ? el.id : null;
}


// ========== Интеграция със selectAlarm (примерни промени) ==========
// В твоя selectAlarm(aID, oName) добави (в началото) спиране на старата активност:
//    stopAlarmAutoRefresh();
// и в success callback на ajax (след $('.main-content').html(html);) добави старт:
//    const statusContainerId = findAlarmStatusContainerId();
//    if (statusContainerId) {
//        const url = "system/alarms_info.php?aID=" + aID + "&fragment=1";
//        startAlarmAutoRefresh(statusContainerId, url, 5000);
//    }

// Ако selectAlarm използва jQuery $.ajax success -> показано долу.

