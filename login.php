<?php
require_once 'session_init.php';
define('INCLUDE_CHECK', true);
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Невалидна заявка.']);
    exit;
}

$username = trim($_POST['username'] ?? '');
$password = trim($_POST['password'] ?? '');

if ($username === '' || $password === '') {
    echo json_encode(['status' => 'error', 'message' => 'Попълнете всички полета.']);
    exit;
}

$md5pass = md5($password);
$query = "
    SELECT p.id AS id, sa.id AS sID, sa.username AS usr,
           p.fname AS first_name, p.lname AS last_name, sa.has_debug AS admin
    FROM intelli_system.access_account sa
    LEFT JOIN personnel.personnel p ON p.id = sa.id_person
    WHERE sa.to_arc = 0 AND p.status = 'active'
      AND sa.username = ? AND sa.password = ?
";

$stmt = $db_system->prepare($query);
$stmt->bind_param('ss', $username, $md5pass);
$stmt->execute();
$result = $stmt->get_result();

if ($user = $result->fetch_assoc()) {
    $_SESSION['user_id']    = $user['id'];
    $_SESSION['username']   = $user['usr'];
    $_SESSION['first_name'] = $user['first_name'];
    $_SESSION['last_name']  = $user['last_name'];
    $_SESSION['is_admin']   = $user['admin'];
    $_SESSION['login_time'] = time();

    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Грешно потребителско име или парола.']);
}
exit;
