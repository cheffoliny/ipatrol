// === Проверка на връзката към сървъра ===
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

// === Зареждане на аларми ===
// Зареждане на аларми с автоматично управление на звука
function loadAlarms() {
    $.ajax({
        url: 'system/get_alarms.php',
        method: 'GET',
        success: function(data) {
            updateAlarms(data);
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

$(document).ready(function() {
    checkConnection();
    loadAlarms();
    setInterval(checkConnection, 3000);
    setInterval(loadAlarms, 5000);
});

//function loadAlarms() {
//    $.ajax({
//        url: 'system/get_alarms.php',
//        method: 'GET',
//        success: function(data) {
//            $('#alarmPanel').html(data);
//        },
//        error: function() {
//            $('#alarmPanel').html(`
//                <li class="list-group-item bg-danger text-white">
//                    <i class="fa-solid fa-circle-exclamation me-1"></i>
//                    Грешка при зареждане на алармите!
//                </li>
//            `);
//        }
//    });
//}
//// function loadAlarms() {
////        $('#alarmsList').load('system/get_alarms.php');
//// }
//// === Инициализация ===
//$(document).ready(function() {
//    checkConnection();
//    loadAlarms();
//    setInterval(checkConnection, 3000); // Проверка на връзката на всеки 30 сек.
//    setInterval(loadAlarms, 5000);        // Презареждане на алармите на всеки 5 сек.
//});
