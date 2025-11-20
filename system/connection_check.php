<?php
header('Content-Type: application/json');

// Настройки за проверка
$server_ip   = '46.47.82.174'; // <-- тук постави IP на твоя сървър
$server_port = 3306;        // <-- промени при нужда (напр. 3306 за MySQL, 443 за HTTPS)
$timeout     = 3;         // секунди

function check_server_connection($ip, $port, $timeout): bool {
    $connection = @fsockopen($ip, $port, $errno, $errstr, $timeout);
    if ($connection) {
        fclose($connection);
        return true;
    }
    return false;
}

if (check_server_connection($server_ip, $server_port, $timeout)) {
    echo json_encode(['status' => 'online']);
} else {
    echo json_encode(['status' => 'offline']);
}
?>