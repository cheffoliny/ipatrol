<?php

if(!defined('INCLUDE_CHECK')) die('You are not allowed to execute this file directly');
require_once '../session_init.php';
require_once '../config.php';


function checkEmail($str)
{
	return preg_match("/^[\.A-z0-9_\-\+]+[@][A-z0-9_\-]+([.][A-z0-9_\-]+)+[A-z]{1,4}$/", $str);
}


function send_mail($from,$to,$subject,$body)
{
	$headers = '';
	$headers .= "From: $from\n";
	$headers .= "Reply-to: $from\n";
	$headers .= "Return-Path: $from\n";
	$headers .= "Message-ID: <" . md5(uniqid(time())) . "@" . $_SERVER['SERVER_NAME'] . ">\n";
	$headers .= "MIME-Version: 1.0\n";
	$headers .= "Date: " . date('r', time()) . "\n";

	mail($to,$subject,$body,$headers);
}


function get_max_id_archiv () {

        global $db_sod;
        $mTable = "archiv_".date('Ym');

        $aQuery = " SELECT id FROM ".$mTable." WHERE 1 ORDER BY id DESC LIMIT 1";
        $aResult = mysqli_query( $db_sod, $aQuery ) or die( print "ВЪЗНИКНА ГРЕШКА ПРИ ОПИТ ЗА ЗАПИС! ОПИТАЙТЕ ПО–КЪСНО!".$aQuery );

        while( $aRow = mysqli_fetch_assoc( $aResult ) ) {
            $aID	= isset( $aRow['id'] ) ? $aRow['id'] : 0 ;
        }

        return array( $aID , $mTable );

}

function update_geo_data( $person, $geo_data, $geo_acc, $geo_time, $geo_source ) {
    global $db_sod;

    $aQuery  = "INSERT INTO work_card_geo_log ( `id_person`, `geo_time`, `geo_data`, `geo_acc`, `geo_source`, `server_time` ) VALUES ( $person, '{$geo_time}', '{$geo_data}', '{$geo_acc}', '{$geo_source}', NOW() )";
    $aResult = mysqli_query( $db_sod, $aQuery ) or die( print "ВЪЗНИКНА ГРЕШКА ПРИ ОПИТ ЗА ЗАПИС! ОПИТАЙТЕ ПО–КЪСНО!".$aQuery );
}


function update_alert_time( $person )
{
    global $db_sod;

    $aQuery  = "INSERT INTO work_card_person_alert ( id_person, alert_time ) VALUES ( $person, NOW() ) ON DUPLICATE KEY UPDATE alert_time = NOW() ";
    $aResult = mysqli_query( $db_sod, $aQuery ) or die( print "ВЪЗНИКНА ГРЕШКА ПРИ ОПИТ ЗА ЗАПИС! ОПИТАЙТЕ ПО–КЪСНО!".$aQuery );
}

/*
 * Намираме всички събития на обекта възникнали след подадената аларма.
 */


function getCountOpenedObjects()
{
    global $db_sod;

    $aBR = 0;

    $aQuery  = "
                SELECT
                    COUNT(DISTINCT(o.id)) AS 'BR'
                FROM objects o
                JOIN messages m ON m.id_obj = o.id AND m.to_arc = 0 AND m.flag = 1 AND m.id_cid BETWEEN 400 AND 500
                WHERE
                    o.id_status IN( 1, 14 )
                    AND CONCAT( DATE_FORMAT(NOW(),'%Y-%m-%d '), o.work_time_alert ) < NOW()
                    AND o.work_time_alert != '00:00:00'
                GROUP BY o.id_status ";
    $aResult = mysqli_query( $db_sod, $aQuery ) or die( print "ВЪЗНИКНА ГРЕШКА ПРИ ОПИТ ЗА ЗАПИС! ОПИТАЙТЕ ПО–КЪСНО!".$aQuery );

    while( $aRow = mysqli_fetch_assoc( $aResult ) ) {
        $aBR	= isset( $aRow['BR'] ) ? $aRow['BR'] : 0 ;
    }

    return $aBR;
}


function getUnknownObjects() {
    global $db_sod;

    $aBR = 0;

    $aQuery  = "
                SELECT
                (COUNT(DISTINCT o.id) - SUM(IF(vo.id_person = ".$_SESSION['user_id'].", 1, 0))) AS BR
                FROM objects o
                LEFT JOIN visited_objects vo ON vo.id_object = o.id AND vo.to_arc = 0 AND vo.id_person = ".$_SESSION['user_id']."
                WHERE o.id_office = 66 AND o.id_status <> 4 AND o.is_sod = 1 ";
    $aResult = mysqli_query( $db_sod, $aQuery ) or die( print "ВЪЗНИКНА ГРЕШКА ПРИ ОПИТ ЗА ЗАПИС! ОПИТАЙТЕ ПО–КЪСНО!".$aQuery );

    while( $aRow = mysqli_fetch_assoc( $aResult ) ) {
        $aBR	= isset( $aRow['BR'] ) ? $aRow['BR'] : 0 ;
    }

    return $aBR;
}

