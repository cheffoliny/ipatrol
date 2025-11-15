// js/alarms.js (full patched version)

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

// --- Ръчен бутон за звук ---
$(document).ready(function () {
    $('#toggleSoundBtn').on('click', function () {
        soundEnabled = !soundEnabled;
        const icon = soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark';
        const text = soundEnabled ? 'Звук: Вкл.' : 'Звук: Изкл.';

        $(this).html(`<i class="fa-solid ${icon} me-1"></i> ${text}`);

        if (!soundEnabled && alarmActive) stopAlarmSound();
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

// =========================
// Google Map + Car Visualization (per-modal isolated logic)
// =========================

// Всички карти за различни обекти се държат отделно
const MAP_INSTANCES = {};          // key = modalId → { map, objectMarker, carOverlay, polyline, trail, heatmap, lastPos }
const TRAIL_MAX_POINTS = 500;


// --- Car Overlay class ---
class CarOverlay extends google.maps.OverlayView {
    constructor(position, map, options = {}) {
        super();
        this.position = position;
        this.map = map;
        this.speed = options.speed || 0;
        this.bearing = options.bearing || 0;

        this.div = null;
        this.setMap(map);
    }

    onAdd() {
        this.div = document.createElement("div");
        this.div.className = "car-marker";

        // Car SVG
        const car = document.createElement("div");
        car.innerHTML = `
            <svg viewBox="0 0 32 32" width="28" height="28">
                <path d="M16 2 L26 14 L26 26 L6 26 L6 14 Z" fill="#ff4444" stroke="#660000" stroke-width="1"/>
            </svg>`;
        this.carEl = car;
        this.div.appendChild(car);

        const panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(this.div);
    }

    draw() {
        if (!this.div) return;
        const projection = this.getProjection();
        if (!projection) return;

        const posPixel = projection.fromLatLngToDivPixel(this.position);
        if (!posPixel) return;

        this.div.style.left = (posPixel.x - 14) + "px";
        this.div.style.top = (posPixel.y - 14) + "px";
        this.div.style.transform = `rotate(${this.bearing}deg)`;
    }

    update(newPos, opts = {}) {
        if (newPos) this.position = newPos;
        if (opts.speed !== undefined) this.speed = opts.speed;
        if (opts.bearing !== undefined) this.bearing = opts.bearing;

        this.draw();
    }

    onRemove() {
        if (this.div && this.div.parentNode)
            this.div.parentNode.removeChild(this.div);

        this.div = null;
    }
}


// =============================
// OPEN MODAL FOR SPECIFIC OBJECT
// =============================
function openMapModal(modalId, oLat, oLan, idUser) {
    const modalEl = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const containerId = "mapContainer_" + modalId;

    setTimeout(() => {
        initMapForObject(modalId, containerId, oLat, oLan, idUser);
    }, 350);
}


// =============================
// INIT MAP — PER MODAL
// =============================
function initMapForObject(modalId, containerId, oLat, oLan, idUser) {
    const container = document.getElementById(containerId);
    if (!container) return console.error("Missing:", containerId);

    // Ако има вече екземпляр → изчистваме го
    destroyMapInstance(modalId);

    const objectPos = new google.maps.LatLng(parseFloat(oLat), parseFloat(oLan));

    const map = new google.maps.Map(container, {
        center: objectPos,
        zoom: 14,
        mapId: "INTELLI_MAP_ID",
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        gestureHandling: "greedy",
    });

    const objectMarker = new google.maps.Marker({
        map,
        position: objectPos,
        icon: "https://maps.google.com/mapfiles/kml/paddle/home.png"
    });

    const trailPolyline = new google.maps.Polyline({
        map,
        path: [],
        geodesic: true,
        strokeColor: "#00b300",
        strokeOpacity: 0.9,
        strokeWeight: 4,
    });

    const heatmap = new google.maps.visualization.HeatmapLayer({
        map,
        data: [],
        radius: 30,
        opacity: 0.7,
    });

    const overlay = new CarOverlay(objectPos, map, {});


    MAP_INSTANCES[modalId] = {
        map,
        objectMarker,
        carOverlay: overlay,
        polyline: trailPolyline,
        heatmap,
        lastPos: objectPos,
        trail: [],
        heatData: [],
        idUser
    };

    // Зареждаме първоначална GPS позиция
    updateCarPosition(modalId);
    MAP_INSTANCES[modalId].interval = setInterval(() => updateCarPosition(modalId), 8000);
}


// =============================
// REMOVE MAP INSTANCE (when modal closes)
// =============================
function destroyMapInstance(modalId) {
    const inst = MAP_INSTANCES[modalId];
    if (!inst) return;

    if (inst.interval) clearInterval(inst.interval);
    if (inst.carOverlay) inst.carOverlay.setMap(null);
    if (inst.polyline) inst.polyline.setMap(null);
    if (inst.heatmap) inst.heatmap.setMap(null);

    delete MAP_INSTANCES[modalId];
}


// =============================
// UPDATE CAR POSITION (WebView / fallback)
// =============================
function updateCarPosition(modalId) {
    const inst = MAP_INSTANCES[modalId];
    if (!inst) return;

    $.get("system/get_geo_position.php", { idUser: inst.idUser }, resp => {
        if (!resp) return;

        try {
            const [lat, lng] = resp.trim().split(",").map(parseFloat);
            animateCar(modalId, lat, lng);
        } catch (e) {
            console.warn("Invalid GPS:", resp);
        }
    });
}


// =============================
// ANIMATION + TRAIL
// =============================
function animateCar(modalId, lat, lng) {
    const inst = MAP_INSTANCES[modalId];
    if (!inst) return;

    const newPos = new google.maps.LatLng(lat, lng);

    inst.trail.push(newPos);
    if (inst.trail.length > TRAIL_MAX_POINTS) inst.trail.shift();
    inst.polyline.setPath(inst.trail);

    inst.heatData.push(newPos);
    inst.heatmap.setData(inst.heatData);

    inst.carOverlay.update(newPos, {});
    inst.lastPos = newPos;
}