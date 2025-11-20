<?php
define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id']) || !$_SESSION['user_id']) {
    echo json_encode([
        'html' => '<li class="list-group-item bg-danger text-white">Access denied.</li>'
    ]);
    exit;
}

ob_start();
global $db_sod;

// =========================
//   ОТВОРЕНИ ОБЕКТИ
// =========================
$openedObjects = (int) getCountOpenedObjects();
$openedClass = $openedObjects > 0 ? "bg-danger text-white" : "bg-dark text-white";
$badgeClass  = $openedObjects > 0 ? "badge bg-danger rounded-pill" : "badge bg-primary rounded-pill";

echo '
<li
    class="list-group-item d-flex justify-content-between align-items-center p-2 mx-1 '.$openedClass.'"
    onclick="showUnknown()"
    style="cursor:pointer;">
    <i class="fa-solid fa-door-open"></i> ' . date('H:i:s') . '
    <span class="'.$badgeClass.'">'.$openedObjects.'</span>
</li>';


// =========================
//   НЕПОЗНАТИ ОБЕКТИ
// =========================
$unknownObjects = (int) getUnknownObjects();
$badgeUnknown = $unknownObjects > 100 ? "badge bg-warning rounded-pill" : "badge bg-info rounded-pill";

echo '
<li
    class="list-group-item d-flex justify-content-between align-items-center bg-info text-white p-2 mx-1"
    onclick="showUnknown()"
    style="cursor:pointer;">
    <i class="fa-solid fa-circle-question"></i> Непознати
    <span class="'.$badgeUnknown.'">'.$unknownObjects.'</span>
</li>';

$html = ob_get_clean();

echo json_encode(['html' => $html]);
