<?php
define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

if (empty($_SESSION['user_id'])) {
    http_response_code(403);
    exit('Access denied.');
}

$aID = intval($_GET['aID'] ?? 0);
$alarm_status = $_GET['alarm_status'] ?? '';
$alarm_reason = intval($_GET['reasonWithReaction'] ?? 0);
$alarm_reason2 = intval($_GET['reasonNoReaction'] ?? 0);
$idUser = intval($_SESSION['user_id'] ?? 0);
$fragmentOnly = isset($_GET['fragment']) && $_GET['fragment'] == '1';

if ($aID === 0) {
    if ($fragmentOnly) {
        exit('<div class="alert alert-warning">Невалиден идентификатор на аларма.</div>');
    } else {
        exit('<div class="alert alert-warning">Невалиден идентификатор на аларма.</div>');
    }
}

// Когато подаваме статус — правим update, след това връщаме обновения фрагмент
if ($alarm_status !== '') {
    if ($alarm_reason === 0) $alarm_reason = $alarm_reason2;
    // повикаме функцията (тя вече използва глобалния $db_sod)
    update_alarm_status($aID, $alarm_status, $idUser, $alarm_reason);
}

// ===========================
// 🔍 Извличане на информация
// ===========================
global $db_sod;

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
    FROM work_card_movement_test swkm
    LEFT JOIN objects o ON o.id = swkm.id_object
    WHERE swkm.id = ?
");
$stmt->bind_param('i', $aID);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    if ($fragmentOnly) {
        exit('<div class="alert alert-warning">Няма намерена активна аларма. Проверете в архива!</div>');
    } else {
        exit('<div class="alert alert-warning">Няма намерена активна аларма. Проверете в архива!</div>');
    }
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

// ===========================
// ✅ Статуси и HTML атрибути (унифицирани)
// ===========================
$strClassStart = ($gTime == '00.00.0000 00:00:00') ? 'bg-danger' : 'bg-secondary';
$strBtnStart = ($gTime == '00.00.0000 00:00:00') ? 'id="start_time" data-status="start_time" data-aid="'.$aID.'"' : '';

$strClassEnd = ($oTime == '00.00.0000 00:00:00' && $gTime != '00.00.0000 00:00:00') ? 'bg-warning text-dark' : 'bg-secondary';
$strBtnEnd = ($oTime == '00.00.0000 00:00:00' && $gTime != '00.00.0000 00:00:00') ? 'id="end_time" data-status="end_time" data-aid="'.$aID.'"' : '';

$strClassReason = ($oTime != '00.00.0000 00:00:00' && $rTime == '00.00.0000 00:00:00') ? 'bg-success text-dark' : 'bg-secondary';
$strBtnReason = ($oTime != '00.00.0000 00:00:00' && $rTime == '00.00.0000 00:00:00') ? 'data-status="reason_time_confirm" data-aid="'.$aID.'" data-bs-toggle="modal" data-bs-target="#modalReason'.$oID.'"' : '';

//$strSelectReason = ($oTime != '00.00.0000 00:00:00' && $rTime == '00.00.0000 00:00:00') ? '' : 'disabled="disabled"';

$strMapModal = 'modalMap'.$oID;
$strReasonModal = 'modalReason'.$oID;

// ===========================
// 🧱 Подготвяме HTML за статус-блока (този фрагмент ще връщаме при fragment=1)
// ===========================
ob_start();

