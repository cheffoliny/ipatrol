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
        if (typeof IntelliSOD !== 'undefined' && typeof IntelliSOD.playSound === 'function') {
            IntelliSOD.playSound(state);
        } else if (typeof playSound === 'function') {
            playSound(state);
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




// === Google Maps секция ===
let map;
let objectMarker;
let carMarker;
let updateInterval;

// 🗺️ Функция за отваряне на картата в #archiveSection
function openMapSection(oLat, oLan, idUser) {
alert(oLat + ' / ' + oLan + ' / ' + idUser)
    const section = document.getElementById('archiveSection');
    section.style.display = 'block';
    section.innerHTML = `
        <div class="text-center py-3 text-muted">
            <i class="fa-solid fa-spinner fa-spin"></i> Зареждане на картата...
        </div>
    `;

    // Изчакваме да се зареди Google Maps
    if (window.googleMapsLoaded) {
        initMap(oLat, oLan, idUser);
    } else {
        console.log('⏳ Изчакваме Google Maps API...');
        const checkInterval = setInterval(() => {
            if (window.googleMapsLoaded) {
                clearInterval(checkInterval);
                initMap(oLat, oLan, idUser);
            }
        }, 500);
    }
}

// 🗺️ Инициализация на картата
function initMap(oLat, oLan, idUser) {
    const section = document.getElementById('archiveSection');
    section.innerHTML = `<div id="mapContainer" style="width:100%;height:550px;"></div>`;

    const objectPos = { lat: parseFloat(oLat), lng: parseFloat(oLan) };
    map = new google.maps.Map(document.getElementById('mapContainer'), {
        center: objectPos,
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });

    // 🏠 Маркер за обекта
    objectMarker = new google.maps.Marker({
        position: objectPos,
        map: map,
        title: "Обект",
        icon: { url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" }
    });

    // 🚗 Маркер за автомобила
    carMarker = new google.maps.Marker({
        position: objectPos,
        map: map,
        title: "Екип",
        icon: {
            url: "https://maps.google.com/mapfiles/kml/shapes/cabs.png",
            scaledSize: new google.maps.Size(40, 40)
        }
    });

    // 🔄 Автоматично обновяване на позицията на всеки 10 секунди
    clearInterval(updateInterval);
    updateInterval = setInterval(() => updateCarPosition(idUser), 10000);
    updateCarPosition(idUser);
}

// 🚘 Обновяване на позицията на автомобила
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

// === toggleArchiveSection ===
// Зарежда архивни записи в #archiveSection
function toggleArchiveSection(oRec, sID, oNum, zTime) {
    const section = document.getElementById('archiveSection');
    if (!section) {
        console.error('❌ Липсва елемент #archiveSection');
        return;
    }

    section.innerHTML = `
        <div class="text-center py-3 text-muted">
            <i class="fa-solid fa-spinner fa-spin"></i> Зареждане на архив...
        </div>
    `;

    $.ajax({
        url: 'system/archive_section.php',
        method: 'GET',
        data: {
            oRec: oRec,
            sID: sID,
            oNum: oNum,
            zTime: zTime
        },
        success: function (html) {
            section.innerHTML = html;
        },
        error: function () {
            section.innerHTML = `
                <div class="alert alert-danger m-3">
                    ⚠️ Грешка при зареждане на архивните данни.
                </div>
            `;
        }
    });
}