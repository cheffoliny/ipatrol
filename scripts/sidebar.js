// // === Проверка на връзката към сървъра ===
// function checkConnection() {
//     $.ajax({
//         url: 'system/connection_check.php',
//         method: 'GET',
//         dataType: 'json',
//         success: function(res) {
//             if (res.status === 'online') {
//                 $('#connStatus').html(`
//                     <div class="text-success small">
//                         <i class="fa-solid fa-wifi me-1"></i> Онлайн
//                     </div>
//                 `);
//             } else {
//                 $('#connStatus').html(`
//                     <div class="text-danger small">
//                         <i class="fa-solid fa-wifi-slash me-1"></i> Няма връзка
//                     </div>
//                 `);
//             }
//         },
//         error: function() {
//             $('#connStatus').html(`
//                 <div class="text-danger small">
//                     <i class="fa-solid fa-wifi-slash me-1"></i> Няма връзка
//                 </div>
//             `);
//         }
//     });
// }
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
// $(document).ready(function() {
//     checkConnection();
//     loadAlarms();
//     setInterval(checkConnection, 3000);
//     setInterval(loadAlarms, 5000);
// });

// === js/sidebar.js ===

// Публична функция: зарежда алармите и обновява звука чрез updateAlarmsFromServer
function loadAlarms() {
    $.ajax({
        url: 'system/get_alarms.php',
        method: 'GET',
        dataType: 'json',
        success: function(res) {

            $('#alarmPanel').html(res.html);

            if (res.hasActiveSound) {
                triggerAlarmSound();
            } else {
                stopAlarmSound();
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
