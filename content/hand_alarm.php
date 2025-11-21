<?php
define('INCLUDE_CHECK', true);

require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

if (!isset($_SESSION['user_id']) || !$_SESSION['user_id']) {
    echo '<div class="alert alert-danger m-3">Нямате достъп.</div>';
    exit;
}

?>

<!-- Панел за търсене -->
<div class="row border-bottom border-secondary-subtle text-white py-1">
    <div class="input-group input-group-sm">
        <input type="text"
               id="num_name"
               name="num_name"
               class="form-control p-1"
               placeholder="Търси обект по номер...">

        <button class="btn btn-sm btn-success mx-1" onclick="searchHandAlarm()">
            <i class="fa-solid fa-magnifying-glass"></i> ТЪРСЕНЕ
        </button>
    </div>
</div>

<!-- Контейнер за резултатите -->
<div id="handAlarmResults" class="p-2">
    <div class="alert alert-info text-center mt-2">
        Въведете номер за търсене.
    </div>
</div>