/*
 * get_object_archiv()
 * Извлича архивни съобщения за конкретен обект около дадено време.
 *
 * @param int    $oRec       - ID на приемника (receiver)
 * @param int    $sID        - ID на текущата аларма (за оцветяване)
 * @param string $oNum       - Номер на обекта
 * @param string $zTime      - Време на алармата (формат: Y-m-d H:i:s)
 * @param int    $ListSize   - Интервал назад (в минути)
 * @param int    $ListLimit  - Максимален брой редове
 *
 * @return string HTML съдържание (или съобщение при грешка)
 */
function get_object_archiv($oRec, $sID, $oNum, $zTime, $ListSize, $ListLimit)
{
    global $db_sod;

    $mTable = "archiv_" . date('Ym');
    $html = "";

    // 🧩 Проверка дали таблицата съществува
    $checkTable = $db_sod->query("SHOW TABLES LIKE '$mTable'");
    if ($checkTable->num_rows === 0) {
        return "<div class='alert alert-warning text-center'>
                    Архивната таблица за този месец (<b>$mTable</b>) не съществува.
                </div>";
    }
///ipatroln.infra-lg.com/system/get_object_archiv.php?oRec=1&sID=2025110343783&oNum=1327&zTime=2025-11-25%2008%3A22%3A33&listSize=720&listLimit=20
    // 🧮 Подготвена заявка
    $query = "
        SELECT
            `id`,
            DATE_FORMAT(`msg_time`, '%H:%i:%s') AS msg_time,
            `num`,
            `msg`,
            `status`,
            `alarm`
        FROM $mTable
        WHERE
            num = ?
            AND id_receiver = ?
            AND (status NOT IN (602, 611) OR (status IN (602, 611) AND alarm = 1))
            AND msg_time > DATE_ADD(?, INTERVAL -? MINUTE)
        ORDER BY id DESC
        LIMIT ?
    ";
    $stmt = $db_sod->prepare($query);
    if (!$stmt) {
        return "<div class='alert alert-danger text-center'>
                    Грешка при подготовката на заявката:<br>" . htmlspecialchars($db_sod->error) . "
                </div>";
    }

    $stmt->bind_param("iisii", $oNum, $oRec, $zTime, $ListSize, $ListLimit);
    $stmt->execute();
    $result = $stmt->get_result();

    // 🔍 Ако няма резултати
    if ($result->num_rows === 0) {
        return "<div class='alert alert-info text-center'>
                    Няма архивни съобщения за последните <b>$ListSize</b> минути.
                </div>";
    }

    // 🧱 Генериране на HTML редовете
    while ($oRow = $result->fetch_assoc()) {

        $mID = intval($oRow['id']);
        $mStatus = intval($oRow['status']);
        $mTime = htmlspecialchars($oRow['msg_time']);
        $msg = htmlspecialchars($oRow['msg']);
        $isAlarm = intval($oRow['alarm']) === 1;

        // 🎨 Динамични класове
        if ($mStatus > 399 && $mStatus < 411 && $isAlarm == 1) {
            $bgClass = 'bg-white text-dark fw-bold';
        } elseif ($mID == $sID) {
            $bgClass = 'bg-danger text-white bg-opacity-75 fw-bold';
        } elseif ($isAlarm) {
            $bgClass = 'bg-warning text-bg-warning bg-opacity-75';
        } else {
            $bgClass = 'bg-dark text-white';
        }

        $html .= '
            <div class="row p-0 pb-1 m-0 border-bottom border-secondary small ' . $bgClass . '">
                <div class="col-3 text-center p-1">' . $mTime . '</div>
                <div class="col text-start p-1">' . $msg . '</div>
            </div>';
    }

    $stmt->close();

    // 📤 Връщаме HTML като низ
    echo '<div class="archiv-list">' . $html . '</div>';
}



function get_object_faces( $oID ) {

    global $db_sod;

    $rows_faces = "";

    $oQuery = "SELECT name, phone, post  FROM faces WHERE id_obj = '".$oID."' AND to_arc = 0 ";
    $oResult= mysqli_query( $db_sod, $oQuery ) OR die( "".$oQuery );

    while( $oRow = mysqli_fetch_assoc( $oResult ) ) {

        $strName	= isset( $oRow['name'   ] ) ? $oRow['name'  ] : '';
        $strPhone	= isset( $oRow['phone'  ] ) ? $oRow['phone' ] : '';
        $strPost	= isset( $oRow['post'   ] ) ? $oRow['post'  ] : '';

        $rows_faces .= '<div class="row p-0 pb-1 m-0 border-bottom border-secondary small">
                            <div class="col text-center text-white px-3 py-2">'. $strName .' ( '.$strPost.' ) - '. $strPhone .'</div>
                        </div>';
    }

    echo $rows_faces;
}

