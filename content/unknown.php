<?php
define('INCLUDE_CHECK', true);

require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

if (!isset($_SESSION['user_id']) || !$_SESSION['user_id']) {
    echo '<div class="alert alert-danger m-3">Нямате достъп.</div>';
    exit;
}

$idUser  = (int) $_SESSION['user_id'];
$citieID = isset($_GET['citieID']) ? (int) $_GET['citieID'] : 0;

global $db_sod;

// ========================================
//   БАЗОВА SQL ЗАЯВКА
// ========================================
$aQuery  = "
    SELECT
        o.id AS oID,
        o.num AS oNum,
        o.name AS oName,
        CONCAT(
            ROUND((
                distanceByGeo(
                    (SELECT SUBSTRING_INDEX(geo_data, ',', 1)
                     FROM work_card_geo_log
                     WHERE id_person = $idUser
                     ORDER BY id DESC LIMIT 1),

                    (SELECT SUBSTRING_INDEX(geo_data, ',', -1)
                     FROM work_card_geo_log
                     WHERE id_person = $idUser
                     ORDER BY id DESC LIMIT 1),

                    o.geo_lat,
                    o.geo_lan
                ) * 1.15
            ), 3),
            ' км.'
        ) AS distance_str
    FROM objects o
    LEFT JOIN visited_objects vo
        ON vo.id_object = o.id
        AND vo.to_arc = 0
        AND vo.id_person = $idUser
    WHERE
        o.id_office = 66
        AND o.id_status <> 4
        AND o.is_sod = 1
        AND vo.id_object IS NULL
";

// Филтър по населено място
if ($citieID > 0) {
    $aQuery .= " AND o.address_city = $citieID ";
}

$aQuery .= " ORDER BY distance_str ASC LIMIT 50";

// ========================================
//   ИЗПЪЛНЕНИЕ НА ЗАЯВКАТА
// ========================================
$aResult = mysqli_query($db_sod, $aQuery);

if (!$aResult) {
    echo '<div class="alert alert-danger m-3">Грешка в заявката: '.mysqli_error($db_sod).'</div>';
    exit;
}

$numRows = mysqli_num_rows($aResult);


// ========================================
//   ФИЛТЪР ПО НАСЕЛЕНО МЯСТО
// ========================================
echo '
<div class="row border-bottom border-secondary-subtle text-white p-2">
    <div class="col">
        <select id="cities" name="cities" class="form-select form-select-sm"
                onchange="get_cities(); return false;">
            <option value="0">-- Филтрирай по населено място --</option>';
            get_cities($citieID);
echo '  </select>
    </div>
</div>
';


// ========================================
//   НЯМА НЕПОЗНАТИ ОБЕКТИ
// ========================================
if ($numRows == 0) {
    echo '
        <div class="alert alert-info mt-3">
            ✔ Няма обекти, които не познавате!
        </div>';
    exit;
}


// ========================================
//   СПИСЪК С НЕПОЗНАТИ ОБЕКТИ
// ========================================
while ($row = mysqli_fetch_assoc($aResult)) {

    $oID   = (int) $row['oID'];
    $oNum  = htmlspecialchars($row['oNum']);
    $oName = htmlspecialchars($row['oName']);
    $oDist = htmlspecialchars($row['distance_str']);
    $modalID = "myModal".$oID;

    // Основен ред
    echo '
    <div class="row border-bottom border-secondary-subtle text-white p-2 align-items-center">

        <div class="col-7">
            <span class="my-2"
                style="cursor:pointer;"
                onclick="$(\'#'.$modalID.'\').appendTo(\'body\');"
                data-bs-toggle="modal"
                data-bs-target="#'.$modalID.'">
                <i class="fa-solid fa-circle-question me-2"></i> '.$oNum.' - '.$oName.'
            </span>
        </div>

        <div class="col-1">'.$oDist.'</div>

        <div class="col text-end">
            <button class="btn btn-sm btn-success mx-1"
                onclick="showConfirmation('.$oID.',\'familiar\'); return false;">
                <i class="fa-solid fa-house-circle-check me-2"></i> Познавам
            </button>

            <button class="btn btn-sm btn-info"
                onclick="loadXMLDoc(\'action.php?action=unknown_details&oID='.$oID.'\', \'main\', \'unknown_details\'); return false;">
                <i class="fa-solid fa-route me-2"></i> Опознай
            </button>
        </div>
    </div>
    ';

    // ======================
    //  MODAL WINDOW
    // ======================
    echo '
    <div class="modal fade" id="'.$modalID.'" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header bg-secondary py-1">
                    <h5 class="modal-title">Обект '.$oNum.'</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
    ';
                    get_object_faces($oID);
    echo '
                </div>
            </div>
        </div>
    </div>
    ';
}

?>
