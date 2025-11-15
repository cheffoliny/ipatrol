<?php

define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

if (!$_SESSION['user_id']) {
    http_response_code(403);
    exit('Access denied.');
}

$aID = intval($_GET['aID'] ?? 0);
$alarm_status = $_GET['alarm_status'] ?? '';
$alarm_reason = intval($_GET['alarm_reason'] ?? 0);
$alarm_reason2 = intval($_GET['alarm_reason2'] ?? 0);
$idUser = intval($_SESSION['user_id'] ?? 0);

if ($aID === 0) {
    exit('<div class="alert alert-warning">Невалиден идентификатор на аларма.</div>');
}

// 🔄 Обновяване на статус при нужда
if ($alarm_status !== '') {
    if ($alarm_reason === 0) $alarm_reason = $alarm_reason2;
    update_alarm_status($aID, $alarm_status, $idUser, $alarm_reason);
}

// ===========================
// 🔍 Извличане на информация
// ===========================
$stmt = $db_sod->prepare("
    SELECT
        DATE_FORMAT(swkm.alarm_time, '%d.%m.%Y %H:%i:%s') AS aTime,
        DATE_FORMAT(swkm.send_time, '%d.%m.%Y %H:%i:%s') AS sTime,
        DATE_FORMAT(swkm.start_time, '%d.%m.%Y %H:%i:%s') AS gTime,
        DATE_FORMAT(swkm.end_time, '%d.%m.%Y %H:%i:%s') AS oTime,
        DATE_FORMAT(swkm.reason_time, '%d.%m.%Y %H:%i:%s') AS rTime,
        IF(swkm.start_time != '0000-00-00 00:00:00', TIME_FORMAT(TIMEDIFF(swkm.start_time, swkm.send_time), '%H%i%s'), 0) AS timeToStart,
        IF(swkm.end_time   != '0000-00-00 00:00:00', TIME_FORMAT(TIMEDIFF(swkm.end_time, swkm.send_time), '%H%i%s'), 0) AS timeToObject,
        IF(swkm.reason_time!= '0000-00-00 00:00:00', TIME_FORMAT(TIMEDIFF(swkm.reason_time, swkm.send_time), '%H%i%s'), 0) AS timeToEnd,
        swkm.start_user AS gUser,
        swkm.end_user AS oUser,
        swkm.reason_user AS rUser,
        swkm.alarm_time AS zTime,
        swkm.id AS aID,
        swkm.obj_name AS oName,
        swkm.id_archiv_alarm AS sID,
        o.id AS oID, o.id_receivers AS oRec,
        o.num AS oNum,
        o.geo_lat AS oLat, o.geo_lan AS oLan,
        o.address AS oAddr, o.place AS oPlace, o.operativ_info AS oInfo
    FROM work_card_movement swkm
    LEFT JOIN objects o ON o.id = swkm.id_object
    WHERE swkm.id = ?
");
$stmt->bind_param('i', $aID);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    exit('<div class="alert alert-warning">Няма намерена активна аларма. Проверете в архива!</div>');
}

$aRow = $result->fetch_assoc();
extract($aRow, EXTR_OVERWRITE);

// ===========================
// 👤 Извличане на имена
// ===========================
$psName = $gUser ? getPersonNameByID($gUser) : '—';
$poName = $oUser ? getPersonNameByID($oUser) : '—';
$prName = $rUser ? getPersonNameByID($rUser) : '—';

// ===========================
// ⚙️ Помощни функции
// ===========================
function diffBadge($timeDiff)
{
    if (!$timeDiff || $timeDiff == '0') return '';
    $h = (substr($timeDiff, 0, 2) != '00') ? substr($timeDiff, 0, 2) . ":" : "";
    $m = substr($timeDiff, 2, 2) . ":";
    $s = substr($timeDiff, 4, 2);
    $color = (intval(substr($timeDiff, 2, 2)) > 5) ? 'bg-danger' : 'bg-success';
    return "<span class='badge float-end $color'>{$h}{$m}{$s}</span>";
}

$strMapModal = 'modalMap'.$oID;

