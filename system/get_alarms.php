<?php
require_once "../config.php";

ob_start();

$stm = $pdo->query("SELECT * FROM alarms ORDER BY date_add DESC");
$alarms = $stm->fetchAll(PDO::FETCH_ASSOC);

$hasNewAlarm = false;

foreach ($alarms as $row) {

    if ($row['stop_play'] == 0) {
        $hasNewAlarm = true;
    }

    echo '
        <li class="list-group-item d-flex justify-content-between align-items-center"
            id="alarm-'.$row['aID'].'"
            onclick="selectAlarm('.$row['aID'].', \''.htmlspecialchars($row['oName']).'\')">

            <span>
                <i class="fa-solid fa-bell '.($row['stop_play']==0?'text-danger':'text-secondary').'"></i>
                '.$row['oName'].' — '.$row['date_add'].'
            </span>
        </li>
    ';
}

$html = ob_get_clean();

echo json_encode([
    'html' => $html,
    'hasActiveSound' => $hasNewAlarm
]);
exit;
