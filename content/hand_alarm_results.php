<?php
define('INCLUDE_CHECK', true);

require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

if (!isset($_SESSION['user_id']) || !$_SESSION['user_id']) {
    echo '<div class="alert alert-danger m-3">Нямате достъп.</div>';
    exit;
}

$idUser = $_SESSION['user_id'];
$num_name = isset($_GET['num_name']) ? trim($_GET['num_name']) : '';

if ($num_name === '') {
    echo '<div class="alert alert-info text-center">Въведете номер за търсене.</div>';
    exit;
}

$num_name = mysqli_real_escape_string($db_sod, $num_name);

/* SQL */
$query = "
    SELECT
        o.id AS oID,
        o.num AS oNum,
        o.id_office AS offID,
        o.name AS oName,
        COALESCE(wcm.id, 0) AS isActivAlarm,
        CONCAT(
            ROUND((distanceByGeo(
                (SELECT SUBSTRING_INDEX(geo_data, ',', 1) FROM work_card_geo_log
                        WHERE id_person = $idUser ORDER BY id DESC LIMIT 1),
                (SELECT SUBSTRING_INDEX(geo_data, ',', -1) FROM work_card_geo_log
                        WHERE id_person = $idUser ORDER BY id DESC LIMIT 1),
                o.geo_lat,
                o.geo_lan
            ) * 1.15), 3),
            ' км.'
        ) AS distance_str
    FROM objects o
    LEFT JOIN work_card_movement wcm ON o.id = wcm.id_object AND (wcm.id_alarm_reasons = 0 AND UNIX_TIMESTAMP(wcm.reason_time) = 0 AND wcm.alarm_time > DATE_ADD(NOW(), INTERVAL -1 HOUR))
    WHERE
         o.id_office = 81 AND o.id_status <> 4 AND o.is_sod = 1 AND o.num  LIKE '%$num_name%'
    ORDER BY o.num ASC
    LIMIT 50
";

$result = mysqli_query($db_sod, $query);

if (!$result || !mysqli_num_rows($result)) {
    echo '<div class="alert alert-danger text-center">Няма обекти отговарящи на търсенето!</div>';
    exit;
}

while ($row = mysqli_fetch_assoc($result)) {

    $oID   = $row['oID'];
    $modalID = "objModal_" . $oID . "_" . uniqid(); // уникален ID
    $oNum  = $row['oNum'];
    $oName = $row['oName'];
    $offID = $row['offID'];
    $oDist = $row['distance_str'];
    $activeAlarm = $row['isActivAlarm'];
    $cName = $oNum . ' - ' . $oName;

    ?>

    <!-- Ред -->
    <div class="row border-bottom border-secondary-subtle text-white p-2 align-items-center">
        <div class="col-7">
            <span class="my-2"
                  onclick="$('#<?php echo $modalID; ?>').appendTo('body');"
                  data-bs-toggle="modal"
                  data-bs-target="#<?php echo $modalID; ?>">
                <i class="fa-solid fa-circle-plus me-2"></i> <?php echo $cName; ?>
            </span>
        </div>

        <div class="col-2"><?php echo $oDist; ?></div>

        <div class="col text-end">
            <?php
                if($activeAlarm > 0 ) {
                    echo '
                    <button class="btn btn-sm btn-secondary">
                        <i class="fa-solid fa-bell me-1"></i> АКТВНА.A
                    </button>';
                } else {
                    echo '
                    <button class="btn btn-sm btn-info"
                            data-bs-toggle="modal"
                            data-bs-target="#'.$modalID.'">
                        <i class="fa-solid fa-circle-plus me-2"></i> ДОБАВИ
                    </button>';
                }
            ?>
        </div>
    </div>

    <!-- Модален прозорец -->
    <div class="modal fade" id="<?php echo $modalID; ?>" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">

                <div class="modal-header bg-dark py-1">
                    <h1 class="modal-title text-white fs-5">НОВА АЛАРМА</h1>
                    <button type="button" class="btn-close text-white" data-bs-dismiss="modal"></button>
                </div>

                <div class="modal-body bg-dark">
                    <h2 class="text-white fs-5"><?php echo $cName; ?></h2>

                    <button class="btn btn-sm btn-danger float-end"
                            onclick="
                                addNewHandAlarm(
                                    <?php echo $oID; ?>,
                                    <?php echo $offID; ?>,
                                    '<?php echo $cName; ?>',
                                    '<?php echo $modalID; ?>',
                                    this
                                );
                            ">
                        <i class="fa-solid fa-circle-plus me-2"></i> ДОБАВИ
                    </button>

                </div>

            </div>
        </div>
    </div>
    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 99999;">
        <div id="toastMsg" class="toast text-bg-dark" role="alert">
            <div class="d-flex">
                <div class="toast-body"></div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    </div>
<?php
}
?>