?>
<div id="alarm-status-container" class="row px-0 mx-0 mb-2" data-aid="<?= $aID ?>">
    <div class="col p-2 my-1 mx-0 text-white alarm-button <?= $strClassStart ?>" style="cursor:pointer; height:96px" <?= $strBtnStart?> >
        <div class="d-flex justify-content-between">
            <h6>ПРИЕМАМ</h6><?= diffBadge($timeToStart) ?>
        </div>
        <small><?= htmlspecialchars($psName) ?></small><br>
        <small>[<?= substr($gTime, 10, 10) ?>]</small>
    </div>

    <div class="col p-2 my-1 mx-1 text-white alarm-button <?= $strClassEnd ?>" style="cursor:pointer; height:96px" <?= $strBtnEnd; ?> >
        <div class="d-flex justify-content-between">
            <h6>НА ОБЕКТА</h6><?= diffBadge($timeToObject) ?>
        </div>
        <small><?= htmlspecialchars($poName) ?></small><br>
        <small>[<?= substr($oTime, 10, 10) ?>]</small>
    </div>

    <div class="col p-2 my-1 mx-0 text-white <?= $strClassReason ?>" <?= $strBtnReason ?> style="cursor:pointer; height:96px">
        <div class="d-flex justify-content-between">
            <h6>ПРИКЛЮЧИ</h6><?= diffBadge($timeToEnd) ?>
        </div>
        <small><?= htmlspecialchars($prName) ?></small><br>
        <small>[<?= substr($rTime, 10, 10) ?>]</small>
    </div>
</div>
<?php
$statusBlockHtml = ob_get_clean();

// Ако искаме само фрагмент — връщаме само status блока и exit
if ($fragmentOnly) {
    echo $statusBlockHtml;
    exit;
}

// ===========================
// Ако не е fragmentOnly → рендерваме пълния card + модали
// ===========================
?>
<div id="alarm-info-container" class="px-0 mx-0 mb-2">
    <?= $statusBlockHtml ?>

    <div class="card bg-dark text-white border-secondary">
        <div class="card-header d-flex justify-content-between align-items-center py-0">
            <b><?= htmlspecialchars($oName) ?></b>
            <div>
                <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#modalObject">
                    <i class="fa-solid fa-phone"></i>
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
                <button class="btn btn-sm btn-outline-light py-0 px-2" onclick="manualRefreshArchive()"><i class="far fa-reload"></i></button>
            </div>
            <div id="archiveContent" class="text-center text-muted py-3">
                <i class="fa-solid fa-spinner fa-spin"></i> Зареждане...
            </div>
        </div>
    </div>
</div>

