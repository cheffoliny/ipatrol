<?php
define('INCLUDE_CHECK', true);

require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || !$_SESSION['user_id']) {
    echo json_encode(['status' => 'error', 'message' => 'Нямате достъп']);
    exit;
}

$idUser  = (int) $_SESSION['user_id'];
$oID     = isset($_POST['oID']) ? (int) $_POST['oID'] : 0;
$tVisit  = isset($_POST['type_visit']) ? $_POST['type_visit'] : '';

if ($oID <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Невалиден обект']);
    exit;
}

add_new_familiar_object($idUser, $oID, $tVisit);

echo json_encode(['status' => 'success']);
