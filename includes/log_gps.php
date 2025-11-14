<?php

define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';

// Проверка за сесия
if (empty($_SESSION["user_id"])) {
    http_response_code(403);
    exit("Not authorized");
}
global $db_sod;

$id_person = intval($_SESSION["user_id"]);

// Получаване на данните
$lat       = isset($_POST['lat']) ? floatval($_POST['lat']) : null;
$lng       = isset($_POST['lng']) ? floatval($_POST['lng']) : null;
$accuracy  = isset($_POST['accuracy']) ? floatval($_POST['accuracy']) : -1;
$speed     = isset($_POST['speed']) ? floatval($_POST['speed']) : -1;
$bearing   = isset($_POST['bearing']) ? floatval($_POST['bearing']) : -1;
$altitude  = isset($_POST['altitude']) ? floatval($_POST['altitude']) : -1;

if ($lat === null || $lng === null) {
    logError($db_sod, $id_person, "Missing coordinates");
    exit("Missing coordinates");
}

$geo_data = $lng . ',' . $lat;
$geo_source = "android_webview";

/* ------------------------------
    Вариант В — АНТИ-ДУБЛИРАНЕ
--------------------------------*/

$check = $db_sod->prepare("
    SELECT geo_data
    FROM work_card_geo_log
    WHERE id_person = ?
    ORDER BY id DESC
    LIMIT 1
");
$check->execute([$id_person]);

$last = $check->fetchColumn();

if ($last) {
    list($lastLng, $lastLat) = explode(",", $last);

    $dist = distanceHaversine($lat, $lng, $lastLat, $lastLng);

    // Ако разстоянието е по-малко от 2 метра — не записваме
    if ($dist < 2) {
        echo "SKIP";
        exit;
    }
}

/* ------------------------------
    Запис в базата
--------------------------------*/

$sql = "
    INSERT INTO work_card_geo_log
    (id_person, geo_data, geo_acc, geo_speed, geo_bearing, geo_altitude, geo_source, geo_time, server_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
";

$stmt = $db_sod->prepare($sql);

try {
    $stmt->execute([
        $id_person,
        $geo_data,
        $accuracy,
        $speed,
        $bearing,
        $altitude,
        $geo_source
    ]);

    echo "OK";

} catch (PDOException $e) {
    logError($db_sod, $id_person, $e->getMessage());
    http_response_code(500);
    echo "DB Error";
}

/* ------------------------------------
    Вариант Б — Haversine функция
-------------------------------------*/

function distanceHaversine($lat1, $lon1, $lat2, $lon2) {
    $R = 6371000; // meters
    $dLat = deg2rad($lat2 - $lat1);
    $dLon = deg2rad($lon2 - $lon1);

    $a = sin($dLat/2) * sin($dLat/2) +
        cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
        sin($dLon/2) * sin($dLon/2);

    $c = 2 * atan2(sqrt($a), sqrt(1-$a));
    return $R * $c;
}

/* ------------------------------------
    Вариант Г — Логване на грешки
-------------------------------------*/

function logError($db, $id_person, $message) {
    $sql = "INSERT INTO geo_error_log (id_person, error_message, time) VALUES (?, ?, NOW())";
    $stmt = $db->prepare($sql);
    $stmt->execute([$id_person, $message]);
}
