<?php
define('INCLUDE_CHECK', true);

require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

global $db_sod;

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'msg' => 'Access denied']);
    exit;
}

if (!isset($_POST['oID'], $_POST['offID'], $_POST['cName'])) {
    echo json_encode(['status' => 'error', 'msg' => 'Missing parameters']);
    exit;
}

$oID   = intval($_POST['oID']);
$offID = intval($_POST['offID']);
//$cName = htmlspecialchars(mysqli_real_escape_string($db_sod, $_POST['cName']));

$cName = $_POST['cName'] ?? '';
$cName = trim($cName);
$cName = preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $cName);

$userID = intval($_SESSION['user_id']);

list($maxID, $mTable) = get_max_id_archiv();
$arID = $maxID + 9000000;

$query = "
    INSERT INTO work_card_movement
    (id_office, type, alarm_type, id_archiv_alarm, id_work_card, id_patrul, id_object, alarm_time, send_time, updated_time, obj_name, note)
    VALUES
    ($offID, 'object', 1, '$arID', 1, 1, $oID, NOW(), NOW(), NOW(), '$cName', 'Ръчна аларма от $userID')
";

if (mysqli_query($db_sod, $query)) {
    echo json_encode(['status' => 'success', 'oID' => $oID]);
}
//else {
//    echo json_encode(['status' => 'error', 'msg' => mysqli_error($db_sod)]);
//}
