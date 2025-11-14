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
let carMarker;
let updateInterval;

function openMapModal(oLat, oLan, idUser) {
    const modal = new bootstrap.Modal(document.getElementById('modalMap'));
    modal.show();

    setTimeout(() => {
        initMap(oLat, oLan, idUser);
    }, 400); // Изчакваме малко, за да се визуализира модала преди инициализацията
}

function initMap(oLat, oLan, idUser) {
    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };

    map = new google.maps.Map(document.getElementById('mapContainer'), {
        center: objectPos,
        zoom: 14,
        mapId: "DEMO_MAP_ID",
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    // 🏠 Маркер за обекта
    objectMarker = new google.maps.Marker({
        position: objectPos,
        map: map,
        title: "Обект",
        icon: {
            url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
        }
    });

    // 🚗 Маркер за автомобила
    carMarker = new google.maps.Marker({
        position: objectPos, // първоначално на същото място
        map: map,
        title: "Екип",
        icon: {
            url: "https://maps.google.com/mapfiles/kml/shapes/cabs.png",
            scaledSize: new google.maps.Size(40, 40)
        }
    });

    // 🔄 Обновяване на позицията на автомобила на всеки 10 секунди
    clearInterval(updateInterval);
    updateInterval = setInterval(() => updateCarPosition(idUser), 10000);
    updateCarPosition(idUser);
}

function updateCarPosition(idUser) {
    $.ajax({
        url: 'system/get_geo_position.php',
        method: 'GET',
        data: { idUser },
        success: function(response) {
            if (!response) return;
            try {
                const [lat, lon] = response.trim().split(',').map(parseFloat);
                const newPos = { lat, lng: lon };
                carMarker.setPosition(newPos);
                map.panTo(newPos);
            } catch (e) {
                console.warn('Грешка при обновяване на позицията:', e);
            }
        },
        error: function() {
            console.error('Грешка при извличане на позиция.');
        }
    });
}

// === НОВО: Обновяване на позицията от WebView ===
function updateCarPositionFromWebView(lat, lng) {

    if (!carMarker || !map) {
        console.warn("Map or carMarker not initialized yet.");
        return;
    }

    const newPos = { lat: lat, lng: lng };

    // Местим маркера
    carMarker.setPosition(newPos);

    // Плавно движение на картата
    map.panTo(newPos);
}