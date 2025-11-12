<?php
define('INCLUDE_CHECK', true);
require_once 'session_init.php';
require_once 'config.php';

// Ако е вече логнат
if (isset($_SESSION['user_id'])) {
    header('Location: dashboard.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <title>iPatrol Login</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
    <link href="assets/css/style.css" rel="stylesheet">
</head>
<body class="bg-dark text-white">
<div class="container-fluid min-vh-100 d-flex justify-content-center align-items-center">
    <div class="col-12 col-sm-8 col-md-5 col-lg-4 bg-secondary bg-opacity-25 rounded-4 shadow p-4">
        <div class="text-center mb-3">
            <img src="./assets/images/logo.png" alt="iPatrol Logo" class="img-fluid" style="max-height: 80px;">
        </div>

        <form id="loginForm" autocomplete="off">
            <div class="mb-3">
                <label class="form-label fw-semibold"><i class="fa-solid fa-user me-1"></i> Потребителско име</label>
                <input type="text" name="username" class="form-control form-control-lg text-dark" required autofocus>
            </div>
            <div class="mb-3">
                <label class="form-label fw-semibold"><i class="fa-solid fa-lock me-1"></i> Парола</label>
                <input type="password" name="password" class="form-control form-control-lg text-dark" required>
            </div>
            <div class="d-grid">
                <button type="submit" class="btn btn-primary btn-lg fw-bold">
                    <i class="fa-solid fa-right-to-bracket me-1"></i> Вход
                </button>
            </div>
        </form>

        <!-- Alert контейнер -->
        <div id="msg" class="mt-4"></div>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script>
$('#loginForm').on('submit', function(e){
    e.preventDefault();
    $('#msg').html(''); // Изчистваме съобщенията

    $.ajax({
        url: 'login.php',
        method: 'POST',
        data: $(this).serialize(),
        dataType: 'json',
        success: function(res){
            if (res.status === 'success') {
                $('#msg').html(`
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        <i class="fa-solid fa-circle-check me-2"></i> Успешен вход! Пренасочване...
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `);
                setTimeout(() => window.location.href = 'dashboard.php', 800);
            } else {
                $('#msg').html(`
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <i class="fa-solid fa-triangle-exclamation me-2"></i> ${res.message}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `);
            }
        },
        error: function(){
            $('#msg').html(`
                <div class="alert alert-warning alert-dismissible fade show" role="alert">
                    <i class="fa-solid fa-exclamation-circle me-2"></i> Възникна грешка при връзка със сървъра.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `);
        }
    });
});
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
