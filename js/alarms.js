// === alarms.js ===

// --- Глобални променливи ---
let alarmSound = null;
let alarmActive = false;
let soundEnabled = true;
let isAndroidWebView = false;
let isDesktopBrowser = false;

// --- Засичане на среда ---
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

// --- Звук за Android ---
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

// --- Звук за браузър ---
function initBrowserSound() {
    if (!alarmSound) {
        alarmSound = new Audio('sounds/alarm.mp3');
        alarmSound.loop = true;
        console.log('🔊 Инициализация на звук.');
    }
}

if (isDesktopBrowser) {
    document.addEventListener('click', initBrowserSound, { once: true });
    document.addEventListener('keydown', initBrowserSound, { once: true });
}

// --- Алармен индикатор ---
function showAlarmIndicator() {
    if (document.getElementById('alarmIndicator')) return;
    const el = document.createElement('div');
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
    alarmActive = true;
}

function hideAlarmIndicator() {
    const el = document.getElementById('alarmIndicator');
    if (el) el.remove();
    alarmActive = false;
}

// --- Звук ---
function triggerAlarmSound() {
    if (!soundEnabled) return;
    showAlarmIndicator();
    if (isAndroidWebView) callAndroidSound(1);
    else if (alarmSound) alarmSound.play().catch(e => console.warn('🔇 Play error:', e));
}

function stopAlarmSound() {
    hideAlarmIndicator();
    if (isAndroidWebView) callAndroidSound(0);
    else if (alarmSound && !alarmSound.paused) {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }
}

// --- Обновяване на аларми ---
function updateAlarms(data) {
    $('#alarmPanel').html(data);
    const hasActiveAlarm = $('#alarmPanel .bg-danger, #alarmPanel .alarm-new').length > 0;
    if (hasActiveAlarm && !alarmActive) triggerAlarmSound();
    else if (!hasActiveAlarm && alarmActive) stopAlarmSound();
}

// --- Избор на аларма ---
function selectAlarm(aID, oName) {
    $('#alarmPanel li').removeClass('active');
    $('#alarm-' + aID).addClass('active');

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

// --- Управление на звук бутона ---
$(document).ready(function () {
    $('#toggleSoundBtn').on('click', function () {
        soundEnabled = !soundEnabled;
        const icon = soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark';
        const text = soundEnabled ? 'Звук: Вкл.' : 'Звук: Изкл.';
        $(this).html(`<i class="fa-solid ${icon} me-1"></i> ${text}`);
        if (!soundEnabled && alarmActive) stopAlarmSound();
    });
});

// =============================
// 📚 Архив / Карта в една секция
// =============================

let archiveInterval = null;
let mapInterval = null;
let archiveParams = {};
let map = null;
let carMarker = null;

function toggleArchiveSection(oRec, sID, oNum, zTime) {
    clearInterval(mapInterval);
    $('#archiveSection').show().html(`
        <div class="text-center text-muted py-3">
            <i class="fa-solid fa-spinner fa-spin"></i> Зареждане на архив...
        </div>
    `);

    archiveParams = { oRec, sID, oNum, zTime };
    loadArchiveContent();

    if (archiveInterval) clearInterval(archiveInterval);
    archiveInterval = setInterval(loadArchiveContent, 10000);
}

function loadArchiveContent() {
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
        success: function (html) {
            $('#archiveSection').html(html || '<div class="text-center text-muted py-3">Няма архивни данни.</div>');
        },
        error: function () {
            $('#archiveSection').html('<div class="text-center text-danger py-3">Грешка при зареждане на архива.</div>');
        }
    });
}

// === Карта в същата секция ===
function openMapSection(oLat, oLan, idUser) {
    clearInterval(archiveInterval);
    $('#archiveSection').show().html(`
        <div id="mapContainer" style="height: 500px; border-radius: 10px;"></div>
    `);

    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };

    map = new google.maps.Map(document.getElementById('mapContainer'), {
        center: objectPos,
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    new google.maps.Marker({
        position: objectPos,
        map: map,
        title: "Обект",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
    });

    carMarker = new google.maps.Marker({
        position: objectPos,
        map: map,
        title: "Екип",
        icon: {
            url: "https://maps.google.com/mapfiles/kml/shapes/cabs.png",
            scaledSize: new google.maps.Size(40, 40)
        }
    });

    updateCarPosition(idUser);
    mapInterval = setInterval(() => updateCarPosition(idUser), 10000);
}

function updateCarPosition(idUser) {
    $.ajax({
        url: 'system/get_geo_position.php',
        method: 'GET',
        data: { idUser },
        success: function (response) {
            if (!response) return;
            const [lat, lon] = response.trim().split(',').map(parseFloat);
            const newPos = { lat, lng: lon };
            if (carMarker) carMarker.setPosition(newPos);
            if (map) map.panTo(newPos);
        },
        error: function () {
            console.warn('Грешка при обновяване на позицията.');
        }
    });
}
