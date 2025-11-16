<?php
define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

if (!$_SESSION['user_id']) {
    http_response_code(403);
    exit('Access denied.');
}

// ------------------------------------------------------
// Вземаме всички активни аларми
// ------------------------------------------------------
$aQuery = "
    SELECT
        swkm.id AS aID,
        swkm.obj_name AS oName,
        o.address AS oAddr,
        o.operativ_info AS oInfo,
        DATE_FORMAT(swkm.alarm_time, '%H:%i:%s') AS aTime,
        DATE_FORMAT(swkm.send_time, '%d.%m.%Y %H:%i:%s') AS sTime,
        DATE_FORMAT(swkm.start_time, '%d.%m.%Y %H:%i:%s') AS gTime,
        DATE_FORMAT(swkm.end_time, '%d.%m.%Y %H:%i:%s') AS oTime,
        DATE_FORMAT(swkm.reason_time, '%d.%m.%Y %H:%i:%s') AS rTime,
        swkm.start_time AS rawGTime
    FROM work_card_movement_test swkm
    LEFT JOIN objects o ON o.id = swkm.id_object
    WHERE
        swkm.send_time != '0000-00-00 00:00:00' AND
        (
            swkm.start_time = '0000-00-00 00:00:00' OR
            swkm.end_time = '0000-00-00 00:00:00' OR
            swkm.reason_time = '0000-00-00 00:00:00'
        )
    ORDER BY swkm.alarm_time DESC
";

$aResult = mysqli_query($db_sod, $aQuery) or die("Error: ".$aQuery);
$num_aRows = mysqli_num_rows($aResult);

$hasNewAlarm = false;

if (!$num_aRows) {
    echo '<li class="list-group-item bg-secondary text-white py-4 px-3 text-center">
            <i class="fa-regular fa-bell"></i> Няма активни аларми
          </li>';
} else {
    while ($aRow = mysqli_fetch_assoc($aResult)) {
        $aID   = $aRow['aID'];
        $oName = htmlspecialchars($aRow['oName']);
        $aTime = $aRow['aTime'];
        $gTime = $aRow['gTime'];
        $rawG  = $aRow['rawGTime'];
        $oAddr = htmlspecialchars($aRow['oAddr']);
        $oInfo = htmlspecialchars($aRow['oInfo']);

        // --- Определяне на цвета ---
        if ($rawG == '0000-00-00 00:00:00') {
            $strClass = 'list-group-item bg-danger text-white alarm-new';
            $hasNewAlarm = true;
        } else {
            $strClass = 'list-group-item bg-info text-white';
        }

        echo "
        <li id='alarm-$aID' class='$strClass'
            onclick='selectAlarm($aID, \"$oName\")'>
            <div class='fw-bold'>$oName</div>
            <div class='mt-1'><i class='fa-solid fa-bell me-1'></i> $aTime</div>
        </li>";
    }
}
//          <div class='small text-white-50'>$oAddr</div>

// --- Ако има нови аларми, изпращаме флаг ---
// if ($hasNewAlarm) {
//     echo "<script>triggerAlarmSound();</script>";
// }
?>