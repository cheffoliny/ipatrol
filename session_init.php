<?php
// --- Сесия 12 часа ---
$lifetime = 12 * 60 * 60;

session_set_cookie_params([
    'lifetime' => $lifetime,
    'path' => '/',
    'secure' => isset($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Lax'
]);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- Автоматично изтичане след 12 часа ---
if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > $lifetime) {
    session_unset();
    session_destroy();
    header('Location: index.php');
    exit;
}
