<?php

$lifetime = 10 * 365 * 24 * 60 * 60; // 10 years

// Must be set before session_start()
ini_set('session.gc_maxlifetime', $lifetime);
ini_set('session.cookie_lifetime', $lifetime);

// Start the session
session_start();

// Example usage
$_SESSION['user'] = 'John Doe';
echo "Session set. It will last for 10 years unless manually destroyed.";
?>


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
