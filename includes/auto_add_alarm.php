<?php

define('INCLUDE_CHECK', true);
require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

// Проверка за сесия
if (empty($_SESSION["user_id"])) {
    http_response_code(403);
    exit("Not authorized");
}

global $db_sod, $db_system;

    $id_person = intval($_SESSION["user_id"]);
	// alarm_time - време на алармата;
    // send_time - време на подаване на алармата;
	// start_time - време на приемане на алармата;
	// end_time - време за пристигане на обекта;
	// reason_time - време за позочване на причина;

    $alarm_to_open_time = 15;

    ob_start();

    list( $maxID, $mTable ) = get_max_id_archiv(); //*** GET LAST ID_ARCHIV in CASE OF EMPTY RESULT FOR ALARMS ***//

    $nQuery	=	"
                SELECT
						a.id        	AS 'aId'  ,
						o.id        	AS 'oId'  ,
						o.id_office 	AS 'offId',
						o.num       	AS 'oNum' ,
						o.name      	AS 'oName',
						a.msg       	AS 'mName',
						MAX(a.msg_time)	AS 'mTime',
						m.id_sig    	AS 'sId'  ,
						COALESCE(
                                (
                                    SELECT wcm.id
                                    FROM work_card_movement wcm
                                    WHERE wcm.reason_time = '0000-00-00 00:00:00' AND wcm.id_object = o.id
                                    ORDER BY wcm.id DESC LIMIT 1
                                ),
                                0
                        ) AS 'isAlarm'

				FROM $mTable a
				LEFT JOIN messages m ON ( m.id = a.id_msg  AND m.to_arc = 0 )
				JOIN signals s ON ( s.id = m.id_sig AND s.play_alarm = 2 )
				JOIN objects o ON ( o.id = m.id_obj AND o.id_status != 4 AND o.is_sod = 1 AND o.service_status = 0 )

				WHERE	1
						AND a.alarm = 1
						AND a.msg_time > DATE_ADD( NOW(), INTERVAL -1 hour )
						AND a.msg_time > o.end_service_status
						AND a.id > ( SELECT last_check_archiv_id FROM intelli_system.system_sod WHERE 1 LIMIT 1 )

				GROUP BY o.id
                HAVING isAlarm = 0
				ORDER BY a.msg_time, a.id DESC";

    $nResult	=	mysqli_query( $db_sod, $nQuery 	) or die( "Error: ".$nQuery );
    $num_aRows	=	mysqli_num_rows( $nResult		);

    while( $nRow = mysqli_fetch_assoc( $nResult ) ) {

        $arID	= isset( $nRow['aId'    ] ) ? $nRow['aId'	 ] : 0;
        $sID	= isset( $nRow['sId'    ] ) ? $nRow['sId'	 ] : 0;
        $isAlarm= isset( $nRow['isAlarm'] ) ? $nRow['isAlarm'] : 0;  // Is there some existing alarm for this object
		$oID	= $nRow['oId'	];
        $offID	= $nRow['offId'	];
        $cName	= $nRow['oNum'	]." - ". $nRow['oName'	] ;
        $mTime	= $nRow['mTime'	];


        // *** INSERT * NEW * ALARM *** //
        $send_time = "0000-00-00 00:00:00";  /* SET send_time = 0 - за ОА и изчакване на снемане */
        if( $sID != '1' && $sID != '12' ) {
            $send_time = date( 'Y-m-d H:i:s' );
        }
        if( $isAlarm == 0 ) {
            $aQuery  = "INSERT INTO work_card_movement ( id_office, type, alarm_type, id_archiv_alarm, id_work_card, id_patrul, id_object, alarm_time, send_time, updated_time, obj_name, note )
                                VALUES ( ".$offID.", 'object', '".$sID."', '".$arID."', 1, 1, ".$oID.", '".$mTime."', '".$send_time."', NOW(), '".$cName."', '".$maxID." ".$sID."' )";
            $aResult = mysqli_query( $db_sod, $aQuery ); // or die( print "ВЪЗНИКНА ГРЕШКА ПРИ ОПИТ ЗА ЗАПИС! ОПИТАЙТЕ ПО–КЪСНО!".$aQuery );
        }

    }

    // *** Update last checked ID archive *** //
    $sQuery	 = "UPDATE system_sod SET last_check_archiv_id = '$maxID'";
    $sResult =	mysqli_query( $db_system, $sQuery ); // OR die( "".$sQuery );
    // *** ****************************** *** //

    /*********/
    $oQuery = "SELECT
                    wcm.updated_time  AS wcmt ,
                    wcm.id	          AS wcmID,
                    TIME_TO_SEC( TIMEDIFF( NOW(), wcm.updated_time ) ) AS 'diff',
                    (
                      SELECT TIME_TO_SEC(TIMEDIFF( MAX( m.time_al), wcm.alarm_time ))
                      FROM messages m
                      WHERE m.id_sig = 9 AND m.id_obj = wcm.id_object AND m.time_al >= wcm.alarm_time
                      AND ( (wcm.alarm_type = 1 AND m.flag = 1) OR ( wcm.alarm_type = 12 AND m.flag = 0 ) )
                    ) AS op
                FROM work_card_movement wcm
                WHERE 1
                        AND wcm.alarm_type  IN(1,12)
                        AND wcm.send_time   = '0000-00-00 00:00:00'
                        AND wcm.reason_time = '0000-00-00 00:00:00' ";

    $oResult= mysqli_query( $db_sod, $oQuery ) OR die( "".$oQuery );
    $num_oRows	= mysqli_num_rows( $oResult  );

    while( $oRow = mysqli_fetch_assoc( $oResult ) ) {

        $wcmID	= isset( $oRow['wcmID'   ] ) ? $oRow['wcmID'] : 0;
        $wcmt	= isset( $oRow['wcmt'    ] ) ? $oRow['wcmt'	] : 0;
        $diff	= isset( $oRow['diff'    ] ) ? $oRow['diff'	] : 0;
        $op		= isset( $oRow['op'		 ] ) ? $oRow['op'	] : 0;

        $str_note = $diff." ".$alarm_to_open_time." ".$op." ".$wcmt;
        if( ( $diff > $alarm_to_open_time && $op == 0 ) || ( $diff > $alarm_to_open_time && $op > $alarm_to_open_time ) ) {
            $sQuery	 = "UPDATE work_card_movement SET send_time = NOW(), note = '".$str_note." ".$maxID."' WHERE id = '".$wcmID."' ";
            $sResult	=	mysqli_query( $db_sod, $sQuery ) OR die( "".$sQuery );
        } else if( $diff > $alarm_to_open_time && ( $op > 0 && $op <= $alarm_to_open_time) ) {
            $sQuery	 = "UPDATE work_card_movement SET reason_time = NOW(), id_alarm_reasons = 7, note = '".$str_note." ".$maxID."' WHERE id = '".$wcmID."' ";
            $sResult	=	mysqli_query( $db_sod, $sQuery ) OR die( "".$sQuery );
        }
    }