function get_cities($cID) {

    global $db_sod;

    $aQuery  = "SELECT `id`, `name` FROM cities WHERE to_arc = 0 AND id_reaction_office = 66 ORDER BY `name` DESC";
    $aResult = mysqli_query( $db_sod, $aQuery ) or die( print "ВЪЗНИКНА ГРЕШКА! ОПИТАЙТЕ ПО–КЪСНО!" );
    $n_aRows = mysqli_num_rows( $aResult );

    $gSelect = '';

    for ( $m = 0; $m < $n_aRows; $m++ ) {

        $aRow	= mysqli_fetch_assoc( $aResult );
        $rID	= $aRow['id'];
        $rName	= $aRow['name'];
        if($rID == $cID) { $selectedID = 'selected'; }
        else { $selectedID = ''; }
            $gSelect .= "<option value=". $rID ." ".$selectedID."> ".$rName ." </option>";

    }

    echo $gSelect;

}


function add_new_familiar_object( $pID, $oID, $type_visit ) {
    global $db_sod;

    $aQuery  = "INSERT INTO visited_objects ( `id_person`, `id_object`, `id_alarm_patrul`, `type`, `distance_to_object`, `created_time` ) 
VALUES ( ".$pID.", ".$oID.", 0, '".$type_visit."', 
            ROUND(
                distanceByGeo(
                    (SELECT SUBSTRING_INDEX(geo_data, ',', 1) FROM work_card_geo_log WHERE id_person = ".$pID." ORDER BY id DESC LIMIT 1),
                    (SELECT SUBSTRING_INDEX(geo_data, ',', -1) FROM work_card_geo_log WHERE id_person = ".$pID." ORDER BY id DESC LIMIT 1),
                    (SELECT o.geo_lat FROM objects o WHERE o.id = ".$oID."), 
                    (SELECT o1.geo_lan FROM objects o1 WHERE o1.id = ".$oID.")
                ), 3), NOW() )";
   // echo $aQuery;
    $aResult = mysqli_query( $db_sod, $aQuery ) or die( print "ВЪЗНИКНА ГРЕШКА ПРИ ОПИТ ЗА ЗАПИС! ОПИТАЙТЕ ПО–КЪСНО!".$aQuery );
}


if(!defined('INCLUDE_CHECK')) die('You are not allowed to execute this file directly');



function update_alarm_status( $aID, $alarm_status, $idUser, $alarm_reason ) {

	global $db_sod;
//die("aID: ".$aID." / alarm_status:".$alarm_status." / user:".$idUser." / alarm_reason:".$alarm_reason );
	$alarm_status_user = substr_replace( $alarm_status, "_user", -5 );
	$aQuery  = "UPDATE work_card_movement SET ". $alarm_status ." = NOW(), ". $alarm_status_user."=". $idUser .", id_alarm_reasons = '". $alarm_reason ."', updated_user = ". $idUser ." WHERE id = ". $aID ." AND ". $alarm_status_user ." = 0 ";
    $aResult = mysqli_query( $db_sod, $aQuery ) or die( print "<div class='alert alert-danger' role='alert'>ВЪЗНИКНА ГРЕШКА ПРИ ОПИТ ЗА ЗАПИС! ОПИТАЙТЕ ПО–КЪСНО!</div>" );

}


function getPersonNameByID( $pID ) {

    global $db_personnel;

    $aQuery  = "SELECT CONCAT( fname, ' ', lname ) AS pName FROM personnel WHERE id = ". $pID ." ";
    $aResult = mysqli_query( $db_personnel, $aQuery ) or die( print "ГРЕШКА...! ОПИТАЙТЕ ПО–КЪСНО!" );

    while( $aRow = mysqli_fetch_assoc( $aResult ) ) {

        $strName	= isset( $aRow['pName'] ) ? $aRow['pName'] : '';

    }

    return $strName;

}


function render_alarm_reasons($isPatrul)
{
    global $db_sod;

    $isPatrul = (int)$isPatrul;

    $query = "
        SELECT id, name
        FROM alarm_reasons
        WHERE to_arc = 0 AND is_patrul = {$isPatrul}
        ORDER BY id ASC
    ";

    $result = mysqli_query($db_sod, $query);

    if (!$result) {
        echo "<option disabled class='text-danger'>ГРЕШКА! Опитайте по-късно.</option>";
        return;
    }

    while ($row = mysqli_fetch_assoc($result)) {
        $id   = htmlspecialchars($row['id']);
        $name = htmlspecialchars($row['name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        echo "<option value='{$row['id']}'>{$name}</option>";
    }
}
?>