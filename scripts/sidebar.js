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
