<?php
define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    exit('Access denied.');
}

if (!isset($_POST['aID'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'msg' => 'Missing alarm ID']);
    exit;
}

$aID = intval($_POST['aID']);
$user = intval($_SESSION['user_id']);

$query = "
    UPDATE work_card_movement
    SET start_time = NOW(), updated_time = NOW()
    WHERE id = $aID AND start_time = '0000-00-00 00:00:00'
";

if (mysqli_query($db_sod, $query)) {
    echo json_encode(['status' => 'success', 'aID' => $aID]);
} else {
    echo json_encode(['status' => 'error', 'msg' => mysqli_error($db_sod)]);
}
?>
