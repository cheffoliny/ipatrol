<?php
define('INCLUDE_CHECK', true);
require_once 'session_init.php';
require_once 'config.php';

// Проверка за активна сесия
if (empty($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <title>iPatrol Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            overflow: hidden;
        }
        .main-content {
            flex: 1;
            overflow-y: auto;
        }
        /* Custom HTML car marker */
         .car-marker {
             display: flex;
             align-items: center;
             justify-content: center;
             width: 48px;
             height: 48px;
             transform-origin: center center;
             transition: transform 300ms linear;
             pointer-events: none;
         }

        /* Inner arrow / car shape */
        .car-marker .car-shape {
            width: 34px;
            height: 34px;
            display: block;
            transform-origin: center center;
        }

        /* Speed badge (top-left inside marker) */
        .car-marker .speed-badge {
            position: absolute;
            top: -10px;
            left: -10px;
            background: rgba(0,0,0,0.7);
            color: #fff;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            pointer-events: none;
        }

        /* Trail polyline style is set in JS; this is for custom marker drop shadow etc */
        .car-marker .shadow {
            position: absolute;
            width: 48px;
            height: 48px;
            left: 0;
            top: 0;
            filter: blur(3px) opacity(0.25);
        }
    </style>

    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

    <!-- Маршрутизатор (OSRM) -->
    <script src="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css" />

</head>
<body>
<div class="d-flex" style="height: 100vh;">
    <?php include 'partials/sidebar.php'; ?>

    <div id="main-content" class="main-content bg-dark px-2 py-0">
        <div class="alert alert-info text-center my-2">
            <h6>Няма регистрирани аларми, <?= htmlspecialchars($_SESSION['first_name']); ?>!</h6>
        </div>
    </div>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="js/sidebar.js"></script>
    <!--    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCJCSAQPKRrx7XlFccO_EkFqzZ74-EcA8o"></script>-->
<!--    <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCJCSAQPKRrx7XlFccO_EkFqzZ74-EcA8o&libraries=visualization"></script>-->

    <script src="js/alarms.js"></script>
    <script src="js/general.js"></script>
    <script src="js/get_geo_data.js"></script>
</div>
</body>
</html>