<!-- Модал за ПРИКЛЮЧВАНЕ НА АЛАРМА -->
<div class="modal fade" id="<?= $strReasonModal ?>" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header border-secondary">
                <h6 class="modal-title">ПРИЧИНА</h6>
                <button class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-1">
                <div style="height: 96px !important;" class="col p-0 m-1">
                    <div class="d-flex justify-content-between w-100 p-0">
                        <div class="w-50 h-100 py-0 me-2">
                            <select id="reasonWithReaction" onchange="reset_select_reasons()" class="form-select form-select-sm shadow-sm text-white pt-4 py-5 m-0 border border-success bg-success">
                                <option value="0">С РЕАКЦИЯ</option>
                                <?php render_alarm_reasons(1); ?>
                            </select>
                        </div>
                        <div class="w-50 py-0">
                            <select id="reasonNoReaction" onchange="reset_select_reasons()" class="form-select form-select-sm shadow-sm text-white pt-4 pb-5 m-0 border border-danger bg-danger">
                                <option value="0">БЕЗ РЕАКЦИЯ</option>
                                <?php render_alarm_reasons(0); ?>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- БУТОН ПРИКЛЮЧИ (в модала) -->
                <div class="col p-2 m-1 text-white alarm-button bg-success"
                     id="reason_time"
                     data-status="reason_time"
                     data-aid="<?= $aID ?>" style="cursor:pointer; height:96px" >
                    <div class="d-flex justify-content-center">
                        <h6>ПРИКЛЮЧИ</h6>
                    </div>
                </div>

            </div>
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

    <script>
        (function() {

        // 🔹 Глобална функция за взимане на alarmID
        window.getAlarmIDFromDom = function() {
            const wrapper = document.getElementById("alarm-status-container");
            return wrapper ? wrapper.getAttribute("data-aid") : null;
        };

        // 🔹 AUTO REFRESH (5 сек)
        async function refreshAlarmStatus() {
        const alarmID = getAlarmIDFromDom();
        if (!alarmID) return;

        try {
        const resp = await fetch("system/alarms_info.php?aID=" + alarmID + "&fragment=1");
        const html = await resp.text();

        const container = document.getElementById("alarm-status-container");
        const openReasonModal = document.querySelector('.modal.show[id^="modalReason"]');

        if (container && !openReasonModal) {
        container.outerHTML = html;
    }

    } catch (err) {
        console.error("Грешка при авто-обновяване:", err);
    }
    }

        setInterval(refreshAlarmStatus, 5000);


        // ============================================================
        // 🔹 ОБРАБОТКА НА ВСИЧКИ alarm-button (вкл. reason_time)
        // ============================================================
        document.addEventListener('click', async function(ev) {
        const btn = ev.target.closest('.alarm-button');
        if (!btn) return;

        const aID = btn.dataset.aid;
        const status = btn.dataset.status;

        if (!aID || !status) return;


        // ============================================
        //   🔸 Специален случай: ПРИКЛЮЧВАНЕ С ПРИЧИНА
        // ============================================
        if (status === "reason_time") {

        const selWith = document.getElementById("reasonWithReaction");
        const selNo   = document.getElementById("reasonNoReaction");

        const vWith = selWith ? parseInt(selWith.value) : 0;
        const vNo   = selNo ? parseInt(selNo.value) : 0;

        // ❗ ВАЛИДАЦИЯ
        if (vWith === 0 && vNo === 0) {
        alert("Изберете причина (С реакция или Без реакция)!");
        return;
    }

        const alarm_reason = (vWith > 0 ? vWith : vNo);

        btn.style.opacity = "0.6";

        try {
        const url = "system/alarms_info.php?aID=" + aID +
        "&alarm_status=reason_time" +
        "&alarm_reason=" + alarm_reason +
        "&fragment=1";

        const resp = await fetch(url);
        const html = await resp.text();

        // затваряме modalReason*
        document.querySelectorAll('[id^="modalReason"]').forEach(mEl => {
        const modal = bootstrap.Modal.getInstance(mEl) ||
        bootstrap.Modal.getOrCreateInstance(mEl);
        modal.hide();
    });

        // обновяваме блока
        const container = document.getElementById("alarm-status-container");
        if (container) container.outerHTML = html;

    } catch (err) {
        console.error("Грешка при reason_time:", err);
    } finally {
        btn.style.opacity = "1";
    }

        return; // ❗ спираме, защото това е специален режим
    }


        // ============================================================
        // 🔹 Стандартни статуси (start_time, end_time, etc.)
        // ============================================================
        if (status === 'reason_time_confirm' && btn.getAttribute('data-bs-toggle') === 'modal') {
        return; // остава да отвори модала
    }

        btn.style.opacity = "0.6";

        try {
        const resp = await fetch(
        "system/alarms_info.php?aID=" + aID +
        "&alarm_status=" + encodeURIComponent(status) +
        "&fragment=1"
        );

        const html = await resp.text();

        const container = document.getElementById("alarm-status-container");
        if (container) container.outerHTML = html;

    } catch (err) {
        console.error("Грешка при запис на статус:", err);
    } finally {
        setTimeout(() => btn.style.opacity = "1", 200);
    }

    }); // end click listener


    })();  // end IIFE



        // 🔹 Select-синхронизация (запазваме твоята функция)
        function reset_select_reasons() {

        const selWith = document.getElementById("reasonWithReaction");
        const selNo   = document.getElementById("reasonNoReaction");

        selWith.addEventListener("change", function () {
        if (this.value !== "0") selNo.value = "0";
    });

        selNo.addEventListener("change", function () {
        if (this.value !== "0") selWith.value = "0";
    });
    }
</script>