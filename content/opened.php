<?php
define('INCLUDE_CHECK', true);

require_once '../session_init.php';
require_once '../config.php';
require_once '../includes/functions.php';

if (!isset($_SESSION['user_id']) || !$_SESSION['user_id']) {
    echo '<div class="alert alert-danger m-3">Нямате достъп.</div>';
    exit;
}

    /*********/
    $aQuery	=	"
            SELECT
                    o.id AS 'oID', o.num AS 'oNum', o.name AS 'oName', m.msg_rest AS 'mRest', o.work_time_alert AS 'wTime'
            FROM objects o
            JOIN messages m ON m.id_obj = o.id AND m.to_arc = 0 AND m.flag = 1 AND m.id_cid BETWEEN 400 AND 500
            WHERE
                o.id_status IN( 1, 14 )
                AND CONCAT( DATE_FORMAT(NOW(),'%Y-%m-%d '), o.work_time_alert ) < NOW()
                AND o.work_time_alert != '00:00:00'
            GROUP BY o.id ";

    $aResult	=	mysqli_query( $db_sod,  $aQuery );
    $num_aRows	=	mysqli_num_rows( $aResult		);

    if( !$num_aRows ) {
        echo '<div class="page-header"><h4>Няма отворени обекти след работно време!</h4></div>';
    }

    while( $aRow = mysqli_fetch_assoc( $aResult ) ) {

        $oID	        = isset( $aRow['oID'  ] ) ? $aRow['oID' ] : 0 ;
        $oNum	        = isset( $aRow['oNum' ] ) ? $aRow['oNum' ] : 0 ;
        $oName	        = isset( $aRow['oName'] ) ? $aRow['oName'] : '';
        $mRest	        = isset( $aRow['mRest']) ? $aRow['mRest']: '';
        $wTime	        = isset( $aRow['wTime']) ? $aRow['wTime']: '';

        $strModal = "myModal".$oID;

        echo '<div class="row border-bottom border-secondary-subtle text-white p-2">
                <div class="col-6">
                    <span class="my-2" onclick="$(\'#'.$strModal.'\').appendTo(\'body\');" data-bs-toggle="modal" data-bs-target="#'.$strModal.'">
                        <i class="fa-solid fa-house-circle-exclamation me-2"></i> '.$oNum.' - '. $oName .'
                    </span>
                </div>
                <div class="col-4">'. $mRest .'</div>
                <div class="col text-center bg-danger">'. $wTime .'</div>
              </div>';

        //=============================================
        $strModal = "myModal".$oID;
        echo '
                    <div class="modal fade" id="'.$strModal.'" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
                      <div class="modal-dialog">
                        <div class="modal-content">
                          <div class="modal-header bg-dark py-1">
    //                        <h1 class="modal-title fs-5" id="exampleModalLabel">...</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                          </div>
                          <div class="modal-body bg-dark">';
        get_object_faces( $oID );
        echo '        </div>
                        </div>
                      </div>
                    </div>';

        //=============================================

    }

