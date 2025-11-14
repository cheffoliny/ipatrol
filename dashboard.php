<?php
define('INCLUDE_CHECK', true);
require_once 'session_init.php';
require_once 'config.php';

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
        body { overflow: hidden; }
        .main-content {
            flex: 1;
            overflow-y: auto;
            background-color: #212529;
            color: #fff;
        }
    </style>
</head>
<body>
<div class="d-flex" style="height: 100vh;">
    <?php include 'partials/sidebar.php'; ?>

    <div class="main-content px-2">
        <h2>Няма регистрирани аларми, <?= htmlspecialchars($_SESSION['first_name']); ?>!</h2>
        <div id="alarmPanel"></div>
    </div>
</div>

<!-- JS библиотеки -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="scripts/sidebar.js"></script>

<!-- Google Maps API (зареждане async + callback) -->
<script
  src="https://maps.googleapis.com/maps/api/js?key=AIzaSyCJCSAQPKRrx7XlFccO_EkFqzZ74-EcA8o&callback=onGoogleMapsLoaded"
  async defer>
</script>

<script>
function onGoogleMapsLoaded() {
    console.log('✅ Google Maps API зареден');
    window.googleMapsLoaded = true;
}
</script>

<!-- Главен JS -->
<script src="js/alarms.js"></script>

</body>
</html>
