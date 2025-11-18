<?php
define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';

if (empty($_SESSION["user_id"])) {
    http_response_code(403);
    exit;
}

$alarmID = intval($_GET['aid']);
global $db_sod;

/* ===============================
   1) ВЗИМАМЕ СВЕЖИ ДАННИ
================================ */
$q = $db_sod->query("
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

        swkm.ps_name AS psName,
        swkm.po_name AS poName,
        swkm.pr_name AS prName,

        swkm.id AS aID
    FROM work_card_movement_test swkm
    WHERE swkm.id = {$alarmID}
");

$row = $q->fetch_assoc();

$gTime = $row['gTime'];
$oTime = $row['oTime'];
$rTime = $row['rTime'];

/* ===============================
   2) ЛОГИКА ЗА CSS КЛАСОВЕ
================================ */
$strClassStart = ($gTime == '00.00.0000 00:00:00')
    ? 'alarm-button bg-danger'
    : 'bg-secondary';

$strClassEnd = ($oTime == '00.00.0000 00:00:00' && $gTime != '00.00.0000 00:00:00')
    ? 'alarm-button bg-warning text-dark'
    : 'bg-secondary';

$strClassReason = ($oTime != '00.00.0000 00:00:00' && $rTime == '00.00.0000 00:00:00')
    ? 'alarm-button bg-success text-dark'
    : 'bg-secondary';


/* ===============================
   3) ЛОГИКА ЗА HTML АТРИБУТИ НА ДИВОВЕТЕ
      ТЕЗИ СЕ СЛАГАТ ДИРЕКТНО ВЪРХУ <div ... >
================================ */
$strBtnStart = ($gTime == '00.00.0000 00:00:00')
    ? 'id=\"start_time\" data-status=\"start_time\" data-aid=\"'.$row['aID'].'\"'
    : '';

$strBtnEnd = ($oTime == '00.00.0000 00:00:00' && $gTime != '00.00.0000 00:00:00')
    ? 'id=\"end_time\" data-status=\"end_time\" data-aid=\"'.$row['aID'].'\"'
    : '';

$strBtnReason = ($oTime != '00.00.0000 00:00:00' && $rTime == '00.00.0000 00:00:00')
    ? 'id=\"reason_time\" data-status=\"reason_time\" data-aid=\"'.$row['aID'].'\" data-bs-toggle=\"modal\" data-bs-target=\"#modalReason_'.$row['aID'].'\"'
    : '';

/* ===============================
   4) JSON ОТГОВОР ЗА JS
================================ */
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
