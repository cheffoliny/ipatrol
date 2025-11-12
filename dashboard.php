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
    </style>
</head>
<body>
<div class="d-flex" style="height: 100vh;">
    <?php include 'partials/sidebar.php'; ?>

    <div class="main-content bg-dark p-1">
        <h2>Няма регистрирани аларми, <?= htmlspecialchars($_SESSION['first_name']); ?>!</h2>
    </div>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="scripts/sidebar.js"></script>
    <script src="js/alarms.js"></script>

</div>
</body>
</html>
