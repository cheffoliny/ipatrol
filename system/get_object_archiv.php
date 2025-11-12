<?php
define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

if (!$_SESSION['user_id']) {
    http_response_code(403);
    exit('Access denied.');
}

$oRec      = intval($_GET['oRec'] ?? 0);
$sID       = intval($_GET['sID'] ?? 0);
$oNum      = intval($_GET['oNum'] ?? 0);
$zTime     = $_GET['zTime'] ?? '';
$ListSize  = 720;
$ListLimit = 20;
//die( $oRec.'-rec / '.  $sID ."-id / ". $oNum ."-num / ". $zTime ."-T / " . $ListSize ."-l / " . $ListLimit ."Limit");

if (!$oRec || !$oNum || !$zTime) {
    exit('<div class="alert alert-warning">Невалидни параметри!</div>');
}

// използваме директно функцията от functions.php
ob_start();
get_object_archiv($oRec, $sID, $oNum, $zTime, $ListSize, $ListLimit);
$output = ob_get_clean();

echo $output ?: '<div class="alert alert-secondary">Няма намерени записи в архива.</div>';
