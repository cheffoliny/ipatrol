<?php
define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';

// Защита – ако искаш да включиш проверка за логнат потребител
// if (empty($_SESSION["user_id"])) {
//     http_response_code(403);
//     exit;
// }

// ======================================================
// 1) Входен параметър
// ======================================================
$alarmID = isset($_GET['aid']) ? intval($_GET['aid']) : 0;

if ($alarmID <= 0) {
    echo json_encode(["error" => "Invalid alarm ID"]);
    exit;
}

// ======================================================
// 2) Настройки за бази
// ======================================================
global $db_sod;

// Името на базата с персонала – СТРОКО ВАЖНО да е стринг
$personnelDB = "personnel";

// ======================================================
// 3) SQL заявката
// ======================================================
$sql = "
    SELECT
        DATE_FORMAT(swkm.alarm_time,  '%d.%m.%Y %H:%i:%s') AS aTime,
        DATE_FORMAT(swkm.send_time,   '%d.%m.%Y %H:%i:%s') AS sTime,
        DATE_FORMAT(swkm.start_time,  '%d.%m.%Y %H:%i:%s') AS gTime,
        DATE_FORMAT(swkm.end_time,    '%d.%m.%Y %H:%i:%s') AS oTime,
        DATE_FORMAT(swkm.reason_time, '%d.%m.%Y %H:%i:%s') AS rTime,

        IF(swkm.start_time  != '0000-00-00 00:00:00',
            TIME_FORMAT(TIMEDIFF(swkm.start_time,  swkm.send_time), '%H:%i:%s'), 0
        ) AS timeToStart,

        IF(swkm.end_time    != '0000-00-00 00:00:00',
            TIME_FORMAT(TIMEDIFF(swkm.end_time,    swkm.send_time), '%H:%i:%s'), 0
        ) AS timeToObject,

        IF(swkm.reason_time != '0000-00-00 00:00:00',
            TIME_FORMAT(TIMEDIFF(swkm.reason_time, swkm.send_time), '%H:%i:%s'), 0
        ) AS timeToEnd,

        CONCAT(COALESCE(ps.fname, '...'), ' ', COALESCE(ps.lname, '...')) AS psName,
        CONCAT(COALESCE(po.fname, '...'), ' ', COALESCE(po.lname, '...')) AS poName,
        CONCAT(COALESCE(pr.fname, '...'), ' ', COALESCE(pr.lname, '...')) AS prName,

        swkm.id AS aID
    FROM work_card_movement_test swkm
    LEFT JOIN {$personnelDB}.personnel ps ON ps.id = swkm.start_user
    LEFT JOIN {$personnelDB}.personnel po ON po.id = swkm.end_user
    LEFT JOIN {$personnelDB}.personnel pr ON pr.id = swkm.reason_user
    WHERE swkm.id = {$alarmID}
";

// ======================================================
// 4) Изпълнение и проверка за грешки
// ======================================================
$q = $db_sod->query($sql);

if (!$q) {
    echo json_encode(["error" => "SQL Error: " . $db_sod->error]);
    exit;
}

$row = $q->fetch_assoc();

if (!$row) {
    echo json_encode(["error" => "No record found"]);
    exit;
}

// ======================================================
// 5) Генериране на CSS класове
// ======================================================
$gTime = $row['gTime'];
$oTime = $row['oTime'];
$rTime = $row['rTime'];

$strClassStart  = ($gTime == '00.00.0000 00:00:00') ? 'alarm-button bg-danger' : 'bg-secondary';
$strClassEnd    = ($oTime == '00.00.0000 00:00:00' && $gTime != '00.00.0000 00:00:00') ? 'alarm-button bg-warning text-dark' : 'bg-secondary';
$strClassReason = ($oTime != '00.00.0000 00:00:00' && $rTime == '00.00.0000 00:00:00') ? 'alarm-button bg-success text-dark' : 'bg-secondary';

// ======================================================
// 6) HTML атрибути
// ======================================================
$strBtnStart = ($gTime == '00.00.0000 00:00:00')
    ? 'id=\"start_time\" data-status=\"start_time\" data-aid=\"'.$row['aID'].'\"'
    : '';

$strBtnEnd = ($oTime == '00.00.0000 00:00:00' && $gTime != '00.00.0000 00:00:00')
    ? 'id=\"end_time\" data-status=\"end_time\" data-aid=\"'.$row['aID'].'\"'
    : '';

$strBtnReason = ($oTime != '00.00.0000 00:00:00' && $rTime == '00.00.0000 00:00:00')
    ? 'id=\"reason_time_modal\" data-status=\"reason_time_modal\" data-aid=\"'.$row['aID'].'\" data-bs-toggle=\"modal\" data-bs-target=\"#modalReason'.$row['aID'].'\"'
    : '';


// ======================================================
// 7) Финален JSON отговор
// ======================================================
echo json_encode([
    "gTime" => $gTime,
    "oTime" => $oTime,
    "rTime" => $rTime,

    "timeToStart"  => $row["timeToStart"],
    "timeToObject" => $row["timeToObject"],
    "timeToEnd"    => $row["timeToEnd"],

    "strClassStart"  => $strClassStart,
    "strClassEnd"    => $strClassEnd,
    "strClassReason" => $strClassReason,

    "strBtnStart"  => $strBtnStart,
    "strBtnEnd"    => $strBtnEnd,
    "strBtnReason" => $strBtnReason,

    "psName" => $row["psName"],
    "poName" => $row["poName"],
    "prName" => $row["prName"]
]);
