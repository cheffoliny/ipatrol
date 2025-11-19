// // === Проверка на връзката към сървъра ===
function checkConnection() {
    $.ajax({
        url: 'system/connection_check.php',
        method: 'GET',
        dataType: 'json',
        success: function(res) {
            if (res.status === 'online') {
                $('#connStatus').html(`
                    <div class="text-success small">
                        <i class="fa-solid fa-wifi me-1"></i> Онлайн
                    </div>
                `);
            } else {
                $('#connStatus').html(`
                    <div class="text-danger small">
                        <i class="fa-solid fa-wifi-slash me-1"></i> Няма връзка
                    </div>
                `);
            }
        },
        error: function() {
            $('#connStatus').html(`
                <div class="text-danger small">
                    <i class="fa-solid fa-wifi-slash me-1"></i> Няма връзка
                </div>
            `);
        }
    });
}
//
// // === Зареждане на аларми ===
// // Зареждане на аларми с автоматично управление на звука
// function loadAlarms() {
//     $.ajax({
//         url: 'system/get_alarms.php',
//         method: 'GET',
//         success: function(data) {
//             updateAlarms(data);
//         },
//         error: function() {
//             $('#alarmPanel').html(`
//                 <li class="list-group-item bg-danger text-white">
//                     <i class="fa-solid fa-circle-exclamation me-1"></i>
//                     Грешка при зареждане на алармите!
//                 </li>
//             `);
//         }
//     });
// }
//


// === js/sidebar.js ===

// Публична функция: зарежда алармите и обновява звука чрез updateAlarmsFromServer
function loadAlarms() {
    $.ajax({
        url: 'system/get_alarms.php',
        method: 'GET',
        dataType: 'json',
        success: function(res) {
            // res: { html: "...", hasActiveSound: true/false }
            try {
                // подаваме в alarms.js функцията за синхронизация
                if (typeof updateAlarmsFromServer === 'function') {
                    updateAlarmsFromServer(res);
                } else {
                    // fallback: просто сложи HTML
                    $('#alarmPanel').html(res.html);
                }
            } catch (err) {
                console.error('Error processing alarms response', err);
                $('#alarmPanel').html(res.html || '');
            }
        },
        error: function() {
            $('#alarmPanel').html(`
                <li class="list-group-item bg-danger text-white">
                    <i class="fa-solid fa-circle-exclamation me-1"></i>
                    Грешка при зареждане на алармите!
                </li>
            `);
        }
    });
}

// Автоматичен периодичен refresh (примерно на 5 сек — адаптирай според нуждите)
let alarmsInterval = null;
$(document).ready(function() {
    loadAlarms();
    // стартираме автоматично обновяване
    alarmsInterval = setInterval(loadAlarms, 5000);
});

// --- selectAlarm(aID, oName) ---
// Предполагаме че функцията е глобално използвана в <li onclick='selectAlarm(...)'>
function selectAlarm(aID, oName) {
    // Визуално маркираме избраната аларма
    $('#alarmPanel li').removeClass('active');
    $('#alarm-' + aID).addClass('active');

    // Първо: изпращаме update (stop_play = 1)
    $.post('system/update_alarm.php', { aID: aID }, function(res) {
        // очакваме JSON { status: 'success' }
        // След ъпдейта презареждаме алармите (и sound логиката ще се синхронизира)
        loadAlarms();
    }, 'json').fail(function() {
        console.warn('Неуспешен update на alarm (избор).');
        // все пак опитваме да опресним UI
        loadAlarms();
    });

    // Показваме зареждане в main-content и след това зареждаме детайлите
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

$(document).ready(function() {
    checkConnection();
   // loadAlarms();
    setInterval(checkConnection, 3000);
    //setInterval(loadAlarms, 5000);
});