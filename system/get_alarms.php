<?php
define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

if (!isset($_SESSION['user_id']) || !$_SESSION['user_id']) {
    http_response_code(403);
    exit(json_encode(['html' => '<li class="list-group-item bg-danger text-white">Access denied.</li>', 'hasActiveSound' => false]));
}

// buffer за HTML
ob_start();
global $db_sod;
// ------------------------------------------------------
// Вземаме всички активни аларми
// ------------------------------------------------------
$aQuery = "
    SELECT
        swkm.id AS aID,
        REPLACE(REPLACE(swkm.obj_name,  '\"', ''), '''', '' ) AS oName,
        REPLACE(REPLACE(o.address,      '\"', ''), '''', '' ) AS oAddr,
        REPLACE(REPLACE(o.operativ_info,'\"', ''), '''', '' ) AS oInfo,
        swkm.stop_play AS stopPlay, 
        DATE_FORMAT(swkm.alarm_time,    '%H:%i:%s'          ) AS aTime,
        DATE_FORMAT(swkm.send_time,     '%d.%m.%Y %H:%i:%s' ) AS sTime,
        DATE_FORMAT(swkm.start_time,    '%d.%m.%Y %H:%i:%s' ) AS gTime,
        DATE_FORMAT(swkm.end_time,      '%d.%m.%Y %H:%i:%s' ) AS oTime,
        DATE_FORMAT(swkm.reason_time,   '%d.%m.%Y %H:%i:%s' ) AS rTime,

        UNIX_TIMESTAMP(COALESCE(swkm.send_time  , 0)) AS sendUnix,        
        UNIX_TIMESTAMP(COALESCE(swkm.start_time , 0)) AS startUnix,
        UNIX_TIMESTAMP(COALESCE(swkm.end_time   , 0)) AS endUnix,        
        UNIX_TIMESTAMP(COALESCE(swkm.reason_time, 0)) AS reasonUnix,

        swkm.start_time AS rawGTime
    FROM work_card_movement swkm
    LEFT JOIN objects o ON o.id = swkm.id_object
    WHERE
        UNIX_TIMESTAMP(swkm.send_time) > 0 AND
        (
            UNIX_TIMESTAMP(COALESCE(swkm.start_time,    0)) = 0 OR
            UNIX_TIMESTAMP(COALESCE(swkm.end_time,      0)) = 0 OR
            UNIX_TIMESTAMP(COALESCE(swkm.reason_time,   0)) = 0
        )
    ORDER BY swkm.alarm_time DESC
";

$aResult = mysqli_query($db_sod, $aQuery) or die("Error: ".$aQuery);
$num_aRows = mysqli_num_rows($aResult);

$hasActiveAlarmSound = false; // true ако има поне една със stop_play = 0

if (!$num_aRows) {
    echo '<a id="alarm-0" class="list-group-item bg-secondary text-white py-4 px-3 text-center" href="dashboard.php">
            <i class="fa-regular fa-bell"></i> Няма активни аларми
          </a>';
} else {
    while ($aRow = mysqli_fetch_assoc($aResult)) {
        $aID   = $aRow['aID'];

        $oName = htmlspecialchars($aRow['oName'], ENT_QUOTES);
        $oAddr = htmlspecialchars($aRow['oAddr'], ENT_QUOTES);
        $oInfo = htmlspecialchars($aRow['oInfo'], ENT_QUOTES);

        $aTime = $aRow['aTime'];
        $gTime = $aRow['gTime'];
        $rawG  = $aRow['rawGTime'];

        $startUnix  = $aRow['startUnix' ];
        $endUnix    = $aRow['endUnix'   ];
        $reasonUnix = $aRow['reasonUnix'];

        $stopPlay = intval($aRow['stopPlay']);

        // --- Определяне на цвета/indicator ---
        // Класовете остават за UI, но решението за play/stop идва от $stopPlay
        if ($stopPlay === 0) {
            $strClass = 'list-group-item bg-danger text-white alarm-new border border-2 border-opacity-0 mt-0 mb-1 mx-1';
            $strBell = ' fa-shake ';
            $hasActiveAlarmSound = true;
        } else if( $startUnix == 0 ) {
            $strClass = 'list-group-item bg-danger text-white border border-light border-2 border-opacity-50 mt-0 mb-1 mx-1';
            $strBell = '';
        } else if( $startUnix > 0 && $endUnix == 0 ) {
            $strClass = 'list-group-item bg-warning text-bg-warning border border-light border-2 border-opacity-50 mt-0 mb-1 mx-1';
            $strBell = '';
        } else if( $endUnix > 0 && $reasonUnix == 0 ) {
            $strClass = 'list-group-item bg-success text-white border border-light border-2 border-opacity-5 mt-0 mb-1 mx-1';
            $strBell = '';
        } else {
            $strClass = 'list-group-item bg-dark text-white mt-0 mb-1 mx-1';
            $strBell = '';
        }

        echo "
        <li id='alarm-$aID' class='$strClass'
            onclick='selectAlarm($aID, \"{$oName}\")' style='cursor:pointer;'>
            <div class='fw-bold'>$oName</div>
            <div class='mt-1'><i class='fa-solid fa-bell me-1 $strBell'></i> $aTime</div>
        </li>";
    }
}

// взимаме HTML
$html = ob_get_clean();

// върнем JSON отговор
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'html' => $html,
    'hasActiveSound' => $hasActiveAlarmSound
], JSON_UNESCAPED_UNICODE);
exit;
