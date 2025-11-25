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

    $oID	        = isset( $_GET['oID'  	] ) ? $_GET['oID'    ] : 0 ;
    $oConfirmed     = isset( $_GET['confirm'] ) ? $_GET['confirm'] : '' ;
    $tVisit         = isset( $_GET['type_visit'] ) ? $_GET['type_visit'] : '' ;

    if( $oConfirmed == 'yes' ) {
        add_new_familiar_object( $idUser, $oID, $tVisit );
        echo '<div class="row px-4 mx-2 alert alert-success text-center" role="alert">
                    <b> Обекта е добавен в опознати! </b>
                </div>';

    }



// ========================================
//   БАЗОВА SQL ЗАЯВКА
// ========================================
$aQuery  = "
    SELECT
        o.id AS oID,
        o.num AS oNum,
        o.name AS oName,
        o.geo_lat AS oLat, o.geo_lan AS oLan,
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
            ), 1),
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

$aQuery .= " ORDER BY distance_str+0 ASC LIMIT 50";

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
        <select id="cities" name="cities" class="form-select form-select-sm">
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
    $oLan  = $row['oLan'];
    $oLat  = $row['oLat'];
    $oNum  = htmlspecialchars($row['oNum']);
    $oName = htmlspecialchars($row['oName']);
    $oDist = htmlspecialchars($row['distance_str']);
    $modalID = "myModal".$oID;
    $strMapModal = 'modalMap'.$oID;
    $confirmFamiliarModal = "confirmFamiliarModal".$oID;

    // Основен ред
echo '
    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 99999;">
        <div id="toastMsg" class="toast text-bg-dark" role="alert">
            <div class="d-flex">
                <div class="toast-body"></div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    </div>
     <div class="row border-bottom border-secondary-subtle text-white p-2 align-items-center object-row-'.$oID.'">

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
            <button class="btn btn-sm btn-success mx-1 btn-familiar"
                    data-oid="'.$oID.'" data-type="familiar">
                <i class="fa-solid fa-circle-check mx-1mx"></i> Познавам
            </button>

            <!-- 🗺️ Бутон за карта -->
            <button class="btn btn-sm btn-info"
                    data-oid="'.$oID.'" data-type="familiar"
                    onclick="openMapModal(\''.$strMapModal.'\', \''.$oLat.'\', \''.$oLan.'\', '.$idUser.')">
                <i class="fa-solid fa-car mx-1"></i> Опознай
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
    </div>';
?>

    <div class="modal fade" id="confirmFamiliarModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title">Потвърждение</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body">
            Сигурни ли сте, че познавате този обект?
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отказ</button>
            <button type="button" class="btn btn-success" id="confirmFamiliarYes">Потвърждавам</button>
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
                <button type="button"
                        class="btn btn-success confirm-familiar-btn"
                        data-oid="<?php echo $oID; ?>"
                        data-type="familiar"
                        data-bs-dismiss="modal">
                    <?= $oNum.' - '.$oName ?> - Познавам
                </button>
            </div>
        </div>
    </div>

<?php

}

?>