// ===========================
// 🧱 HTML изход
// ===========================
?>
<div class="row mb-2">
    <div class="col p-2 m-1 text-white <?= ($gTime == '00.00.0000 00:00:00') ? 'bg-danger' : 'bg-secondary'; ?>">
        <div class="d-flex justify-content-between">
            <h6>ПРИЕМАМ</h6><?= diffBadge($timeToStart) ?>
        </div>
        <small><?= htmlspecialchars($psName) ?></small><br>
        <small>[<?= substr($gTime, 10, 10) ?>]</small>
    </div>

    <div class="col p-2 m-1 text-white <?= ($oTime == '00.00.0000 00:00:00' && $gTime != '00.00.0000 00:00:00') ? 'bg-warning text-dark' : 'bg-secondary'; ?>">
        <div class="d-flex justify-content-between">
            <h6>НА ОБЕКТА</h6><?= diffBadge($timeToObject) ?>
        </div>
        <small><?= htmlspecialchars($poName) ?></small><br>
        <small>[<?= substr($oTime, 10, 10) ?>]</small>
    </div>

    <div class="mb-3">
        <label class="form-label fw-bold">Сигнали – патрул</label>
        <select class="form-select form-select-sm border-primary shadow-sm">
            <?php get_alarm_reasons(); ?>
        </select>
    </div>

    <div class="mb-3">
        <label class="form-label fw-bold">Сигнали – други</label>
        <select class="form-select form-select-sm border-secondary shadow-sm">
            <?php get_alarm_reasons2(); ?>
        </select>
    </div>

    <div class="col p-2 m-1 text-white <?= ($rTime != '00.00.0000 00:00:00') ? 'bg-success' : 'bg-secondary'; ?>">
        <div class="d-flex justify-content-between">
            <h6>ПРИКЛЮЧИ</h6><?= diffBadge($timeToEnd) ?>
        </div>
        <small><?= htmlspecialchars($prName) ?></small><br>
        <small>[<?= substr($rTime, 10, 10) ?>]</small>
    </div>
</div>

<div class="card bg-dark text-white border-secondary">
    <div class="card-header d-flex justify-content-between align-items-center">
        <b><?= htmlspecialchars($oNum).' - '.htmlspecialchars($oName) ?></b>
        <div>
            <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#modalObject">
                <i class="fa-solid fa-house"></i>
            </button>

            <!-- 🗺️ Бутон за карта -->
            <button class="btn btn-sm btn-success"
                    onclick="openMapModal('<?= $strMapModal ?>', <?= $oLat ?>, <?= $oLan ?>, <?= $idUser ?>)">
                <i class="fa-solid fa-car"></i>
            </button>

            <button class="btn btn-sm btn-primary"
                    onclick="toggleArchiveSection(<?= $oRec ?>, <?= $sID ?>, <?= $oNum ?>, '<?= $zTime ?>')">
                <i class="fa-solid fa-book"></i>
            </button>
        </div>
    </div>

    <div class="card-body p-2">
        <p><i class="fa-solid fa-location-dot"></i> <?= htmlspecialchars($oAddr) ?></p>
        <p><?= htmlspecialchars($oPlace) ?></p>
        <div class="border-top border-secondary mt-2 pt-2 small"><?= $oInfo ?></div>
    </div>

    <div id="archiveSection" class="border-top border-secondary bg-secondary bg-opacity-10 p-2 mt-2" style="display:none;">
        <div class="d-flex justify-content-between align-items-center mb-1">
            <small class="text-info">
                <i class="fa-solid fa-circle fa-xs me-1 text-success" id="archiveStatusIcon"></i>
                <span id="archiveStatusText">Зареждане...</span>
            </small>
            <button class="btn btn-sm btn-outline-light py-0 px-2" onclick="manualRefreshArchive()">⟳</button>
        </div>
        <div id="archiveContent" class="text-center text-muted py-3">
            <i class="fa-solid fa-spinner fa-spin"></i> Зареждане...
        </div>
    </div>
</div>

<!-- Модал за обекта -->
<div class="modal fade" id="modalObject" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header border-secondary">
                <h6 class="modal-title">Обект</h6>
                <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-1">
                <?php get_object_faces($oID); ?>
            </div>
        </div>
    </div>
</div>

<!-- 🗺️ Модал за карта -->
<div class="modal fade" id="<?= $strMapModal ?>" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content bg-dark text-white">
         <!--   <div class="modal-header border-secondary">
                <h6 class="modal-title"><i class="fa-solid fa-map-location-dot"></i> Локация на обект и екип</h6>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>-->
            <div class="modal-body p-0">
                <div id="mapContainer_<?= $oID ?>" style="width:100%;height:500px;"></div>
            </div>
        </div>
    </div>
</div>
