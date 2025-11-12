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

// === Зареждане на архив при отваряне на модала ===
function loadArchive(oRec, sID, oNum, zTime) {
    $('#archiveContent').html(`<div class="text-center text-muted py-3">
        <i class="fa-solid fa-spinner fa-spin"></i> Зареждане на архив...
    </div>`);

    $.ajax({
        url: 'system/get_object_archiv.php',
        method: 'GET',
        data: { oRec, sID, oNum, zTime },
        success: function (html) {
            $('#archiveContent').html(html);
        },
        error: function () {
            $('#archiveContent').html(`
                <div class="alert alert-danger">
                    <i class="fa-solid fa-triangle-exclamation me-1"></i> Грешка при зареждане на архива.
                </div>
            `);
        }
    });
}

function openArchiveModal(oRec, sID, oNum, zTime) {
    loadArchive(oRec, sID, oNum, zTime);
    const modalEl = document.getElementById('modalArchive');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}