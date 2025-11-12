<?php
define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

$oRec = intval($_GET['oRec'] ?? 0);
$sID  = intval($_GET['sID'] ?? 0);
$oNum = intval($_GET['oNum'] ?? 0);
$zTime = $_GET['zTime'] ?? '';
$listSize = intval($_GET['listSize'] ?? 720);
$listLimit = intval($_GET['listLimit'] ?? 20);

if (!$oRec || !$oNum || !$zTime) {
    exit('<div class="alert alert-warning m-1 p-1">Невалидни параметри.</div>');
}

get_object_archiv($oRec, $sID, $oNum, $zTime, $listSize, $listLimit);
